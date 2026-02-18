using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Subjects.Create;

public sealed class CreateSubjectEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/subjects", async Task<IResult> (
                SubjectRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            // Verify course exists
            var courseExists = await dbContext.Courses
                .AnyAsync(c => c.Id == request.CourseId, ct);

            if (!courseExists)
            {
                return TypedResults.BadRequest("Course not found.");
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
        }).RequireAuthorization("AdminOnly");
    }
}

