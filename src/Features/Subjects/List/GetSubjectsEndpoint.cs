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

            var totalCount = await query.CountAsync(ct);

            var currentUserId = SubjectPermissionResolver.GetCurrentUserId(httpContext.User);

            var subjectRows = await query
                .OrderBy(s => s.CourseId)
                .ThenBy(s => s.Code)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .ToListAsync(ct);

            Dictionary<int, (bool CanEdit, bool CanDelete)> permissions = new();
            if (currentUserId.HasValue)
            {
                permissions = await SubjectPermissionResolver.ResolvePermissionsForUserAsync(
                    dbContext,
                    currentUserId.Value,
                    subjectRows.Select(s => s.Id).ToList(),
                    ct);
            }

            var subjects = subjectRows
                .Select(s =>
                {
                    var canEdit = permissions.TryGetValue(s.Id, out var perms) && perms.CanEdit;
                    var canDelete = permissions.TryGetValue(s.Id, out var perms2) && perms2.CanDelete;
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

