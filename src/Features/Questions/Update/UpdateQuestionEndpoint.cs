using Databank.Abstract;
using Databank.Database;
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
                CancellationToken ct) =>
        {
            var question = await dbContext.Questions.FirstOrDefaultAsync(q => q.Id == id, ct);
            if (question is null)
            {
                return TypedResults.NotFound();
            }

            var testExists = await dbContext.Tests.AnyAsync(t => t.Id == request.TestId, ct);
            if (!testExists)
            {
                return TypedResults.BadRequest("Test not found.");
            }

            question.TestId = request.TestId;
            question.Content = request.Content;
            question.Type = request.Type;
            question.Points = request.Points;
            question.DisplayOrder = request.DisplayOrder;

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(question.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}

