using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Auth.Login;

public sealed record LoginRequest(string Username, string Password);
public sealed record LoginResponse(string AccessToken, DateTime ExpiresAt);

public sealed class LoginEndpoint : IEndpoint
{
    private const int MaxFailedAttempts = 5;
    private const int LockoutDurationMinutes = 5;
    private const string PermanentLockMessage = "This account has been temporarly locked due to multiple incorrect login attemps please contact ITS for support.";

    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/login", async Task<IResult> (
                LoginRequest request,
                AppDbContext dbContext,
                IPasswordHasher<User> passwordHasher,
                ITokenService tokenService,
                IUserSessionService userSessionService,
                ILoggingService loggingService,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var contextDetails = BuildLoginContextDetails(httpContext);

            // Support both username and email login
            var user = await dbContext.Users
                .Include(u => u.UserDepartments)
                .SingleOrDefaultAsync(
                    u => u.Username == request.Username || u.Email == request.Username, ct);
            if (user is null)
            {
                await loggingService.LogWarningAsync(
                    null,
                    "Auth",
                    "Login Failed",
                    $"Invalid credentials. UsernameOrEmail={request.Username}. {contextDetails}");
                return TypedResults.Unauthorized();
            }

            if (!user.IsActive)
            {
                await loggingService.LogWarningAsync(
                    user.UserId.ToString(),
                    "Auth",
                    "Login Blocked - Account Locked",
                    $"Locked account login blocked for user '{user.Username}'. {contextDetails}");

                return TypedResults.Problem(
                    detail: PermanentLockMessage,
                    statusCode: StatusCodes.Status423Locked);
            }

            if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow)
            {
                await loggingService.LogWarningAsync(
                    user.UserId.ToString(),
                    "Auth",
                    "Login Locked",
                    $"Account locked until {user.LockoutEnd:O}. {contextDetails}");

                return TypedResults.Problem(
                    detail: $"Too many failed attempts. Account locked until {user.LockoutEnd:O}.",
                    statusCode: StatusCodes.Status423Locked);
            }

            if (user.LockoutEnd.HasValue && user.LockoutEnd.Value <= DateTime.UtcNow)
            {
                user.IsActive = false;
                user.FailedLoginAttempts = 0;
                user.LockoutEnd = null;

                await loggingService.LogWarningAsync(
                    user.UserId.ToString(),
                    "Auth",
                    "Login Blocked - Account Locked",
                    $"User '{user.Username}' reached cooldown expiry and is now admin-unlock required. {contextDetails}");

                await dbContext.SaveChangesAsync(ct);

                return TypedResults.Problem(
                    detail: PermanentLockMessage,
                    statusCode: StatusCodes.Status423Locked);
            }

            var verification = passwordHasher.VerifyHashedPassword(user, user.Password, request.Password);
            if (verification == PasswordVerificationResult.Failed)
            {
                user.FailedLoginAttempts += 1;

                if (user.FailedLoginAttempts >= MaxFailedAttempts)
                {
                    user.LockoutEnd = DateTime.UtcNow.AddMinutes(LockoutDurationMinutes);
                    await loggingService.LogWarningAsync(
                        user.UserId.ToString(),
                        "Auth",
                        "Login Locked",
                        $"Account locked after repeated failed logins. Locked until {user.LockoutEnd:O}. {contextDetails}");

                    // Reset attempts so the counter starts fresh after lock expires
                    user.FailedLoginAttempts = 0;
                    await dbContext.SaveChangesAsync(ct);

                    return TypedResults.Problem(
                        detail: $"Too many failed attempts. Account locked until {user.LockoutEnd:O}.",
                        statusCode: StatusCodes.Status423Locked);
                }

                var attemptsRemaining = MaxFailedAttempts - user.FailedLoginAttempts;
                await loggingService.LogWarningAsync(
                    user.UserId.ToString(),
                    "Auth",
                    "Login Failed",
                    $"Invalid credentials for user '{user.Username}'. Attempts remaining: {attemptsRemaining}. {contextDetails}");

                await dbContext.SaveChangesAsync(ct);
                return TypedResults.Unauthorized();
            }

            if (user.FailedLoginAttempts > 0)
            {
                user.FailedLoginAttempts = 0;
            }

            if (user.LockoutEnd.HasValue)
            {
                user.LockoutEnd = null;
            }

            await dbContext.SaveChangesAsync(ct);

            var sessionId = await userSessionService.StartSessionIfAvailableAsync(user.UserId, terminateExistingSessions: true, ct);
            if (!sessionId.HasValue)
            {
                const string activeSessionMessage = "This account is already logged in on another device.";
                await loggingService.LogWarningAsync(
                    user.UserId.ToString(),
                    "Auth",
                    "Login Blocked - Active Session Exists",
                    $"{activeSessionMessage} {contextDetails}");

                return TypedResults.Conflict(new { message = activeSessionMessage });
            }

            var token = tokenService.CreateToken(user, sessionId.Value);
            var response = new LoginResponse(token.AccessToken, token.ExpiresAt);

            await loggingService.LogActivityAsync(
                user.UserId.ToString(),
                "Auth",
                "Login Success",
                $"User '{user.Username}' logged in. {contextDetails}");

            return TypedResults.Ok(response);
        });
    }

    private static string BuildLoginContextDetails(HttpContext httpContext)
    {
        var userAgent = httpContext.Request.Headers.UserAgent.ToString();
        var browser = DetectBrowser(userAgent);
        var os = DetectOperatingSystem(userAgent);
        var device = DetectDeviceType(userAgent);
        var ipAddress = ResolveClientIp(httpContext);
        var host = httpContext.Request.Host.Value;

        return $"IP={ipAddress}; Host={host}; Device={device}; OS={os}; Browser={browser}; UserAgent={userAgent}";
    }

    private static string ResolveClientIp(HttpContext httpContext)
    {
        var forwardedFor = httpContext.Request.Headers["X-Forwarded-For"].ToString();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            var firstForwarded = forwardedFor.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(firstForwarded))
            {
                return firstForwarded;
            }
        }

        return httpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
    }

    private static string DetectDeviceType(string userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent)) return "Unknown";
        var normalized = userAgent.ToLowerInvariant();

        if (normalized.Contains("tablet") || normalized.Contains("ipad")) return "Tablet";
        if (normalized.Contains("mobile") || normalized.Contains("iphone") || normalized.Contains("android")) return "Mobile";
        return "Desktop";
    }

    private static string DetectOperatingSystem(string userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent)) return "Unknown";
        var normalized = userAgent.ToLowerInvariant();

        if (normalized.Contains("windows")) return "Windows";
        if (normalized.Contains("mac os") || normalized.Contains("macintosh")) return "macOS";
        if (normalized.Contains("android")) return "Android";
        if (normalized.Contains("iphone") || normalized.Contains("ipad") || normalized.Contains("ios")) return "iOS";
        if (normalized.Contains("linux")) return "Linux";
        return "Other";
    }

    private static string DetectBrowser(string userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent)) return "Unknown";
        var normalized = userAgent.ToLowerInvariant();

        if (normalized.Contains("edg/")) return "Edge";
        if (normalized.Contains("opr/") || normalized.Contains("opera")) return "Opera";
        if (normalized.Contains("chrome/") && !normalized.Contains("edg/")) return "Chrome";
        if (normalized.Contains("safari/") && !normalized.Contains("chrome/")) return "Safari";
        if (normalized.Contains("firefox/")) return "Firefox";
        return "Other";
    }
}

