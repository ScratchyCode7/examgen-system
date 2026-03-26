using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Databank.Abstract;
using Databank.Services;

namespace Databank.Features.Auth.Logout;

public sealed class LogoutEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/logout", async Task<IResult> (
                ClaimsPrincipal principal,
                IUserSessionService userSessionService,
                ILoggingService loggingService,
                CancellationToken ct) =>
        {
            if (!TryGetSessionIdentity(principal, out var userId, out var sessionId))
            {
                return TypedResults.Unauthorized();
            }

            await userSessionService.InvalidateSessionAsync(userId, sessionId, ct);
            await loggingService.LogActivityAsync(
                userId.ToString(),
                "Auth",
                "Logout",
                $"Session {sessionId} terminated.");

            return TypedResults.Ok(new { message = "Logged out." });
        }).RequireAuthorization();
    }

    private static bool TryGetSessionIdentity(ClaimsPrincipal principal, out Guid userId, out Guid sessionId)
    {
        userId = Guid.Empty;
        sessionId = Guid.Empty;

        var userIdValue = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                          ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        var sessionValue = principal.FindFirstValue(JwtRegisteredClaimNames.Sid)
                           ?? principal.FindFirstValue("sid");

        return Guid.TryParse(userIdValue, out userId) && Guid.TryParse(sessionValue, out sessionId);
    }
}