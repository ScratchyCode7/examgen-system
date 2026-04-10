using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Databank.Features.Topics;
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

            var totalCount = await query.CountAsync(ct);

            var currentUserId = TopicPermissionResolver.GetCurrentUserId(httpContext.User);

            var topicRows = await query
                .OrderBy(t => t.SubjectId)
                .ThenBy(t => t.SequenceOrder)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .ToListAsync(ct);

            Dictionary<int, (bool CanEdit, bool CanDelete)> permissions = new();
            if (currentUserId.HasValue)
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
                    var canEdit = permissions.TryGetValue(t.Id, out var perms) && perms.CanEdit;
                    var canDelete = permissions.TryGetValue(t.Id, out var perms2) && perms2.CanDelete;
                    return t.ToResponse(canEdit, canDelete);
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
