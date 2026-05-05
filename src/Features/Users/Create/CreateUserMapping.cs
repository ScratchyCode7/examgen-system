using Databank.Entities;

namespace Databank.Features.Users.Create;

public static class CreateUserMapping
{
    public static User ToCreate(this CreateUserRequest req)
    {
        var user = new User
        {
            FirstName = req.FirstName,
            LastName = req.LastName,
            Username = req.Username,
            Email = req.Email,
            IsAdmin = req.IsAdmin
        };
        
        // Initialize UserDepartments collection
        user.UserDepartments = req.DepartmentIds
            .Select(deptId => new UserDepartment
            {
                DepartmentId = deptId,
                UserId = user.UserId
            })
            .ToList();

        user.UserCourses = (req.CourseIds ?? Array.Empty<int>())
            .Distinct()
            .Select(courseId => new UserCourse
            {
                CourseId = courseId,
                UserId = user.UserId
            })
            .ToList();
            
        return user;
    }

    public static CreateUserResponse ToResponse(this User user)
    {
        return new CreateUserResponse(
            user.FirstName,
            user.LastName,
            user.UserDepartments.Select(ud => ud.DepartmentId).ToArray(),
            user.UserCourses.Select(uc => uc.CourseId).ToArray(),
            user.Username,
            user.Email,
            user.IsAdmin
        );
    }
}
