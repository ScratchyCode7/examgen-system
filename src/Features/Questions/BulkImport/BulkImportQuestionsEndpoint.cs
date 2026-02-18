using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Questions.BulkImport;

public sealed class BulkImportQuestionsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/questions/bulk", async Task<IResult> (
                BulkImportRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            if (request.Questions == null || !request.Questions.Any())
            {
                return TypedResults.BadRequest("No questions provided.");
            }

            var topicExists = await dbContext.Topics.AnyAsync(t => t.Id == request.TopicId, ct);
            if (!topicExists)
            {
                return TypedResults.BadRequest("Topic not found.");
            }

            var errors = new List<string>();
            var questionsToAdd = new List<Question>();

            foreach (var (questionDto, index) in request.Questions.Select((q, i) => (q, i)))
            {
                // Validate question has at least one correct option
                var hasCorrectOption = questionDto.Options?.Any(o => o.IsCorrect) ?? false;
                if (!hasCorrectOption)
                {
                    errors.Add($"Question {index + 1}: Must have at least one correct option.");
                    continue;
                }

                // Validate at least one option exists
                if (questionDto.Options == null || !questionDto.Options.Any())
                {
                    errors.Add($"Question {index + 1}: Must have at least one option.");
                    continue;
                }

                var question = new Question
                {
                    TopicId = request.TopicId,
                    Content = questionDto.Content,
                    QuestionType = questionDto.QuestionType ?? "MultipleChoice",
                    BloomLevel = questionDto.BloomLevel,
                    Points = questionDto.Points,
                    DisplayOrder = questionDto.DisplayOrder,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                questionsToAdd.Add(question);
            }

            if (errors.Any())
            {
                return TypedResults.BadRequest(new { errors });
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync(ct);
            try
            {
                await dbContext.Questions.AddRangeAsync(questionsToAdd, ct);
                await dbContext.SaveChangesAsync(ct);

                // Add options for each question (after questions are saved and have IDs)
                var optionsToAdd = new List<Option>();
                var questionIndex = 0;
                foreach (var questionDto in request.Questions)
                {
                    var question = questionsToAdd[questionIndex];
                    if (questionDto.Options != null)
                    {
                        foreach (var optionDto in questionDto.Options)
                        {
                            optionsToAdd.Add(new Option
                            {
                                QuestionId = question.Id,
                                Content = optionDto.Content,
                                IsCorrect = optionDto.IsCorrect,
                                DisplayOrder = optionDto.DisplayOrder
                            });
                        }
                    }
                    questionIndex++;
                }

                await dbContext.Options.AddRangeAsync(optionsToAdd, ct);
                await dbContext.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                return TypedResults.Ok(new { 
                    message = $"Successfully imported {questionsToAdd.Count} questions.",
                    count = questionsToAdd.Count 
                });
            }
            catch
            {
                await transaction.RollbackAsync(ct);
                throw;
            }
        }).RequireAuthorization("AdminOnly");
    }
}

public sealed record BulkImportRequest(
    int TopicId,
    List<BulkQuestionDto> Questions
);

public sealed record BulkQuestionDto(
    string Content,
    string? QuestionType,
    BloomLevel BloomLevel,
    int Points,
    int DisplayOrder,
    List<BulkOptionDto>? Options
);

public sealed record BulkOptionDto(
    string Content,
    bool IsCorrect,
    int DisplayOrder
);

