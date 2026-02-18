using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Options.Delete;

public sealed class DeleteOptionEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/options/{id}", async Task<IResult> (
                int id,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var option = await dbContext.Options.FirstOrDefaultAsync(o => o.Id == id, ct);
            if (option is null)
            {
                return TypedResults.NotFound();
            }

            dbContext.Options.Remove(option);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.NoContent();
        }).RequireAuthorization("AdminOnly");
    }
}
