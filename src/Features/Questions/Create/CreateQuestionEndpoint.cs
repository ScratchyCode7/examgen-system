using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Options;
using Databank.Features.Questions;
using Databank.Services;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Questions.Create;

public sealed class CreateQuestionEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/questions", async Task<IResult> (
                QuestionRequest request,
                AppDbContext dbContext,
                ISearchService searchService,
                ILogger<CreateQuestionEndpoint> logger,
                ILoggingService loggingService,
                HttpContext httpContext,
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

            var questionContent = TextInputSanitizer.SanitizeRichTextHtml(request.Content);
            var questionTextOnly = TextInputSanitizer.NormalizeToPlainText(questionContent);
            if (string.IsNullOrWhiteSpace(questionTextOnly))
            {
                logger.LogWarning("Question content was empty after sanitization for TopicId: {TopicId}", request.TopicId);
                return TypedResults.BadRequest("Question content is required.");
            }

            var question = new Question
            {
                TopicId = request.TopicId,
                CreatedByUserId = QuestionPermissionResolver.GetCurrentUserId(httpContext.User),
                Content = questionContent,
                QuestionType = request.QuestionType,
                BloomLevel = request.BloomLevel,
                Points = request.Points,
                DisplayOrder = request.DisplayOrder,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var firstImageMetadata = ExtractFirstImageMetadata(request.Content, request.Options);
            if (firstImageMetadata is not null)
            {
                var (src, widthPercentage, alignment) = firstImageMetadata.Value;
                var isDataUrl = src.StartsWith("data:", StringComparison.OrdinalIgnoreCase);

                question.QuestionImage = new QuestionImage
                {
                    ImagePath = isDataUrl ? "inline/data-url" : src,
                    ImageData = isDataUrl ? src : null,
                    WidthPercentage = widthPercentage,
                    Alignment = alignment,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
            }

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
                var options = new List<Option>(request.Options.Count);
                foreach (var opt in request.Options)
                {
                    var optionContent = TextInputSanitizer.SanitizeRichTextHtml(opt.Content);
                    var optionTextOnly = TextInputSanitizer.NormalizeToPlainText(optionContent);
                    var optionHasImage = optionContent.Contains("<img", StringComparison.OrdinalIgnoreCase);
                    if (string.IsNullOrWhiteSpace(optionTextOnly) && !optionHasImage)
                    {
                        return TypedResults.BadRequest("Answer choices must not be empty.");
                    }

                    options.Add(new Option
                    {
                        QuestionId = question.Id,
                        Content = optionContent,
                        IsCorrect = opt.IsCorrect,
                        DisplayOrder = opt.DisplayOrder
                    });
                }

                await dbContext.Options.AddRangeAsync(options, ct);
                await dbContext.SaveChangesAsync(ct);
            }

            try
            {
                await searchService.IndexQuestionAsync(question.Id, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Question {QuestionId} saved but search index update failed.", question.Id);
            }

            // Reload question with options for response
            var createdQuestion = await dbContext.Questions
                .Include(q => q.Options)
                .FirstAsync(q => q.Id == question.Id, ct);

            // Log activity
            var userId = QuestionPermissionResolver.GetCurrentUserId(httpContext.User)?.ToString();
            await loggingService.LogActivityAsync(userId, "Questions", "Created", "Question", question.Id, 
                $"Created question: {questionTextOnly.Substring(0, Math.Min(50, questionTextOnly.Length))}...");

            return TypedResults.Created($"/api/questions/{question.Id}", createdQuestion.ToResponse());
        }).RequireAuthorization(); // Allow all authenticated users (teachers and admins)
    }

    private static (string Src, int WidthPercentage, string Alignment)? ExtractFirstImageMetadata(
        string questionContent,
        IReadOnlyList<OptionRequest>? options)
    {
        var questionImages = HtmlImageExtractor.ExtractImageMetadata(questionContent);
        if (questionImages.Count > 0)
        {
            return questionImages[0];
        }

        if (options is null)
        {
            return null;
        }

        foreach (var option in options)
        {
            var optionImages = HtmlImageExtractor.ExtractImageMetadata(option.Content);
            if (optionImages.Count > 0)
            {
                return optionImages[0];
            }
        }

        return null;
    }
}



