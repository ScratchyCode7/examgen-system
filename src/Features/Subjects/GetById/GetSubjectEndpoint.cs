using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Subjects.GetById;

public sealed class GetSubjectEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/subjects/{id:int}", async Task<IResult> (int id, AppDbContext dbContext, CancellationToken ct) =>
        {
            var subject = await dbContext.Subjects.AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id, ct);

            return subject is null
                ? TypedResults.NotFound()
                : TypedResults.Ok(subject.ToResponse());
        }).RequireAuthorization();
    }
}

