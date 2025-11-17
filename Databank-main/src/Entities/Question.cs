namespace Databank.Entities;
//  C# Access Modifiers
// Model
public sealed class Question
{
    public Guid QuestionId { get; set; }
    public string Text { get; set; } = string.Empty;

    public string OptionA { get; set; } = string.Empty;
    public string OptionB { get; set; } = string.Empty;
    public string OptionC { get; set; } = string.Empty;
    public string OptionD { get; set; } = string.Empty;

    public string CorrectAnswer { get; set; } = string.Empty; // A, B, C, D

    public string QuestionType { get; set; } = string.Empty;
    // Remembering & Understanding, Applying & Analyzing, Evaluating & Creating

    public Guid CreatedBy { get; set; }
    public User? Creator { get; set; }

    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
