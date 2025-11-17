using Databank.Entities;
using Databank.Features.Users.Create;

public static class CreateUserMapping
{
    public static  User ToCreate(this CreateUserRequest req)
    {
        return new User
        {
            FirstName = req.FirstName,
            LastName = req.LastName,
            Username = req.Username,
            Department = req.Department,
            Password = req.Password, // ⚠️ hash this before saving
            Email = req.Email
        };
    }

    public static CreateUserResponse ToResponse(this User user)
    {
        return new CreateUserResponse(
            user.FirstName,
            user.LastName,
            user.Department,
            user.Username,
            user.Email
        );
    }
}