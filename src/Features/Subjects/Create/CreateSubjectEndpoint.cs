using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Services;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Subjects.Create;

public sealed class CreateSubjectEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/subjects", async Task<IResult> (
                SubjectRequest request,
                AppDbContext dbContext,
                IDepartmentAccessService departmentAccessService,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var course = await dbContext.Courses
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == request.CourseId, ct);

            if (course is null)
            {
                return TypedResults.BadRequest("Course not found.");
            }

            var isAdminUser = string.Equals(
                httpContext.User.FindFirst("isAdmin")?.Value,
                "true",
                StringComparison.OrdinalIgnoreCase);

            if (!isAdminUser)
            {
                var userIdClaim = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? httpContext.User.FindFirst("sub")?.Value
                    ?? httpContext.User.FindFirst("userId")?.Value;

                if (!Guid.TryParse(userIdClaim, out var userId))
                {
                    return TypedResults.Problem(
                        "Unable to determine the current user. Please sign in again and retry.",
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var hasAccess = await departmentAccessService.HasAccessToDepartmentAsync(userId, course.DepartmentId, ct);
                if (!hasAccess)
                {
                    return TypedResults.Problem(
                        "You do not have permission to create subjects for this department.",
                        statusCode: StatusCodes.Status403Forbidden);
                }
            }

            var exists = await dbContext.Subjects
                .AnyAsync(s => s.Code == request.Code && s.CourseId == request.CourseId, ct);

            if (exists)
            {
                return TypedResults.Conflict($"Subject with code '{request.Code}' already exists in this course.");
            }

            var subject = new Subject
            {
                CourseId = request.CourseId,
                Code = request.Code,
                Name = request.Name,
                Description = request.Description,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await dbContext.Subjects.AddAsync(subject, ct);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Created($"/api/subjects/{subject.Id}", subject.ToResponse());
        }).RequireAuthorization();
    }
}

