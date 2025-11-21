using Databank.Entities;

namespace Databank.Features.Users;

public static class UserMappings
{
    public static UserResponse ToResponse(this User user)
    {
        return new UserResponse(
            user.UserId,
            user.FirstName,
            user.LastName,
            user.Department,
            user.Username,
            user.Email,
            user.IsAdmin,
            user.CreatedAt,
            user.UpdatedAt
        );
    }
}

