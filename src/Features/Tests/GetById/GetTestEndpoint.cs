using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Tests;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Tests.GetById;

public sealed class GetTestEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tests/{id:int}", async Task<IResult> (int id, AppDbContext dbContext, CancellationToken ct) =>
        {
            var test = await dbContext.Tests
                .Include(t => t.TestQuestions)
                    .ThenInclude(tq => tq.Question)
                        .ThenInclude(q => q.Options)
                .Include(t => t.Subject)
                .FirstOrDefaultAsync(t => t.Id == id, ct);

            if (test is null)
                return TypedResults.NotFound();

            var questionResponses = test.TestQuestions
                .OrderBy(tq => tq.DisplayOrder)
                .Select(tq => new QuestionResponse(
                    tq.Question.Id,
                    tq.Question.Content,
                    (int)tq.Question.BloomLevel,
                    tq.DisplayOrder,
                    (tq.Question.Options ?? new List<Option>())
                        .OrderBy(o => o.Id)
                        .Select(o => new OptionResponse(o.Id, o.Content, o.IsCorrect))
                        .ToList()))
                .ToList();

            var response = test.ToResponse(questionResponses);
            return TypedResults.Ok(response);
        }).RequireAuthorization();
    }
}

