using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.TestResults.Create;

public sealed class CreateTestResultEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/test-results", async Task<IResult> (
                TestResultRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var userExists = await dbContext.Users.AnyAsync(u => u.UserId == request.UserId, ct);
            var testExists = await dbContext.Tests.AnyAsync(t => t.Id == request.TestId, ct);

            if (!userExists || !testExists)
            {
                return TypedResults.BadRequest("User or test not found.");
            }

            var result = new TestResult
            {
                UserId = request.UserId,
                TestId = request.TestId,
                Score = request.Score,
                CorrectAnswers = request.CorrectAnswers,
                TotalQuestions = request.TotalQuestions,
                Duration = request.Duration,
                CompletedAt = request.CompletedAt ?? DateTime.UtcNow
            };

            await dbContext.TestResults.AddAsync(result, ct);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Created($"/api/test-results/{result.Id}", result.ToResponse());
        }).RequireAuthorization();
    }
}

