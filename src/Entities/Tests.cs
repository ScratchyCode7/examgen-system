namespace Databank.Entities;

/// <summary>
/// Represents a generated exam snapshot
/// Contains the questions selected during exam generation and the parameters used
/// Tests are immutable records of exam generation events for auditability
/// </summary>
public sealed class Test
{
    public int Id { get; set; }
    public int SubjectId { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DurationMinutes { get; set; } = 60;
    public int TotalPoints { get; set; }
    
    // Exam generation parameters
    public int TotalQuestions { get; set; }
    public string? GenerationNotes { get; set; }  // Additional notes about generation
    
    public bool IsPublished { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime AvailableFrom { get; set; }
    public DateTime? AvailableTo { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Subject Subject { get; set; } = null!;
    public User? CreatedByUser { get; set; }
    public ICollection<TestQuestion> TestQuestions { get; set; } = new List<TestQuestion>();
}
