using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Departments.List;

public sealed class ListDepartmentsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/departments", async Task<IResult> (
                string? search,
                bool? isActive,
                int pageNumber = 1,
                int pageSize = 10,
                AppDbContext dbContext = null!,
                CancellationToken ct = default) =>
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var query = dbContext.Departments.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(d => d.Name.Contains(search) || d.Code.Contains(search));
            }

            if (isActive.HasValue)
            {
                query = query.Where(d => d.IsActive == isActive.Value);
            }

            var totalCount = await query.CountAsync(ct);

            var departments = await query
                .OrderBy(d => d.Name)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .Select(d => d.ToResponse())
                .ToListAsync(ct);

            var response = new PagedResponse<DepartmentResponse>
            {
                Items = departments,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize,
                TotalCount = totalCount
            };

            return TypedResults.Ok(response);
        }).RequireAuthorization();
    }
}
