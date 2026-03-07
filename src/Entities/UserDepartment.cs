namespace Databank.Entities;

/// <summary>
/// Join table enabling users to have access to multiple departments
/// with potential role/scope distinctions per department
/// </summary>
public sealed class UserDepartment
{
    public Guid UserId { get; set; }
    public int DepartmentId { get; set; }
    
    /// <summary>
    /// Optional field for future role scoping per department (e.g., "Editor", "Viewer")
    /// Currently unused but available for enhancement
    /// </summary>
    public string? RoleScope { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public Department Department { get; set; } = null!;
}
