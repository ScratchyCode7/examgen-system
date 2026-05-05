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
    public string? ProfileImagePath { get; set; }
    public string? ProfileImageData { get; set; }
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
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockoutEnd { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    [Obsolete("Use UserDepartments collection instead")]
    public Department? Department { get; set; }
    
    public ICollection<UserDepartment> UserDepartments { get; set; } = new List<UserDepartment>();
    public ICollection<UserCourse> UserCourses { get; set; } = new List<UserCourse>();
    public ICollection<UserTopic> UserTopics { get; set; } = new List<UserTopic>();
    public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
    public ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
}