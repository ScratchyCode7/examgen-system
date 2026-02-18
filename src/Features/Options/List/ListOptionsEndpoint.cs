using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Options.List;

public sealed class ListOptionsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/options", async Task<IResult> (
                AppDbContext dbContext,
                CancellationToken ct,
                int? questionId,
                int pageNumber = 1,
                int pageSize = 10) =>
        {
            var query = dbContext.Options.AsNoTracking();

            // Filter by questionId if provided
            if (questionId.HasValue)
            {
                query = query.Where(o => o.QuestionId == questionId.Value);
            }

            var totalCount = await query.CountAsync(ct);
            var items = await query
                .OrderBy(o => o.DisplayOrder)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(o => o.ToResponse())
                .ToListAsync(ct);

            return TypedResults.Ok(new PagedResponse<object>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            });
        }).RequireAuthorization();
    }
}
