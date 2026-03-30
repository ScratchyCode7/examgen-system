using Databank.Abstract;
using Databank.Database;
using Databank.Features.Questions;
using Databank.Services;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Questions.Delete;

public sealed class DeleteQuestionEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/questions/{id:int}", async Task<IResult> (
                int id, 
                AppDbContext dbContext, 
                ISearchService searchService,
                ILogger<DeleteQuestionEndpoint> logger,
                ILoggingService loggingService,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var question = await dbContext.Questions.FirstOrDefaultAsync(q => q.Id == id, ct);
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

            var canDelete = permission.TryGetValue(id, out var perms) && perms.CanDelete;
            if (!canDelete)
            {
                return TypedResults.Problem(
                    "You do not have permission to delete this question. Request delete permission from the owner.",
                    statusCode: StatusCodes.Status403Forbidden);
            }

            var questionContent = question.Content;
            
            dbContext.Questions.Remove(question);
            await dbContext.SaveChangesAsync(ct);

            try
            {
                await searchService.RemoveQuestionAsync(id, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Question {QuestionId} deleted but search index cleanup failed.", id);
            }

            // Log activity
            await loggingService.LogActivityAsync(requesterId.Value.ToString(), "Questions", "Deleted", "Question", id,
                $"Deleted question: {questionContent?.Substring(0, Math.Min(50, questionContent?.Length ?? 0))}...");

            return TypedResults.NoContent();
        }).RequireAuthorization();
    }
}

