namespace Databank.Entities;

/// <summary>
/// Represents a syllabus unit or topic within a subject/course
/// Topics contain questions and are used as weighting factors for exam generation
/// </summary>
public sealed class Topic
{
    public int Id { get; set; }
    public int SubjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SequenceOrder { get; set; }  // Order within the subject syllabus
    public decimal AllocatedHours { get; set; }  // Teaching hours for weighting during exam generation
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Subject Subject { get; set; } = null!;
    public ICollection<Question> Questions { get; set; } = new List<Question>();
}
