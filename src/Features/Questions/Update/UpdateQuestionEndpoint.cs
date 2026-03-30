using Databank.Abstract;
using Databank.Common;
using Databank.Database;
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

