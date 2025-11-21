using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.TestResults.Update;

public sealed class UpdateTestResultEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/test-results/{id:int}", async Task<IResult> (
                int id,
                TestResultRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var result = await dbContext.TestResults.FirstOrDefaultAsync(r => r.Id == id, ct);
            if (result is null)
            {
                return TypedResults.NotFound();
            }

            var userExists = await dbContext.Users.AnyAsync(u => u.UserId == request.UserId, ct);
            var testExists = await dbContext.Tests.AnyAsync(t => t.Id == request.TestId, ct);

            if (!userExists || !testExists)
            {
                return TypedResults.BadRequest("User or test not found.");
            }

            result.UserId = request.UserId;
            result.TestId = request.TestId;
            result.Score = request.Score;
            result.CorrectAnswers = request.CorrectAnswers;
            result.TotalQuestions = request.TotalQuestions;
            result.Duration = request.Duration;
            result.CompletedAt = request.CompletedAt ?? result.CompletedAt;

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(result.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}

