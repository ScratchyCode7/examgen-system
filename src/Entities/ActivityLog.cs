namespace Databank.Entities;

/// <summary>
/// Stores audit trail events generated across the system
/// Records system actions for accountability and auditing purposes
/// </summary>
public sealed class ActivityLog
{
    public long Id { get; set; }
    public int DepartmentId { get; set; }
    public Guid? UserId { get; set; }
    public string Category { get; set; } = "System";  // e.g., "Question", "Topic", "ExamGeneration"
    public string Action { get; set; } = string.Empty;  // e.g., "Created", "Updated", "Deleted"
    public string EntityType { get; set; } = string.Empty;  // e.g., "Question", "Test", "Topic"
    public int? EntityId { get; set; }
    public string? Details { get; set; }
    public string Severity { get; set; } = "Info";  // Info, Warning, Error, Critical
    public DateTime CreatedAt { get; set; }

    // Navigation
    public Department Department { get; set; } = null!;
    public User? User { get; set; }
}

