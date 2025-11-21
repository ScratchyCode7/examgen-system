namespace Databank.Entities;

public sealed class Test
{
    public int Id { get; set; }
    public int SubjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DurationMinutes { get; set; }
    public bool IsPublished { get; set; }
    public DateTime AvailableFrom { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Subject Subject { get; set; } = null!;
    public ICollection<Question> Questions { get; set; } = new List<Question>();
    public ICollection<TestResult> TestResults { get; set; } = new List<TestResult>();
}
