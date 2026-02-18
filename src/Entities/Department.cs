namespace Databank.Entities;

/// <summary>
/// Represents an academic unit (department) within the university
/// Provides data isolation and organizational structure
/// </summary>
public sealed class Department
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Code { get; set; } = string.Empty;  // e.g., "CCS" for College of Computer Studies
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Course> Courses { get; set; } = new List<Course>();
    public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
}
