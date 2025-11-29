using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Tests.List;

public sealed class GetTestsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tests", async Task<IResult> (
                int pageNumber = 1,
                int pageSize = 10,
                AppDbContext dbContext = null!,
                CancellationToken ct = default) =>
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var query = dbContext.Tests.AsNoTracking();

            var totalCount = await query.CountAsync(ct);

            var tests = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .Select(t => t.ToResponse())
                .ToListAsync(ct);

            var response = new PagedResponse<TestResponse>
            {
                Items = tests,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize,
                TotalCount = totalCount
            };

            return TypedResults.Ok(response);
        }).RequireAuthorization();
    }
}

