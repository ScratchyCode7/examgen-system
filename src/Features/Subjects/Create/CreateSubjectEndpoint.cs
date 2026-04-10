using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Services;
using Microsoft.EntityFrameworkCore;
using Databank.Features.Subjects;

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
            var requesterId = SubjectPermissionResolver.GetCurrentUserId(httpContext.User);
            if (!requesterId.HasValue)
            {
                return TypedResults.Problem(
                    "Unable to determine the current user. Please sign in again and retry.",
                    statusCode: StatusCodes.Status401Unauthorized);
            }

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
                var hasAccess = await departmentAccessService.HasAccessToDepartmentAsync(requesterId.Value, course.DepartmentId, ct);
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

            dbContext.ActivityLogs.Add(new ActivityLog
            {
                DepartmentId = course.DepartmentId,
                UserId = requesterId.Value,
                Category = "Subjects",
                Action = "Created",
                EntityType = SubjectPermissionResolver.RequestEntityType,
                EntityId = subject.Id,
                Details = $"Subject '{subject.Code}' created.",
                Severity = "Info",
                CreatedAt = DateTime.UtcNow
            });

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Created($"/api/subjects/{subject.Id}", subject.ToResponse(canEdit: true, canDelete: true));
        }).RequireAuthorization();
    }
}

