namespace Databank.Features.Account;

public sealed record AccountProfileResponse(
    Guid UserId,
    string FullName,
    string FirstName,
    string LastName,
    string Email,
    string Username,
    string? ProfileImagePath,
    string? ProfileImageData,
    bool IsAdmin,
    DateTime UpdatedAt
);
