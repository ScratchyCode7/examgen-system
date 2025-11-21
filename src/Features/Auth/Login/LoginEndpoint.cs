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
                CancellationToken ct) =>
        {
            var user = await dbContext.Users.SingleOrDefaultAsync(u => u.Username == request.Username, ct);
            if (user is null)
            {
                return TypedResults.Unauthorized();
            }

            var verification = passwordHasher.VerifyHashedPassword(user, user.Password, request.Password);
            if (verification == PasswordVerificationResult.Failed)
            {
                return TypedResults.Unauthorized();
            }

            var token = tokenService.CreateToken(user);
            var response = new LoginResponse(token.AccessToken, token.ExpiresAt);

            return TypedResults.Ok(response);
        });
    }
}

