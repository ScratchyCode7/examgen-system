using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.AssignCourses;

public sealed record AssignCoursesRequest(int[] CourseIds);

public sealed class AssignUserCoursesEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/users/{userId:guid}/courses", async Task<IResult> (
                Guid userId,
                AssignCoursesRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var user = await dbContext.Users
                .Include(u => u.UserDepartments)
                .Include(u => u.UserCourses)
                .FirstOrDefaultAsync(u => u.UserId == userId, ct);

            if (user is null)
            {
                return TypedResults.NotFound("User not found.");
            }

            var requestedCourseIds = request.CourseIds ?? Array.Empty<int>();

            if (requestedCourseIds.Length > 0)
            {
                var courseRows = await dbContext.Courses
                    .AsNoTracking()
                    .Where(c => requestedCourseIds.Contains(c.Id))
                    .Select(c => new { c.Id, c.DepartmentId })
                    .ToListAsync(ct);

                if (courseRows.Count != requestedCourseIds.Length)
                {
                    return TypedResults.BadRequest("One or more courses do not exist.");
                }

                var allowedDepartments = user.UserDepartments
                    .Select(ud => ud.DepartmentId)
                    .ToHashSet();

                var invalidCourses = courseRows
                    .Where(c => !allowedDepartments.Contains(c.DepartmentId))
                    .Select(c => c.Id)
                    .ToArray();

                if (invalidCourses.Length > 0)
                {
                    return TypedResults.BadRequest("One or more courses are outside the assigned departments.");
                }
            }

            user.UserCourses.Clear();

            foreach (var courseId in requestedCourseIds.Distinct())
            {
                user.UserCourses.Add(new UserCourse
                {
                    UserId = userId,
                    CourseId = courseId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(new { message = "Courses assigned successfully", courseIds = requestedCourseIds });
        }).RequireAuthorization("AdminOnly");
    }
}
