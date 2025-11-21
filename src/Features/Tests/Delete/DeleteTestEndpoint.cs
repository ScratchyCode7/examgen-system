using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Tests.Delete;

public sealed class DeleteTestEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/tests/{id:int}", async Task<IResult> (int id, AppDbContext dbContext, CancellationToken ct) =>
        {
            var test = await dbContext.Tests.FirstOrDefaultAsync(t => t.Id == id, ct);
            if (test is null)
            {
                return TypedResults.NotFound();
            }

            dbContext.Tests.Remove(test);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.NoContent();
        }).RequireAuthorization("AdminOnly");
    }
}

