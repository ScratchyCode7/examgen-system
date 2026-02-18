using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Topics.GetById;

public sealed class GetTopicEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/topics/{id:int}", async Task<IResult> (
                int id,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var topic = await dbContext.Topics
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id, ct);

            if (topic is null)
            {
                return TypedResults.NotFound();
            }

            return TypedResults.Ok(topic.ToResponse());
        }).RequireAuthorization();
    }
}
