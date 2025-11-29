using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Subjects.List;

public sealed class GetSubjectsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/subjects", async Task<IResult> (
                int pageNumber = 1,
                int pageSize = 10,
                AppDbContext dbContext = null!,
                CancellationToken ct = default) =>
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var query = dbContext.Subjects.AsNoTracking();

            var totalCount = await query.CountAsync(ct);

            var subjects = await query
                .OrderBy(s => s.Name)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .Select(s => s.ToResponse())
                .ToListAsync(ct);

            var response = new PagedResponse<SubjectResponse>
            {
                Items = subjects,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize,
                TotalCount = totalCount
            };

            return TypedResults.Ok(response);
        }).RequireAuthorization();
    }
}

