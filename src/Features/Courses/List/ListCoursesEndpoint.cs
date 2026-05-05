using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Courses.List;

public sealed class ListCoursesEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/courses", async Task<IResult> (
                int? departmentId,
                string? search,
                bool? isActive,
                int pageNumber = 1,
                int pageSize = 10,
                AppDbContext dbContext = null!,
                HttpContext httpContext = null!,
                CancellationToken ct = default) =>
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var query = dbContext.Courses.AsNoTracking();

            var isAdmin = httpContext.User.HasClaim("isAdmin", "true");
            if (!isAdmin)
            {
                var currentUserIdValue = httpContext.User.FindFirst("sub")?.Value
                    ?? httpContext.User.FindFirst("userId")?.Value
                    ?? httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                if (!Guid.TryParse(currentUserIdValue, out var currentUserId))
                {
                    return TypedResults.Problem(
                        "Unable to determine the current user.",
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var courseIds = await dbContext.UserCourses
                    .AsNoTracking()
                    .Where(uc => uc.UserId == currentUserId)
                    .Select(uc => uc.CourseId)
                    .ToListAsync(ct);

                if (courseIds.Count == 0)
                {
                    return TypedResults.Ok(new PagedResponse<CourseResponse>
                    {
                        Items = [],
                        PageNumber = pagination.PageNumber,
                        PageSize = pagination.PageSize,
                        TotalCount = 0
                    });
                }

                query = query.Where(c => courseIds.Contains(c.Id));
            }

            if (departmentId.HasValue)
            {
                query = query.Where(c => c.DepartmentId == departmentId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(c => c.Name.Contains(search) || c.Code.Contains(search));
            }

            if (isActive.HasValue)
            {
                query = query.Where(c => c.IsActive == isActive.Value);
            }

            var totalCount = await query.CountAsync(ct);

            var courses = await query
                .OrderBy(c => c.DepartmentId)
                .ThenBy(c => c.Code)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .Select(c => c.ToResponse())
                .ToListAsync(ct);

            var response = new PagedResponse<CourseResponse>
            {
                Items = courses,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize,
                TotalCount = totalCount
            };

            return TypedResults.Ok(response);
        }).RequireAuthorization();
    }
}
