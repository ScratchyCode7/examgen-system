namespace Databank.Services;

public interface ILoggingService
{
    Task LogInfoAsync(string? userId, string category, string action, string? details = null);
    Task LogWarningAsync(string? userId, string category, string action, string? details = null);
    Task LogErrorAsync(string? userId, string category, string action, string? details = null, string severity = "Error");
    Task LogActivityAsync(string? userId, string category, string action, string? details = null);
}

