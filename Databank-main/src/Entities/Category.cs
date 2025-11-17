namespace Databank.Entities;
//  C# Access Modifiers
// Model
public sealed class Category
{
    public Guid CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;

    public List<Question> Questions { get; set; } = new();
}
