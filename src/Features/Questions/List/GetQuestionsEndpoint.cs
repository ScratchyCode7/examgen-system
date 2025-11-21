using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Questions.List;

public sealed class GetQuestionsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/questions", async Task<IResult> (int? testId, AppDbContext dbContext, CancellationToken ct) =>
        {
            var query = dbContext.Questions.AsNoTracking();

            if (testId.HasValue)
            {
                query = query.Where(q => q.TestId == testId.Value);
            }

            var questions = await query
                .OrderBy(q => q.TestId)
                .ThenBy(q => q.DisplayOrder)
                .Select(q => q.ToResponse())
                .ToListAsync(ct);

            return TypedResults.Ok(questions);
        }).RequireAuthorization();
    }
}

