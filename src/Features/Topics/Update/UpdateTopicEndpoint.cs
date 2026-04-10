using Databank.Abstract;
using Databank.Database;
using Databank.Features.Topics;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Topics.Update;

public sealed class UpdateTopicEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/topics/{id:int}", async Task<IResult> (
                int id,
                UpdateTopicRequest request,
                AppDbContext dbContext,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var topic = await dbContext.Topics.FirstOrDefaultAsync(t => t.Id == id, ct);

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

            var canEdit = permission.TryGetValue(id, out var perms) && perms.CanEdit;
            if (!canEdit)
            {
                return TypedResults.Problem(
                    "You do not have permission to edit this topic. Request edit permission from the owner.",
                    statusCode: StatusCodes.Status403Forbidden);
            }

            topic.Title = request.Title;
            if (request.Description != null)
            {
                topic.Description = request.Description;
            }
            if (request.SequenceOrder.HasValue)
            {
                topic.SequenceOrder = request.SequenceOrder.Value;
            }
            if (request.AllocatedHours.HasValue)
            {
                topic.AllocatedHours = request.AllocatedHours.Value;
            }
            if (request.IsActive.HasValue)
            {
                topic.IsActive = request.IsActive.Value;
            }
            topic.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(topic.ToResponse());
        }).RequireAuthorization();
    }
}
