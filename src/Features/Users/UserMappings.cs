using Databank.Entities;

namespace Databank.Features.Users;

public static class UserMappings
{
    public static UserResponse ToResponse(this User user)
    {
        var departmentIds = user.UserDepartments.Select(ud => ud.DepartmentId).ToArray();
        return new UserResponse(
            user.UserId,
            user.FirstName,
            user.LastName,
            departmentIds.FirstOrDefault() == 0 ? null : departmentIds.FirstOrDefault(),
            departmentIds,
            user.Username,
            user.Email,
            user.IsAdmin,
            user.IsActive,
            user.CreatedAt,
            user.UpdatedAt
        );
    }
}

