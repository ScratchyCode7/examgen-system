using Databank.Abstract;
using Databank.Database;
using Databank.Features.Topics;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Topics.Delete;

public sealed class DeleteTopicEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/topics/{id:int}", async Task<IResult> (
                int id,
                AppDbContext dbContext,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var topic = await dbContext.Topics
                .FirstOrDefaultAsync(t => t.Id == id, ct);

            if (topic is null)
            {
                return TypedResults.NotFound();
            }

            var requesterId = TopicPermissionResolver.GetCurrentUserId(httpContext.User);
            if (!requesterId.HasValue)
            {
                return TypedResults.Problem("Unable to determine the current user.", statusCode: StatusCodes.Status401Unauthorized);
            }

            var permission = await TopicPermissionResolver.ResolvePermissionsForUserAsync(
                dbContext,
                requesterId.Value,
                new[] { id },
                ct);

            var canDelete = permission.TryGetValue(id, out var perms) && perms.CanDelete;
            if (!canDelete)
            {
                return TypedResults.Problem(
                    "You do not have permission to delete this topic. Request delete permission from the owner.",
                    statusCode: StatusCodes.Status403Forbidden);
            }

            dbContext.Topics.Remove(topic);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.NoContent();
        }).RequireAuthorization();
    }
}
