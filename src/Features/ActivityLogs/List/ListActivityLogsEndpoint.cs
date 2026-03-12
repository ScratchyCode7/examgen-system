using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.ActivityLogs.List;

public sealed class ListActivityLogsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/activity-logs", async Task<IResult> (
                int page,
                int pageSize,
                Guid? userId,
                int? departmentId,
                string? category,
                string? action,
                string? entityType,
                string? severity,
                DateTime? startDate,
                DateTime? endDate,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            page = page > 0 ? page : 1;
            pageSize = pageSize > 0 ? pageSize : 20;

            var query = dbContext.ActivityLogs
                .Include(a => a.Department)
                .Include(a => a.User)
                .AsQueryable();

            // Apply filters
            if (userId.HasValue)
                query = query.Where(a => a.UserId == userId.Value);

            if (departmentId.HasValue)
                query = query.Where(a => a.DepartmentId == departmentId.Value);

            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(a => a.Category == category);

            if (!string.IsNullOrWhiteSpace(action))
                query = query.Where(a => a.Action == action);

            if (!string.IsNullOrWhiteSpace(entityType))
                query = query.Where(a => a.EntityType == entityType);

            if (!string.IsNullOrWhiteSpace(severity))
                query = query.Where(a => a.Severity == severity);

            if (startDate.HasValue)
                query = query.Where(a => a.CreatedAt >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(a => a.CreatedAt <= endDate.Value);

            // Get total count
            var totalCount = await query.CountAsync(ct);

            // Apply pagination
            var logs = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new ActivityLogDto
                {
                    Id = a.Id,
                    DepartmentId = a.DepartmentId,
                    DepartmentName = a.Department.Name,
                    UserId = a.UserId,
                    UserName = a.User != null ? a.User.FirstName + " " + a.User.LastName : null,
                    Category = a.Category,
                    Action = a.Action,
                    EntityType = a.EntityType,
                    EntityId = a.EntityId,
                    Details = a.Details,
                    Severity = a.Severity,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync(ct);

            var response = new PagedResponse<ActivityLogDto>
            {
                Items = logs,
                PageNumber = page,
                PageSize = pageSize,
                TotalCount = totalCount
            };

            return TypedResults.Ok(response);
        }).RequireAuthorization("AdminOnly");
    }
}
