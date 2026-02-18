using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Options.GetById;

public sealed class GetOptionEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/options/{id}", async Task<IResult> (
                int id,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var option = await dbContext.Options
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == id, ct);

            if (option is null)
            {
                return TypedResults.NotFound();
            }

            return TypedResults.Ok(option.ToResponse());
        }).RequireAuthorization();
    }
}
