using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Questions;
using Databank.Services;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Questions.Update;

public sealed class UpdateQuestionEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/questions/{id:int}", async Task<IResult> (
                int id,
                QuestionRequest request,
                AppDbContext dbContext,
                ISearchService searchService,
                ILogger<UpdateQuestionEndpoint> logger,
                ILoggingService loggingService,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var question = await dbContext.Questions
                .Include(q => q.Options)
                .FirstOrDefaultAsync(q => q.Id == id, ct);
            if (question is null)
            {
                return TypedResults.NotFound();
            }

            var requesterId = QuestionPermissionResolver.GetCurrentUserId(httpContext.User);
            if (!requesterId.HasValue)
            {
                return TypedResults.Problem("Unable to determine the current user.", statusCode: StatusCodes.Status401Unauthorized);
            }

            var permission = await QuestionPermissionResolver.ResolvePermissionsForUserAsync(
                dbContext,
                requesterId.Value,
                new[] { id },
                ct);

            var canEdit = permission.TryGetValue(id, out var perms) && perms.CanEdit;
            if (!canEdit)
            {
                return TypedResults.Problem(
                    "You do not have permission to edit this question. Request edit permission from the owner.",
                    statusCode: StatusCodes.Status403Forbidden);
            }

            var topicExists = await dbContext.Topics.AnyAsync(t => t.Id == request.TopicId, ct);
            if (!topicExists)
            {
                return TypedResults.BadRequest("Topic not found.");
            }

            var sanitizedContent = TextInputSanitizer.SanitizeRichTextHtml(request.Content);
            var textOnlyContent = TextInputSanitizer.NormalizeToPlainText(sanitizedContent);
            if (string.IsNullOrWhiteSpace(textOnlyContent))
            {
                return TypedResults.BadRequest("Question content is required.");
            }

            question.TopicId = request.TopicId;
            question.Content = sanitizedContent;
            question.QuestionType = request.QuestionType;
            question.BloomLevel = request.BloomLevel;
            question.Points = request.Points;
            question.DisplayOrder = request.DisplayOrder;
            question.UpdatedAt = DateTime.UtcNow;

            if (request.Options is not null)
            {
                var existingOptionsByOrder = question.Options
                    .ToDictionary(o => o.DisplayOrder, o => o);

                var incomingOrders = new HashSet<int>();

                foreach (var opt in request.Options)
                {
                    incomingOrders.Add(opt.DisplayOrder);

                    var optionContent = TextInputSanitizer.SanitizeRichTextHtml(opt.Content);
                    var optionTextOnly = TextInputSanitizer.NormalizeToPlainText(optionContent);
                    var optionHasImage = optionContent.Contains("<img", StringComparison.OrdinalIgnoreCase);
                    if (string.IsNullOrWhiteSpace(optionTextOnly) && !optionHasImage)
                    {
                        return TypedResults.BadRequest("Answer choices must not be empty.");
                    }

                    if (existingOptionsByOrder.TryGetValue(opt.DisplayOrder, out var existingOption))
                    {
                        existingOption.Content = optionContent;
                        existingOption.IsCorrect = opt.IsCorrect;
                        existingOption.DisplayOrder = opt.DisplayOrder;
                    }
                    else
                    {
                        var newOption = new Option
                        {
                            QuestionId = question.Id,
                            Content = optionContent,
                            IsCorrect = opt.IsCorrect,
                            DisplayOrder = opt.DisplayOrder
                        };
                        dbContext.Options.Add(newOption);
                        question.Options.Add(newOption);
                    }
                }

                var optionsToRemove = question.Options
                    .Where(o => !incomingOrders.Contains(o.DisplayOrder))
                    .ToList();

                if (optionsToRemove.Count > 0)
                {
                    dbContext.Options.RemoveRange(optionsToRemove);
                }
            }

            await dbContext.SaveChangesAsync(ct);

            try
            {
                await searchService.IndexQuestionAsync(question.Id, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Question {QuestionId} updated but search index update failed.", question.Id);
            }

            // Log activity
            await loggingService.LogActivityAsync(requesterId.Value.ToString(), "Questions", "Updated", "Question", question.Id,
                $"Updated question: {textOnlyContent.Substring(0, Math.Min(50, textOnlyContent.Length))}...");

            return TypedResults.Ok(question.ToResponse());
        }).RequireAuthorization(); // Allow all authenticated users (teachers and admins)
    }
}

