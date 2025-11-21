using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.Delete;

public sealed class DeleteUserEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/users/{userId:guid}", async Task<IResult> (Guid userId, AppDbContext dbContext, CancellationToken ct) =>
        {
            var user = await dbContext.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);

            if (user is null)
            {
                return TypedResults.NotFound();
            }

            dbContext.Users.Remove(user);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.NoContent();
        }).RequireAuthorization("AdminOnly");
    }
}

