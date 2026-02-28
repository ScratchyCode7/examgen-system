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
                ILogger<CreateQuestionEndpoint> logger,
                CancellationToken ct) =>
        {
            logger.LogInformation("Creating question for TopicId: {TopicId}, BloomLevel: {BloomLevel}, Type: {QuestionType}", 
                request.TopicId, request.BloomLevel, request.QuestionType);
            logger.LogInformation("Content: {Content}", request.Content?.Substring(0, Math.Min(50, request.Content?.Length ?? 0)));
            
            var topicExists = await dbContext.Topics.AnyAsync(t => t.Id == request.TopicId, ct);
            if (!topicExists)
            {
                logger.LogWarning("Topic {TopicId} not found", request.TopicId);
                return TypedResults.BadRequest("Topic not found.");
            }

            logger.LogInformation("Topic {TopicId} exists, creating question...", request.TopicId);

            if (string.IsNullOrWhiteSpace(request.Content))
            {
                logger.LogWarning("Question content missing for TopicId: {TopicId}", request.TopicId);
                return TypedResults.BadRequest("Question content is required.");
            }

            var questionContent = request.Content.Trim();

            var question = new Question
            {
                TopicId = request.TopicId,
                Content = questionContent,
                QuestionType = request.QuestionType,
                BloomLevel = request.BloomLevel,
                Points = request.Points,
                DisplayOrder = request.DisplayOrder,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            try
            {
                await dbContext.Questions.AddAsync(question, ct);
                await dbContext.SaveChangesAsync(ct);
                logger.LogInformation("Question saved with ID: {QuestionId}", question.Id);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to save question. TopicId: {TopicId}, BloomLevel: {BloomLevel}", 
                    request.TopicId, request.BloomLevel);
                throw;
            }

            // Save options if provided
            if (request.Options?.Count > 0)
            {
                var options = request.Options.Select(opt => new Option
                {
                    QuestionId = question.Id,
                    Content = opt.Content,
                    IsCorrect = opt.IsCorrect,
                    DisplayOrder = opt.DisplayOrder
                }).ToList();

                await dbContext.Options.AddRangeAsync(options, ct);
                await dbContext.SaveChangesAsync(ct);
            }

            // Reload question with options for response
            var createdQuestion = await dbContext.Questions
                .Include(q => q.Options)
                .FirstAsync(q => q.Id == question.Id, ct);

            return TypedResults.Created($"/api/questions/{question.Id}", createdQuestion.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}



