using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Options;
using Databank.Features.Questions;
using Databank.Features.Topics;
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
                .Include(q => q.CreatedByUser)
                .Include(q => q.QuestionImage)
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

            var isAdmin = await dbContext.Users
                .AsNoTracking()
                .AnyAsync(u => u.UserId == requesterId.Value && u.IsAdmin, ct);

            var permission = await QuestionPermissionResolver.ResolvePermissionsForUserAsync(
                dbContext,
                requesterId.Value,
                new[] { id },
                ct);

            var hasResolvedPermissions = permission.TryGetValue(id, out var perms);
            var canEdit = hasResolvedPermissions && perms.CanEdit;
            if (!canEdit)
            {
                return TypedResults.Problem(
                    "You do not have permission to edit this question. Request edit permission from the owner.",
                    statusCode: StatusCodes.Status403Forbidden);
            }
            var canDelete = hasResolvedPermissions && perms.CanDelete;

            var topicExists = await dbContext.Topics.AnyAsync(t => t.Id == request.TopicId, ct);
            if (!topicExists)
            {
                return TypedResults.BadRequest("Topic not found.");
            }

            if (!isAdmin)
            {
                var viewableTopics = await TopicPermissionResolver.ResolveViewAccessForUserAsync(
                    dbContext,
                    requesterId.Value,
                    new[] { request.TopicId },
                    ct);

                if (!viewableTopics.Contains(request.TopicId))
                {
                    return TypedResults.Problem(
                        "You do not have access to this topic.",
                        statusCode: StatusCodes.Status403Forbidden);
                }
            }

            var sanitizedContent = TextInputSanitizer.SanitizeRichTextHtml(request.Content);
            var textOnlyContent = TextInputSanitizer.NormalizeToPlainText(sanitizedContent);
            if (string.IsNullOrWhiteSpace(textOnlyContent))
            {
                return TypedResults.BadRequest("Question content is required.");
            }

            var normalizedIncomingQuestion = DuplicateKeyNormalizer.NormalizeQuestionHtml(sanitizedContent);
            var existingQuestionContents = await dbContext.Questions
                .AsNoTracking()
                .Where(q => q.TopicId == request.TopicId && q.Id != id)
                .Select(q => q.Content)
                .ToListAsync(ct);

            var duplicateExists = existingQuestionContents.Any(content =>
                DuplicateKeyNormalizer.NormalizeQuestionHtml(content) == normalizedIncomingQuestion);

            if (duplicateExists)
            {
                return TypedResults.Conflict("Duplicate question detected in this topic.");
            }

            question.TopicId = request.TopicId;
            question.Content = sanitizedContent;
            question.QuestionType = request.QuestionType;
            question.BloomLevel = request.BloomLevel;
            question.Points = request.Points;
            question.DisplayOrder = request.DisplayOrder;
            question.UpdatedAt = DateTime.UtcNow;

            var firstImageMetadata = ExtractFirstImageMetadata(request.Content, request.Options);
            if (firstImageMetadata is not null)
            {
                var (src, widthPercentage, alignment) = firstImageMetadata.Value;
                var isDataUrl = src.StartsWith("data:", StringComparison.OrdinalIgnoreCase);

                if (question.QuestionImage is null)
                {
                    question.QuestionImage = new QuestionImage
                    {
                        QuestionId = question.Id,
                        ImagePath = isDataUrl ? "inline/data-url" : src,
                        ImageData = isDataUrl ? src : null,
                        WidthPercentage = widthPercentage,
                        Alignment = alignment,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                }
                else
                {
                    question.QuestionImage.ImagePath = isDataUrl ? "inline/data-url" : src;
                    question.QuestionImage.ImageData = isDataUrl ? src : null;
                    question.QuestionImage.WidthPercentage = widthPercentage;
                    question.QuestionImage.Alignment = alignment;
                    question.QuestionImage.UpdatedAt = DateTime.UtcNow;
                }
            }

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

            return TypedResults.Ok(question.ToResponse(canEdit: canEdit, canDelete: canDelete));
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

