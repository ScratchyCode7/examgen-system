namespace Databank.Features.ActivityLogs;

public class ActivityLogDto
{
    public long Id { get; set; }
    public int DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public int? EntityId { get; set; }
    public string? Details { get; set; }
    public string Severity { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class ActivityLogFilters
{
    public Guid? UserId { get; set; }
    public int? DepartmentId { get; set; }
    public string? Category { get; set; }
    public string? Action { get; set; }
    public string? EntityType { get; set; }
    public string? Severity { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}
