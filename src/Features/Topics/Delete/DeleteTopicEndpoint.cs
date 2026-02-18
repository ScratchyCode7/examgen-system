using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Topics.Delete;

public sealed class DeleteTopicEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/topics/{id:int}", async Task<IResult> (
                int id,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var topic = await dbContext.Topics
                .Include(t => t.Questions)
                .FirstOrDefaultAsync(t => t.Id == id, ct);

            if (topic is null)
            {
                return TypedResults.NotFound();
            }

            // Check if topic has any questions
            if (topic.Questions.Any())
            {
                return TypedResults.BadRequest(
                    "Cannot delete topic with associated questions. " +
                    "Please remove or reassign the questions first.");
            }

            dbContext.Topics.Remove(topic);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.NoContent();
        }).RequireAuthorization("AdminOnly");
    }
}
