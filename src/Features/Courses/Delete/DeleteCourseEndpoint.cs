using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Courses.Delete;

public sealed class DeleteCourseEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/courses/{id:int}", async Task<IResult> (
                int id,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var course = await dbContext.Courses
                .Include(c => c.Subjects)
                .FirstOrDefaultAsync(c => c.Id == id, ct);

            if (course is null)
            {
                return TypedResults.NotFound();
            }

            // Check if course has subjects
            if (course.Subjects.Any())
            {
                return TypedResults.BadRequest(
                    "Cannot delete course with associated subjects. " +
                    "Please remove or migrate them first.");
            }

            dbContext.Courses.Remove(course);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.NoContent();
        }).RequireAuthorization("AdminOnly");
    }
}
