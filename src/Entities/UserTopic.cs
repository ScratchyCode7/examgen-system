namespace Databank.Entities;

/// <summary>
/// Join table enabling users to be assigned access to specific topics.
/// </summary>
public sealed class UserTopic
{
    public Guid UserId { get; set; }
    public int TopicId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public Topic Topic { get; set; } = null!;
}
