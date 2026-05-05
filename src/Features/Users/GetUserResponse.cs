namespace Databank.Features.Users;

public sealed record UserResponse(
    Guid UserId,
    string FirstName,
    string LastName,
    string? ProfileImagePath,
    string? ProfileImageData,
    [property: Obsolete("Use DepartmentIds instead")] int? DepartmentId,
    int[] DepartmentIds,
    int[] CourseIds,
    string Username,
    string Email,
    bool IsAdmin,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

