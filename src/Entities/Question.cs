namespace Databank.Entities;

/// <summary>
/// Represents an exam question stored in the databank
/// Classified by Bloom's cognitive level and type
/// Questions belong to topics and form the core of the question databank
/// </summary>
public sealed class Question
{
    public int Id { get; set; }
    public int TopicId { get; set; }
    public string Content { get; set; } = null!;
    public string QuestionType { get; set; } = "MultipleChoice";  // MCQ, TrueFalse, Essay
    public BloomLevel BloomLevel { get; set; } = BloomLevel.Remember;
    public int Points { get; set; } = 1;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Topic Topic { get; set; } = null!;
    public ICollection<Option> Options { get; set; } = new List<Option>();
    public ICollection<TestQuestion> TestQuestions { get; set; } = new List<TestQuestion>();
    public QuestionImage? QuestionImage { get; set; }
}
