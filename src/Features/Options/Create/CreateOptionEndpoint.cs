using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Options.Create;

public sealed class CreateOptionEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/options", async Task<IResult> (
                OptionRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            // Validate question exists
            var questionExists = await dbContext.Questions.AnyAsync(q => q.Id == request.QuestionId, ct);
            if (!questionExists)
            {
                return TypedResults.BadRequest("Question not found.");
            }

            var option = new Option
            {
                QuestionId = request.QuestionId,
                Content = request.Content,
                IsCorrect = request.IsCorrect,
                DisplayOrder = request.DisplayOrder
            };

            await dbContext.Options.AddAsync(option, ct);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Created($"/api/options/{option.Id}", option.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}
