using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Microsoft.AspNetCore.Http;
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
            HttpContext httpContext = null!,
                CancellationToken ct = default) =>
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var query = dbContext.Departments.AsNoTracking();

            query = query.Where(d => d.Code != "IT" && d.Code != "ITS");

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(d => d.Name.Contains(search) || d.Code.Contains(search));
            }

            if (isActive.HasValue)
            {
                query = query.Where(d => d.IsActive == isActive.Value);
            }

            var isAdmin = httpContext.User.HasClaim("isAdmin", "true");
            if (!isAdmin)
            {
                var currentUserIdValue = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? httpContext.User.FindFirst("sub")?.Value
                    ?? httpContext.User.FindFirst("userId")?.Value;

                if (!Guid.TryParse(currentUserIdValue, out var currentUserId))
                {
                    return TypedResults.Problem(
                        "Unable to determine the current user.",
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var departmentIds = await dbContext.UserDepartments
                    .AsNoTracking()
                    .Where(ud => ud.UserId == currentUserId)
                    .Select(ud => ud.DepartmentId)
                    .Distinct()
                    .ToListAsync(ct);

                if (departmentIds.Count == 0)
                {
                    return TypedResults.Ok(new PagedResponse<DepartmentResponse>
                    {
                        Items = [],
                        PageNumber = pagination.PageNumber,
                        PageSize = pagination.PageSize,
                        TotalCount = 0
                    });
                }

                query = query.Where(d => departmentIds.Contains(d.Id));
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
