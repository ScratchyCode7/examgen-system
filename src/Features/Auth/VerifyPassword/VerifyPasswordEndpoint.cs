using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Auth.VerifyPassword;

public sealed record VerifyPasswordRequest(string Password);

public sealed class VerifyPasswordEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/verify-password", async Task<IResult> (
                VerifyPasswordRequest request,
                ClaimsPrincipal principal,
                AppDbContext dbContext,
                IPasswordHasher<User> passwordHasher,
                CancellationToken ct) =>
        {
            var userIdValue = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                              ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdValue, out var userId))
            {
                return TypedResults.Unauthorized();
            }

            var user = await dbContext.Users.SingleOrDefaultAsync(x => x.UserId == userId, ct);
            if (user is null)
            {
                return TypedResults.Unauthorized();
            }

            var verificationResult = passwordHasher.VerifyHashedPassword(user, user.Password, request.Password);
            if (verificationResult == PasswordVerificationResult.Failed)
            {
                return TypedResults.Unauthorized();
            }

            return TypedResults.Ok(new { valid = true });
        }).RequireAuthorization();
    }
}