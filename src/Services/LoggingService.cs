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
        await LogAsync(userId, category, action, details, "Info");
    }

    public async Task LogWarningAsync(string? userId, string category, string action, string? details = null)
    {
        await LogAsync(userId, category, action, details, "Warning");
    }

    public async Task LogErrorAsync(string? userId, string category, string action, string? details = null, string severity = "Error")
    {
        await LogAsync(userId, category, action, details, severity);
    }

    public async Task LogActivityAsync(string? userId, string category, string action, string? details = null)
    {
        await LogAsync(userId, category, action, details, "Info");
    }

    private async Task LogAsync(string? userId, string category, string action, string? details, string severity)
    {
        var log = new ActivityLog
        {
            UserId = userId != null && Guid.TryParse(userId, out var guid) ? guid : null,
            Category = category,
            Action = action,
            Details = details,
            Severity = severity,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.ActivityLogs.Add(log);
        await _dbContext.SaveChangesAsync();
    }
}

