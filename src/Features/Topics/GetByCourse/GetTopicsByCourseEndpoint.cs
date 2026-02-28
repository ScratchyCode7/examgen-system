using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Topics.GetByCourse;

public sealed class GetTopicsByCourseEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/topics/by-course/{courseId}", async Task<IResult> (
                int courseId,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var topics = await dbContext.Topics
                .AsNoTracking()
                .Include(t => t.Subject)
                .Where(t => t.Subject.CourseId == courseId && t.Subject.IsActive && t.IsActive)
                .OrderBy(t => t.SequenceOrder)
                .ThenBy(t => t.Title)
                .ToListAsync(ct);

            return TypedResults.Ok(topics);
        });
    }
}
