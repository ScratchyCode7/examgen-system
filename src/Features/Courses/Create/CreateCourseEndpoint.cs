using Databank.Abstract;
using Databank.Common;
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

            var normalizedCode = DuplicateKeyNormalizer.NormalizeKey(request.Code);
            if (string.IsNullOrWhiteSpace(normalizedCode))
            {
                return TypedResults.BadRequest("Course code is required.");
            }

            // Check for duplicate code within same department
            var siblingCodes = await dbContext.Courses
                .AsNoTracking()
                .Where(c => c.DepartmentId == request.DepartmentId)
                .Select(c => c.Code)
                .ToListAsync(ct);

            var exists = siblingCodes.Any(code => DuplicateKeyNormalizer.NormalizeKey(code) == normalizedCode);

            if (exists)
            {
                return TypedResults.Conflict($"Course with code '{request.Code}' already exists in this department.");
            }

            var course = new Course
            {
                DepartmentId = request.DepartmentId,
                Name = request.Name,
                Code = request.Code?.Trim() ?? string.Empty,
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
