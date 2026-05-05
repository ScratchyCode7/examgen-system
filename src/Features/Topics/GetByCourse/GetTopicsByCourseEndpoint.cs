using Databank.Abstract;
using Databank.Database;
using Databank.Features.Topics;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Topics.GetByCourse;

public sealed class GetTopicsByCourseEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/topics/by-course/{courseId}", async Task<IResult> (
                int courseId,
                AppDbContext dbContext,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var topicsQuery = dbContext.Topics
                .AsNoTracking()
                .Include(t => t.Subject)
                .Where(t => t.Subject.CourseId == courseId && t.Subject.IsActive && t.IsActive)
                .OrderBy(t => t.SequenceOrder)
                .ThenBy(t => t.Title);

            var currentUserId = TopicPermissionResolver.GetCurrentUserId(httpContext.User);
            if (!currentUserId.HasValue)
            {
                return TypedResults.Problem("Unable to determine current user.", statusCode: StatusCodes.Status401Unauthorized);
            }

            var topicIds = await topicsQuery.Select(t => t.Id).ToListAsync(ct);
            var accessibleTopicIds = await TopicPermissionResolver.ResolveViewAccessForUserAsync(
                dbContext,
                currentUserId.Value,
                topicIds,
                ct);

            if (accessibleTopicIds.Count == 0)
            {
                return TypedResults.Ok(Array.Empty<TopicResponse>());
            }

            var accessibleTopicIdList = accessibleTopicIds.ToList();
            var topics = await topicsQuery
                .Where(t => accessibleTopicIdList.Contains(t.Id))
                .ToListAsync(ct);

            var permissions = await TopicPermissionResolver.ResolvePermissionsForUserAsync(
                dbContext,
                currentUserId.Value,
                topics.Select(t => t.Id).ToList(),
                ct);

            var response = topics
                .Select(topic =>
                {
                    permissions.TryGetValue(topic.Id, out var perms);
                    return topic.ToResponse(perms.CanEdit, perms.CanDelete);
                })
                .ToList();

            return TypedResults.Ok(response);
        }).RequireAuthorization();
    }
}
