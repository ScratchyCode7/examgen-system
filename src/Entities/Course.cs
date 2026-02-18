namespace Databank.Entities;

/// <summary>
/// Represents an academic program/degree (e.g., BSc Computer Science, BSc Data Science)
/// Courses belong to departments and contain subjects
/// </summary>
public sealed class Course
{
    public int Id { get; set; }
    public int DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;  // e.g., "Bachelor of Science in Computer Science"
    public string Code { get; set; } = string.Empty;  // e.g., "BSCS"
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Department Department { get; set; } = null!;
    public ICollection<Subject> Subjects { get; set; } = [];
}
