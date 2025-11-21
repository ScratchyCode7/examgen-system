using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.TestResults.Delete;

public sealed class DeleteTestResultEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/test-results/{id:int}", async Task<IResult> (int id, AppDbContext dbContext, CancellationToken ct) =>
        {
            var result = await dbContext.TestResults.FirstOrDefaultAsync(r => r.Id == id, ct);
            if (result is null)
            {
                return TypedResults.NotFound();
            }

            dbContext.TestResults.Remove(result);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.NoContent();
        }).RequireAuthorization("AdminOnly");
    }
}

