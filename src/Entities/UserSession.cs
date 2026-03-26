namespace Databank.Entities;

public sealed class UserSession
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public Guid SessionId { get; set; }
    public string Status { get; set; } = SessionStatus.Active;
    public DateTime LastActivity { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
}

public static class SessionStatus
{
    public const string Active = "active";
    public const string Inactive = "inactive";
}