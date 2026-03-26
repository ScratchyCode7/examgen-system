namespace Databank.Features.Users;

public sealed record UserResponse(
    Guid UserId,
    string FirstName,
    string LastName,
    string? ProfileImagePath,
    [property: Obsolete("Use DepartmentIds instead")] int? DepartmentId,
    int[] DepartmentIds,
    string Username,
    string Email,
    bool IsAdmin,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

