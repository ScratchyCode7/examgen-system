namespace Databank.Entities;

/// <summary>
/// Represents an academic subject within a course (degree program)
/// Subjects are predefined and organized by topics (syllabus units)
/// </summary>
public sealed class Subject
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public string Code { get; set; } = string.Empty;  // e.g., "CS101"
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Course Course { get; set; } = null!;
    public ICollection<Topic> Topics { get; set; } = new List<Topic>();
    public ICollection<Test> Tests { get; set; } = new List<Test>();
}

