using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.QuestionImages.Get;

public sealed class GetQuestionImageEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/questions/{questionId}/image", HandleAsync)
            .RequireAuthorization()
            .WithTags("QuestionImages");
    }

    private async Task<IResult> HandleAsync(
        int questionId,
        AppDbContext db)
    {
        var questionImage = await db.QuestionImages
            .FirstOrDefaultAsync(qi => qi.QuestionId == questionId);

        if (questionImage == null)
        {
            return Results.NotFound(new { message = "No image found for this question" });
        }

        return Results.Ok(questionImage.ToResponse());
    }
}
