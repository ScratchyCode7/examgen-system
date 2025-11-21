using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.TestResults.List;

public sealed class GetTestResultsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/test-results", async Task<IResult> (
                Guid? userId,
                int? testId,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var query = dbContext.TestResults.AsNoTracking();

            if (userId.HasValue)
            {
                query = query.Where(r => r.UserId == userId.Value);
            }

            if (testId.HasValue)
            {
                query = query.Where(r => r.TestId == testId.Value);
            }

            var results = await query
                .OrderByDescending(r => r.CompletedAt)
                .Select(r => r.ToResponse())
                .ToListAsync(ct);

            return TypedResults.Ok(results);
        }).RequireAuthorization();
    }
}

