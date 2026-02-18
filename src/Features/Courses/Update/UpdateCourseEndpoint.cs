using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Courses.Update;

public sealed class UpdateCourseEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/courses/{id:int}", async Task<IResult> (
                int id,
                CourseRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var course = await dbContext.Courses
                .FirstOrDefaultAsync(c => c.Id == id, ct);

            if (course is null)
            {
                return TypedResults.NotFound();
            }

            // Verify department exists
            var departmentExists = await dbContext.Departments
                .AnyAsync(d => d.Id == request.DepartmentId, ct);

            if (!departmentExists)
            {
                return TypedResults.BadRequest("Department not found.");
            }

            // Check for duplicate code if code changed
            if (course.Code != request.Code)
            {
                var exists = await dbContext.Courses
                    .AnyAsync(c => c.Code == request.Code && c.DepartmentId == request.DepartmentId && c.Id != id, ct);

                if (exists)
                {
                    return TypedResults.Conflict($"Course with code '{request.Code}' already exists in this department.");
                }
            }

            course.Name = request.Name;
            course.Code = request.Code;
            course.Description = request.Description;
            course.DepartmentId = request.DepartmentId;
            course.UpdatedAt = DateTime.UtcNow;

            dbContext.Courses.Update(course);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(course.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}
