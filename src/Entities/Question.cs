namespace Databank.Entities;

public sealed class Question
{
    public int Id { get; set; }
    public int TestId { get; set; }
    public string Content { get; set; } = null!;
    public string Type { get; set; } = "MultipleChoice";
    public int Points { get; set; }
    public int DisplayOrder { get; set; }

    // Navigation
    public Test Test { get; set; } = null!;
    public ICollection<Option> Options { get; set; } = new List<Option>();
}
