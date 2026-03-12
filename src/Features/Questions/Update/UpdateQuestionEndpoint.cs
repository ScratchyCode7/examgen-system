using Databank.Abstract;
using Databank.Database;
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

            var topicExists = await dbContext.Topics.AnyAsync(t => t.Id == request.TopicId, ct);
            if (!topicExists)
            {
                return TypedResults.BadRequest("Topic not found.");
            }

            question.TopicId = request.TopicId;
            question.Content = request.Content;
            question.QuestionType = request.QuestionType;
            question.BloomLevel = request.BloomLevel;
            question.Points = request.Points;
            question.DisplayOrder = request.DisplayOrder;
            question.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(ct);

            // Log activity
            var userId = httpContext.User.FindFirst("sub")?.Value ?? httpContext.User.FindFirst("userId")?.Value;
            await loggingService.LogActivityAsync(userId, "Questions", "Updated", "Question", question.Id,
                $"Updated question: {request.Content?.Substring(0, Math.Min(50, request.Content?.Length ?? 0))}...");

            return TypedResults.Ok(question.ToResponse());
        }).RequireAuthorization(); // Allow all authenticated users (teachers and admins)
    }
}

