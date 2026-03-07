namespace Databank.Entities;

/// <summary>
/// Junction table for the many-to-many relationship between Tests and Questions
/// Tracks which questions are included in a generated test and their order
/// </summary>
public sealed class TestQuestion
{
    public int Id { get; set; }
    public int TestId { get; set; }
    public int QuestionId { get; set; }
    public int DisplayOrder { get; set; }
    public string? OptionSnapshotJson { get; set; }

    // Navigation
    public Test Test { get; set; } = null!;
    public Question Question { get; set; } = null!;
}
