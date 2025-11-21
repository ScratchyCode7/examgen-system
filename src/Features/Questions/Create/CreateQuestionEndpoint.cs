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
                CancellationToken ct) =>
        {
            var testExists = await dbContext.Tests.AnyAsync(t => t.Id == request.TestId, ct);
            if (!testExists)
            {
                return TypedResults.BadRequest("Test not found.");
            }

            var question = new Question
            {
                TestId = request.TestId,
                Content = request.Content,
                Type = request.Type,
                Points = request.Points,
                DisplayOrder = request.DisplayOrder
            };

            await dbContext.Questions.AddAsync(question, ct);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Created($"/api/questions/{question.Id}", question.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}

