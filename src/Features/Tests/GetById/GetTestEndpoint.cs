using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Tests.GetById;

public sealed class GetTestEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tests/{id:int}", async Task<IResult> (int id, AppDbContext dbContext, CancellationToken ct) =>
        {
            var test = await dbContext.Tests.AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id, ct);

            return test is null
                ? TypedResults.NotFound()
                : TypedResults.Ok(test.ToResponse());
        }).RequireAuthorization();
    }
}

