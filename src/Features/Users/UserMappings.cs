using Databank.Entities;

namespace Databank.Features.Users;

public static class UserMappings
{
    public static UserResponse ToResponse(this User user)
    {
        var departmentIds = user.UserDepartments.Select(ud => ud.DepartmentId).ToArray();
        var courseIds = user.UserCourses.Select(uc => uc.CourseId).ToArray();
        return new UserResponse(
            user.UserId,
            user.FirstName,
            user.LastName,
            user.ProfileImagePath,
            user.ProfileImageData,
            departmentIds.FirstOrDefault() == 0 ? null : departmentIds.FirstOrDefault(),
            departmentIds,
            courseIds,
            user.Username,
            user.Email,
            user.IsAdmin,
            user.IsActive,
            user.CreatedAt,
            user.UpdatedAt
        );
    }
}

