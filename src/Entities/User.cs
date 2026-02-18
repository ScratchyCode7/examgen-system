namespace Databank.Entities;

/// <summary>
/// Represents system users (faculty, department administrators, and system administrators)
/// Uses role-based access control with department-based data isolation
/// </summary>
public sealed class User
{
    public Guid UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public bool IsAdmin { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Department Department { get; set; } = null!;
    public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
}