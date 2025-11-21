using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.List;

public sealed class GetUsersEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/users", async Task<IResult> (AppDbContext dbContext, CancellationToken ct) =>
        {
            var users = await dbContext.Users
                .AsNoTracking()
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => u.ToResponse())
                .ToListAsync(ct);

            return TypedResults.Ok(users);
        }).RequireAuthorization("AdminOnly");
    }
}

