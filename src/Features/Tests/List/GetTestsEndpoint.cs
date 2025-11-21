using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Tests.List;

public sealed class GetTestsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tests", async Task<IResult> (AppDbContext dbContext, CancellationToken ct) =>
        {
            var tests = await dbContext.Tests
                .AsNoTracking()
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => t.ToResponse())
                .ToListAsync(ct);

            return TypedResults.Ok(tests);
        }).RequireAuthorization();
    }
}

