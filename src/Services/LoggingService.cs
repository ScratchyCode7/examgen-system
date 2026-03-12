using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Services;

public sealed class LoggingService : ILoggingService
{
    private readonly AppDbContext _dbContext;

    public LoggingService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task LogInfoAsync(string? userId, string category, string action, string? details = null)
    {
        await LogAsync(userId, category, action, null, null, details, "Info");
    }

    public async Task LogWarningAsync(string? userId, string category, string action, string? details = null)
    {
        await LogAsync(userId, category, action, null, null, details, "Warning");
    }

    public async Task LogErrorAsync(string? userId, string category, string action, string? details = null, string severity = "Error")
    {
        await LogAsync(userId, category, action, null, null, details, severity);
    }

    public async Task LogActivityAsync(string? userId, string category, string action, string? details = null)
    {
        await LogAsync(userId, category, action, null, null, details, "Info");
    }

    public async Task LogActivityAsync(string? userId, string category, string action, string entityType, int? entityId, string? details = null)
    {
        await LogAsync(userId, category, action, entityType, entityId, details, "Info");
    }

    private async Task LogAsync(string? userId, string category, string action, string? entityType, int? entityId, string? details, string severity)
    {
        var userGuid = userId != null && Guid.TryParse(userId, out var guid) ? guid : (Guid?)null;
        var departmentId = await ResolveDepartmentIdAsync(userGuid);

        if (departmentId is null)
        {
            // No departments available yet; skip logging to avoid FK violations
            return;
        }

        var log = new ActivityLog
        {
            DepartmentId = departmentId.Value,
            UserId = userGuid,
            Category = category,
            Action = action,
            EntityType = entityType ?? string.Empty,
            EntityId = entityId,
            Details = details,
            Severity = severity,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.ActivityLogs.Add(log);
        await _dbContext.SaveChangesAsync();
    }

    private async Task<int?> ResolveDepartmentIdAsync(Guid? userId)
    {
        if (userId.HasValue)
        {
            // Get first department from UserDepartments join table
            var userDepartmentId = await _dbContext.UserDepartments
                .AsNoTracking()
                .Where(ud => ud.UserId == userId.Value)
                .OrderBy(ud => ud.DepartmentId)
                .Select(ud => (int?)ud.DepartmentId)
                .FirstOrDefaultAsync();

            if (userDepartmentId.HasValue)
            {
                return userDepartmentId.Value;
            }
        }

        return await _dbContext.Departments
            .AsNoTracking()
            .OrderBy(d => d.Id)
            .Select(d => (int?)d.Id)
            .FirstOrDefaultAsync();
    }
}

