namespace Databank.Entities;

//  C# Access Modifiers
// Model 

//Based Model for the database
public sealed class User
{
    public Guid UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public ICollection<TestResult> TestResults { get; set; } = new List<TestResult>();
    public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
}