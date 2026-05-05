using Databank.Abstract;
using Databank.Database;
using Databank.Features.Topics;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Topics.GetById;

public sealed class GetTopicEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/topics/{id:int}", async Task<IResult> (
                int id,
            AppDbContext dbContext,
            HttpContext httpContext,
                CancellationToken ct) =>
        {
            var topic = await dbContext.Topics
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id, ct);

            if (topic is null)
            {
                return TypedResults.NotFound();
            }

            var currentUserId = TopicPermissionResolver.GetCurrentUserId(httpContext.User);
            if (!currentUserId.HasValue)
            {
                return TypedResults.Problem("Unable to determine current user.", statusCode: StatusCodes.Status401Unauthorized);
            }

            var viewAccess = await TopicPermissionResolver.ResolveViewAccessForUserAsync(
                dbContext,
                currentUserId.Value,
                new[] { topic.Id },
                ct);

            if (!viewAccess.Contains(topic.Id))
            {
                return TypedResults.Problem("You do not have access to this topic.", statusCode: StatusCodes.Status403Forbidden);
            }

            var permissions = await TopicPermissionResolver.ResolvePermissionsForUserAsync(
                dbContext,
                currentUserId.Value,
                new[] { topic.Id },
                ct);

            permissions.TryGetValue(topic.Id, out var perms);
            return TypedResults.Ok(topic.ToResponse(perms.CanEdit, perms.CanDelete));
        }).RequireAuthorization();
    }
}
