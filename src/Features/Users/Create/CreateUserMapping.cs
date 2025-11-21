using Databank.Entities;

namespace Databank.Features.Users.Create;

public static class CreateUserMapping
{
    public static User ToCreate(this CreateUserRequest req)
    {
        return new User
        {
            FirstName = req.FirstName,
            LastName = req.LastName,
            Username = req.Username,
            Department = req.Department,
            Email = req.Email,
            IsAdmin = req.IsAdmin
        };
    }

    public static CreateUserResponse ToResponse(this User user)
    {
        return new CreateUserResponse(
            user.FirstName,
            user.LastName,
            user.Department,
            user.Username,
            user.Email,
            user.IsAdmin
        );
    }
}
