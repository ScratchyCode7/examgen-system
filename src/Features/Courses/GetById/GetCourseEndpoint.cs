using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Courses.GetById;

public sealed class GetCourseEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/courses/{id:int}", async Task<IResult> (
                int id,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var course = await dbContext.Courses
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id, ct);

            if (course is null)
            {
                return TypedResults.NotFound();
            }

            return TypedResults.Ok(course.ToResponse());
        }).RequireAuthorization();
    }
}
