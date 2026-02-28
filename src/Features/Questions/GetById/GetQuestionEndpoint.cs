using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Questions.GetById;

public sealed class GetQuestionEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/questions/{id:int}", async Task<IResult> (int id, AppDbContext dbContext, CancellationToken ct) =>
        {
            var question = await dbContext.Questions
                .AsNoTracking()
                .Include(q => q.Options)
                .FirstOrDefaultAsync(q => q.Id == id, ct);

            return question is null
                ? TypedResults.NotFound()
                : TypedResults.Ok(question.ToResponse());
        }).RequireAuthorization();
    }
}

