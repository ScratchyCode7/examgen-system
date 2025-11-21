namespace Databank.Entities;

/// <summary>
/// Stores audit trail events generated across the system.
/// </summary>
public sealed class ActivityLog
{
    public long Id { get; set; }
    public Guid? UserId { get; set; }
    public string Category { get; set; } = "System";
    public string Action { get; set; } = string.Empty;
    public string? Details { get; set; }
    public string Severity { get; set; } = "Info";
    public DateTime CreatedAt { get; set; }

    // Navigation
    public User? User { get; set; }
}

