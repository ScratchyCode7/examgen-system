using Databank.Abstract;
using Databank.Common;
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
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var topic = await dbContext.Topics.FirstOrDefaultAsync(t => t.Id == id, ct);

            if (topic is null)
            {
                return TypedResults.NotFound();
            }

            var normalizedTitle = DuplicateKeyNormalizer.NormalizeKey(request.Title);
            if (string.IsNullOrWhiteSpace(normalizedTitle))
            {
                return TypedResults.BadRequest("Topic title is required.");
            }

            var siblingTitles = await dbContext.Topics
                .AsNoTracking()
                .Where(t => t.SubjectId == topic.SubjectId && t.Id != id)
                .Select(t => t.Title)
                .ToListAsync(ct);

            var duplicateExists = siblingTitles.Any(title => DuplicateKeyNormalizer.NormalizeKey(title) == normalizedTitle);
            if (duplicateExists)
            {
                return TypedResults.Conflict($"Topic '{request.Title}' already exists in this subject.");
            }

            topic.Title = request.Title.Trim();
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
