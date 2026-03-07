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
    
    /// <summary>
    /// Legacy single-department FK. Will be removed after migration to UserDepartments.
    /// TODO: Remove after all code paths updated to use UserDepartments
    /// </summary>
    [Obsolete("Use UserDepartments collection instead")]
    public int? DepartmentId { get; set; }
    
    public bool IsAdmin { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    [Obsolete("Use UserDepartments collection instead")]
    public Department? Department { get; set; }
    
    public ICollection<UserDepartment> UserDepartments { get; set; } = new List<UserDepartment>();
    public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
}