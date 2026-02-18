using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Questions.Create;

public sealed class CreateQuestionEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/questions", async Task<IResult> (
                QuestionRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var topicExists = await dbContext.Topics.AnyAsync(t => t.Id == request.TopicId, ct);
            if (!topicExists)
            {
                return TypedResults.BadRequest("Topic not found.");
            }

            var question = new Question
            {
                TopicId = request.TopicId,
                Content = request.Content,
                QuestionType = request.QuestionType,
                BloomLevel = request.BloomLevel,
                Points = request.Points,
                DisplayOrder = request.DisplayOrder,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await dbContext.Questions.AddAsync(question, ct);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Created($"/api/questions/{question.Id}", question.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}

