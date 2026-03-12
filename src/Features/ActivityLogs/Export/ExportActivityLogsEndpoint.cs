using System.Text;
using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.ActivityLogs.Export;

public sealed class ExportActivityLogsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/activity-logs/export", async Task<IResult> (
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

            var logs = await query
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new
                {
                    a.Id,
                    DepartmentName = a.Department.Name,
                    UserName = a.User != null ? a.User.FirstName + " " + a.User.LastName : "System",
                    a.Category,
                    a.Action,
                    a.EntityType,
                    a.EntityId,
                    a.Details,
                    a.Severity,
                    a.CreatedAt
                })
                .ToListAsync(ct);

            // Generate CSV
            var csv = new StringBuilder();
            
            // Header
            csv.AppendLine("ID,Timestamp,Department,User,Category,Action,Entity Type,Entity ID,Details,Severity");

            // Data rows
            foreach (var log in logs)
            {
                csv.AppendLine($"{log.Id}," +
                              $"{log.CreatedAt:yyyy-MM-dd HH:mm:ss}," +
                              $"\"{EscapeCsv(log.DepartmentName)}\"," +
                              $"\"{EscapeCsv(log.UserName)}\"," +
                              $"\"{EscapeCsv(log.Category)}\"," +
                              $"\"{EscapeCsv(log.Action)}\"," +
                              $"\"{EscapeCsv(log.EntityType)}\"," +
                              $"{log.EntityId ?? 0}," +
                              $"\"{EscapeCsv(log.Details ?? "")}\"," +
                              $"\"{EscapeCsv(log.Severity)}\"");
            }

            var bytes = Encoding.UTF8.GetBytes(csv.ToString());
            var fileName = $"activity-logs-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";

            return TypedResults.File(bytes, "text/csv", fileName);
        }).RequireAuthorization("AdminOnly");
    }

    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return string.Empty;

        // Escape quotes by doubling them
        return value.Replace("\"", "\"\"");
    }
}
