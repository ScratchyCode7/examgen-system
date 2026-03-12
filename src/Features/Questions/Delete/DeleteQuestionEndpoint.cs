using Databank.Abstract;
using Databank.Database;
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
                ILoggingService loggingService,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var question = await dbContext.Questions.FirstOrDefaultAsync(q => q.Id == id, ct);
            if (question is null)
            {
                return TypedResults.NotFound();
            }

            var questionContent = question.Content;
            
            dbContext.Questions.Remove(question);
            await dbContext.SaveChangesAsync(ct);

            // Log activity
            var userId = httpContext.User.FindFirst("sub")?.Value ?? httpContext.User.FindFirst("userId")?.Value;
            await loggingService.LogActivityAsync(userId, "Questions", "Deleted", "Question", id,
                $"Deleted question: {questionContent?.Substring(0, Math.Min(50, questionContent?.Length ?? 0))}...");

            return TypedResults.NoContent();
        }).RequireAuthorization("AdminOnly");
    }
}

