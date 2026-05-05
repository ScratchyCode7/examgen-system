using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Databank.Features.Topics;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Topics.List;

public sealed class ListTopicsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/topics", async Task<IResult> (
                int? subjectId,
                string? search,
                bool? isActive,
                int pageNumber = 1,
                int pageSize = 10,
                AppDbContext dbContext = null!,
                HttpContext httpContext = null!,
                CancellationToken ct = default) =>
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var query = dbContext.Topics.AsNoTracking();

            if (subjectId.HasValue)
            {
                query = query.Where(t => t.SubjectId == subjectId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(t => t.Title.Contains(search) || (t.Description != null && t.Description.Contains(search)));
            }

            if (isActive.HasValue)
            {
                query = query.Where(t => t.IsActive == isActive.Value);
            }

            var currentUserId = TopicPermissionResolver.GetCurrentUserId(httpContext.User);
            if (!currentUserId.HasValue)
            {
                return TypedResults.Problem("Unable to determine current user.", statusCode: StatusCodes.Status401Unauthorized);
            }

            var topicIds = await query.Select(t => t.Id).ToListAsync(ct);
            var accessibleTopicIds = await TopicPermissionResolver.ResolveViewAccessForUserAsync(
                dbContext,
                currentUserId.Value,
                topicIds,
                ct);

            if (accessibleTopicIds.Count == 0)
            {
                return TypedResults.Ok(new PagedResponse<TopicResponse>
                {
                    Items = new List<TopicResponse>(),
                    PageNumber = pagination.PageNumber,
                    PageSize = pagination.PageSize,
                    TotalCount = 0
                });
            }

            var accessibleTopicIdList = accessibleTopicIds.ToList();
            query = query.Where(t => accessibleTopicIdList.Contains(t.Id));

            var totalCount = accessibleTopicIdList.Count;

            var topicRows = await query
                .OrderBy(t => t.SubjectId)
                .ThenBy(t => t.SequenceOrder)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .ToListAsync(ct);

            Dictionary<int, (bool CanEdit, bool CanDelete)> permissions = new();
            if (topicRows.Count > 0)
            {
                permissions = await TopicPermissionResolver.ResolvePermissionsForUserAsync(
                    dbContext,
                    currentUserId.Value,
                    topicRows.Select(t => t.Id).ToList(),
                    ct);
            }

            var topics = topicRows
                .Select(t =>
                {
                    permissions.TryGetValue(t.Id, out var perms);
                    return t.ToResponse(perms.CanEdit, perms.CanDelete);
                })
                .ToList();

            var response = new PagedResponse<TopicResponse>
            {
                Items = topics,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize,
                TotalCount = totalCount
            };

            return TypedResults.Ok(response);
        }).RequireAuthorization();
    }
}
