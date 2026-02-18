namespace Databank.Features.Users;

public sealed record UserResponse(
    Guid UserId,
    string FirstName,
    string LastName,
    int DepartmentId,
    string Username,
    string Email,
    bool IsAdmin,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

