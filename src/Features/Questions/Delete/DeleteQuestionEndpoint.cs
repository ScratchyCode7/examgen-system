using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Questions.Delete;

public sealed class DeleteQuestionEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/questions/{id:int}", async Task<IResult> (int id, AppDbContext dbContext, CancellationToken ct) =>
        {
            var question = await dbContext.Questions.FirstOrDefaultAsync(q => q.Id == id, ct);
            if (question is null)
            {
                return TypedResults.NotFound();
            }

            dbContext.Questions.Remove(question);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.NoContent();
        }).RequireAuthorization("AdminOnly");
    }
}

