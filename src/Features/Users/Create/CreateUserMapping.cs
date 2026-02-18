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
            DepartmentId = req.DepartmentId,
            Email = req.Email,
            IsAdmin = req.IsAdmin
        };
    }

    public static CreateUserResponse ToResponse(this User user)
    {
        return new CreateUserResponse(
            user.FirstName,
            user.LastName,
            user.DepartmentId,
            user.Username,
            user.Email,
            user.IsAdmin
        );
    }
}
