using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.GetById;

public sealed class GetUserEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/users/{userId:guid}", async Task<IResult> (Guid userId, AppDbContext dbContext, CancellationToken ct) =>
        {
            var user = await dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == userId, ct);

            return user is null
                ? TypedResults.NotFound()
                : TypedResults.Ok(user.ToResponse());
        }).RequireAuthorization();
    }
}

