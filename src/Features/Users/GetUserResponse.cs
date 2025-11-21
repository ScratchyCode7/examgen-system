namespace Databank.Features.Users;

public sealed record UserResponse(
    Guid UserId,
    string FirstName,
    string LastName,
    string Department,
    string Username,
    string Email,
    bool IsAdmin,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

