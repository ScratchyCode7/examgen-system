using Databank.Abstract;
using Databank.Common;
using Databank.Database;
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

            var topics = await query
                .OrderBy(t => t.SubjectId)
                .ThenBy(t => t.SequenceOrder)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .Select(t => t.ToResponse())
                .ToListAsync(ct);

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
