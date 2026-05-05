using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Databank.Features.Subjects;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Subjects.List;

public sealed class GetSubjectsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/subjects", async Task<IResult> (
                int? courseId,
                string? search,
                bool? isActive,
                int pageNumber = 1,
                int pageSize = 10,
                AppDbContext dbContext = null!,
                HttpContext httpContext = null!,
                CancellationToken ct = default) =>
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var query = dbContext.Subjects.AsNoTracking();

            if (courseId.HasValue)
            {
                query = query.Where(s => s.CourseId == courseId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(s => s.Name.Contains(search) || s.Code.Contains(search));
            }

            if (isActive.HasValue)
            {
                query = query.Where(s => s.IsActive == isActive.Value);
            }

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
                    return TypedResults.Ok(new PagedResponse<SubjectResponse>
                    {
                        Items = [],
                        PageNumber = pagination.PageNumber,
                        PageSize = pagination.PageSize,
                        TotalCount = 0
                    });
                }

                query = query.Where(s => courseIds.Contains(s.CourseId));
            }

            var totalCount = await query.CountAsync(ct);

            var subjectRows = await query
                .OrderBy(s => s.CourseId)
                .ThenBy(s => s.Code)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .ToListAsync(ct);

            var subjects = subjectRows
                .Select(s =>
                {
                    var canEdit = isAdmin;
                    var canDelete = isAdmin;
                    return s.ToResponse(canEdit, canDelete);
                })
                .ToList();

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

