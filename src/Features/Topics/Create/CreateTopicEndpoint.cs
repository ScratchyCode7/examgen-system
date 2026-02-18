using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Topics.Create;

public sealed class CreateTopicEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/topics", async Task<IResult> (
                CreateTopicRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            // Verify subject exists
            var subjectExists = await dbContext.Subjects
                .AnyAsync(s => s.Id == request.SubjectId, ct);

            if (!subjectExists)
            {
                return TypedResults.BadRequest("Subject not found.");
            }

            var topic = new Topic
            {
                SubjectId = request.SubjectId,
                Title = request.Title,
                Description = request.Description,
                SequenceOrder = request.SequenceOrder,
                AllocatedHours = request.AllocatedHours,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await dbContext.Topics.AddAsync(topic, ct);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Created($"/api/topics/{topic.Id}", topic.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}
