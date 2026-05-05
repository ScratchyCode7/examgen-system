using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.Courses;

public sealed class ManageUserCourseEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/users/{userId:guid}/courses/{courseId:int}", AddCourseAsync)
            .RequireAuthorization("AdminOnly");

        app.MapDelete("/api/users/{userId:guid}/courses/{courseId:int}", RemoveCourseAsync)
            .RequireAuthorization("AdminOnly");
    }

    private static async Task<IResult> AddCourseAsync(
        Guid userId,
        int courseId,
        AppDbContext dbContext,
        CancellationToken ct)
    {
        var user = await dbContext.Users
            .Include(u => u.UserDepartments)
            .Include(u => u.UserCourses)
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);

        if (user is null)
        {
            return TypedResults.NotFound("User not found.");
        }

        var course = await dbContext.Courses
            .AsNoTracking()
            .Select(c => new { c.Id, c.DepartmentId })
            .FirstOrDefaultAsync(c => c.Id == courseId, ct);

        if (course is null)
        {
            return TypedResults.NotFound("Course not found.");
        }

        var allowedDepartments = user.UserDepartments
            .Select(ud => ud.DepartmentId)
            .ToHashSet();

        if (!allowedDepartments.Contains(course.DepartmentId))
        {
            return TypedResults.BadRequest("The selected course is outside the user's assigned departments.");
        }

        var alreadyAssigned = user.UserCourses.Any(uc => uc.CourseId == courseId);
        if (!alreadyAssigned)
        {
            user.UserCourses.Add(new UserCourse
            {
                UserId = userId,
                CourseId = courseId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await dbContext.SaveChangesAsync(ct);
        }

        return TypedResults.Ok(new { message = "Course access granted.", courseId, added = !alreadyAssigned });
    }

    private static async Task<IResult> RemoveCourseAsync(
        Guid userId,
        int courseId,
        AppDbContext dbContext,
        CancellationToken ct)
    {
        var user = await dbContext.Users
            .Include(u => u.UserCourses)
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);

        if (user is null)
        {
            return TypedResults.NotFound("User not found.");
        }

        var assignment = user.UserCourses.FirstOrDefault(uc => uc.CourseId == courseId);
        if (assignment is null)
        {
            return TypedResults.Ok(new { message = "Course access already absent.", courseId, removed = false });
        }

        dbContext.UserCourses.Remove(assignment);
        await dbContext.SaveChangesAsync(ct);

        return TypedResults.Ok(new { message = "Course access revoked.", courseId, removed = true });
    }
}