namespace Databank.Entities;

/// <summary>
/// Represents a course or topic grouping that exams and questions belong to.
/// </summary>
public sealed class Subject
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public ICollection<Test> Tests { get; set; } = new List<Test>();
}

