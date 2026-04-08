using Databank.Entities;

namespace Databank.Features.Account;

public static class AccountMappings
{
    public static AccountProfileResponse ToAccountProfileResponse(this User user)
    {
        var fullName = $"{user.FirstName} {user.LastName}".Trim();

        return new AccountProfileResponse(
            user.UserId,
            string.IsNullOrWhiteSpace(fullName) ? user.Username : fullName,
            user.FirstName,
            user.LastName,
            user.Email,
            user.Username,
            user.ProfileImagePath,
            user.ProfileImageData,
            user.IsAdmin,
            user.UpdatedAt
        );
    }
}
