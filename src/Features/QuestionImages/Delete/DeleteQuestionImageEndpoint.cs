using Databank.Abstract;
using Databank.Database;
using Databank.Services;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.QuestionImages.Delete;

public sealed class DeleteQuestionImageEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/questions/{questionId}/image", HandleAsync)
            .RequireAuthorization()
            .WithTags("QuestionImages");
    }

    private async Task<IResult> HandleAsync(
        int questionId,
        AppDbContext db,
        IFileStorageService fileStorage,
        ILogger<DeleteQuestionImageEndpoint> logger)
    {
        var questionImage = await db.QuestionImages
            .FirstOrDefaultAsync(qi => qi.QuestionId == questionId);

        if (questionImage == null)
        {
            return Results.NotFound(new { message = "No image found for this question" });
        }

        try
        {
            // Delete file from storage
            await fileStorage.DeleteFileAsync(questionImage.ImagePath);

            // Delete from database
            db.QuestionImages.Remove(questionImage);
            await db.SaveChangesAsync();

            logger.LogInformation("Image deleted for question {QuestionId}", questionId);

            return Results.Ok(new { message = "Image deleted successfully" });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete image for question {QuestionId}", questionId);
            return Results.Problem("Failed to delete image. Please try again.");
        }
    }
}
