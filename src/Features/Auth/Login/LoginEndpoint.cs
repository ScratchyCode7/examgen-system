using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Auth.Login;

public sealed record LoginRequest(string Username, string Password);
public sealed record LoginResponse(string AccessToken, DateTime ExpiresAt);

public sealed class LoginEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/login", async Task<IResult> (
                LoginRequest request,
                AppDbContext dbContext,
                IPasswordHasher<User> passwordHasher,
                ITokenService tokenService,
                ILoggingService loggingService,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
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
                    $"Invalid credentials. UsernameOrEmail={request.Username}. {BuildLoginContextDetails(httpContext)}");
                return TypedResults.Unauthorized();
            }

            var verification = passwordHasher.VerifyHashedPassword(user, user.Password, request.Password);
            if (verification == PasswordVerificationResult.Failed)
            {
                await loggingService.LogWarningAsync(
                    user.UserId.ToString(),
                    "Auth",
                    "Login Failed",
                    $"Invalid credentials for user '{user.Username}'. {BuildLoginContextDetails(httpContext)}");
                return TypedResults.Unauthorized();
            }

            var token = tokenService.CreateToken(user);
            var response = new LoginResponse(token.AccessToken, token.ExpiresAt);

            await loggingService.LogActivityAsync(
                user.UserId.ToString(),
                "Auth",
                "Login Success",
                $"User '{user.Username}' logged in. {BuildLoginContextDetails(httpContext)}");

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

