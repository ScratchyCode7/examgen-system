using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.TestResults.GetById;

public sealed class GetTestResultEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/test-results/{id:int}", async Task<IResult> (int id, AppDbContext dbContext, CancellationToken ct) =>
        {
            var result = await dbContext.TestResults.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id, ct);

            return result is null
                ? TypedResults.NotFound()
                : TypedResults.Ok(result.ToResponse());
        }).RequireAuthorization();
    }
}

