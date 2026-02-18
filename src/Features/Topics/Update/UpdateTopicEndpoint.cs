using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Topics.Update;

public sealed class UpdateTopicEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/topics/{id:int}", async Task<IResult> (
                int id,
                UpdateTopicRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var topic = await dbContext.Topics.FirstOrDefaultAsync(t => t.Id == id, ct);

            if (topic is null)
            {
                return TypedResults.NotFound();
            }

            topic.Title = request.Title;
            if (request.Description != null)
            {
                topic.Description = request.Description;
            }
            if (request.SequenceOrder.HasValue)
            {
                topic.SequenceOrder = request.SequenceOrder.Value;
            }
            if (request.AllocatedHours.HasValue)
            {
                topic.AllocatedHours = request.AllocatedHours.Value;
            }
            if (request.IsActive.HasValue)
            {
                topic.IsActive = request.IsActive.Value;
            }
            topic.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(topic.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}
