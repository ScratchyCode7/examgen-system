using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.TestResults.List;

public sealed class GetTestResultsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/test-results", async Task<IResult> (
                Guid? userId,
                int? testId,
                PaginationParams pagination,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var query = dbContext.TestResults.AsNoTracking();

            if (userId.HasValue)
            {
                query = query.Where(r => r.UserId == userId.Value);
            }

            if (testId.HasValue)
            {
                query = query.Where(r => r.TestId == testId.Value);
            }

            var totalCount = await query.CountAsync(ct);

            var results = await query
                .OrderByDescending(r => r.CompletedAt)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .Select(r => r.ToResponse())
                .ToListAsync(ct);

            var response = new PagedResponse<TestResultResponse>
            {
                Items = results,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize,
                TotalCount = totalCount
            };

            return TypedResults.Ok(response);
        }).RequireAuthorization();
    }
}

