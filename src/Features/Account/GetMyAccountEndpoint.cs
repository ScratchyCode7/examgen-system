using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Account;

public sealed class GetMyAccountEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/account/me", async Task<IResult> (
                ClaimsPrincipal principal,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var userIdValue = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                              ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdValue, out var userId))
            {
                return TypedResults.Unauthorized();
            }

            var user = await dbContext.Users
                .AsNoTracking()
                .SingleOrDefaultAsync(x => x.UserId == userId, ct);

            if (user is null)
            {
                return TypedResults.Unauthorized();
            }

            return TypedResults.Ok(user.ToAccountProfileResponse());
        }).RequireAuthorization();
    }
}
