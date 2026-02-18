using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Options.Update;

public sealed class UpdateOptionEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/options/{id}", async Task<IResult> (
                int id,
                OptionRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var option = await dbContext.Options.FirstOrDefaultAsync(o => o.Id == id, ct);
            if (option is null)
            {
                return TypedResults.NotFound();
            }

            // Validate question exists if questionId changed
            if (request.QuestionId != option.QuestionId)
            {
                var questionExists = await dbContext.Questions
                    .AnyAsync(q => q.Id == request.QuestionId, ct);
                if (!questionExists)
                {
                    return TypedResults.BadRequest("Question not found.");
                }
            }

            option.QuestionId = request.QuestionId;
            option.Content = request.Content;
            option.IsCorrect = request.IsCorrect;
            option.DisplayOrder = request.DisplayOrder;

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(option.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}
