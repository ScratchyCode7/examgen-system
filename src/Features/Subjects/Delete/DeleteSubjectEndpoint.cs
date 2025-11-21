using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Subjects.Delete;

public sealed class DeleteSubjectEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/subjects/{id:int}", async Task<IResult> (int id, AppDbContext dbContext, CancellationToken ct) =>
        {
            var subject = await dbContext.Subjects.FirstOrDefaultAsync(s => s.Id == id, ct);
            if (subject is null)
            {
                return TypedResults.NotFound();
            }

            dbContext.Subjects.Remove(subject);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.NoContent();
        }).RequireAuthorization("AdminOnly");
    }
}

