using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Courses.Create;

public sealed class CreateCourseEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/courses", async Task<IResult> (
                CourseRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            // Verify department exists
            var departmentExists = await dbContext.Departments
                .AnyAsync(d => d.Id == request.DepartmentId, ct);

            if (!departmentExists)
            {
                return TypedResults.BadRequest("Department not found.");
            }

            // Check for duplicate code within same department
            var exists = await dbContext.Courses
                .AnyAsync(c => c.Code == request.Code && c.DepartmentId == request.DepartmentId, ct);

            if (exists)
            {
                return TypedResults.Conflict($"Course with code '{request.Code}' already exists in this department.");
            }

            var course = new Course
            {
                DepartmentId = request.DepartmentId,
                Name = request.Name,
                Code = request.Code,
                Description = request.Description,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await dbContext.Courses.AddAsync(course, ct);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Created($"/api/courses/{course.Id}", course.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}
