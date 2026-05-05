namespace Databank.Entities;

/// <summary>
/// Join table enabling users to be enrolled in multiple courses.
/// </summary>
public sealed class UserCourse
{
    public Guid UserId { get; set; }
    public int CourseId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public Course Course { get; set; } = null!;
}
