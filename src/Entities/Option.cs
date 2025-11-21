namespace Databank.Entities;

public sealed class Option
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    public string Content { get; set; } = null!;
    public bool IsCorrect { get; set; }
    public int DisplayOrder { get; set; }

    public Question Question { get; set; } = null!;
}
