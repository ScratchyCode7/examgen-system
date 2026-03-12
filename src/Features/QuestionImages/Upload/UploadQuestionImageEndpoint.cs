using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.QuestionImages.Upload;

public sealed class UploadQuestionImageEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/questions/{questionId}/image", HandleAsync)
            .RequireAuthorization()
            .DisableAntiforgery()
            .WithTags("QuestionImages");
    }

    private async Task<IResult> HandleAsync(
        [FromRoute] int questionId,
        [FromForm] IFormFile file,
        [FromForm] int widthPercentage,
        [FromForm] string alignment,
        [FromServices] AppDbContext db,
        [FromServices] IFileStorageService fileStorage,
        [FromServices] ILoggingService loggingService,
        [FromServices] ILogger<UploadQuestionImageEndpoint> logger,
        HttpContext httpContext)
    {
        // Validate question exists
        var question = await db.Questions
            .Include(q => q.QuestionImage)
            .FirstOrDefaultAsync(q => q.Id == questionId);

        if (question == null)
        {
            return Results.NotFound(new { message = "Question not found" });
        }

        // Validate file
        if (file == null || file.Length == 0)
        {
            return Results.BadRequest(new { message = "No file uploaded" });
        }

        // Validate file type (only images)
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(fileExtension))
        {
            return Results.BadRequest(new { message = "Invalid file type. Only images are allowed." });
        }

        // Validate file size (max 5MB)
        if (file.Length > 5 * 1024 * 1024)
        {
            return Results.BadRequest(new { message = "File size exceeds 5MB limit" });
        }

        // Validate width percentage
        if (widthPercentage < 10 || widthPercentage > 100)
        {
            return Results.BadRequest(new { message = "Width percentage must be between 10 and 100" });
        }

        // Validate alignment
        var validAlignments = new[] { "Left", "Center", "Right" };
        if (!validAlignments.Contains(alignment))
        {
            return Results.BadRequest(new { message = "Alignment must be Left, Center, or Right" });
        }

        try
        {
            // Delete old image if exists
            if (question.QuestionImage != null)
            {
                await fileStorage.DeleteFileAsync(question.QuestionImage.ImagePath);
                db.QuestionImages.Remove(question.QuestionImage);
            }

            // Save new file
            await using var stream = file.OpenReadStream();
            var imagePath = await fileStorage.SaveFileAsync(stream, file.FileName, "questions");

            // Create new question image record
            var questionImage = new QuestionImage
            {
                QuestionId = questionId,
                ImagePath = imagePath,
                WidthPercentage = widthPercentage,
                Alignment = alignment,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            db.QuestionImages.Add(questionImage);
            await db.SaveChangesAsync();

            logger.LogInformation("Image uploaded for question {QuestionId}: {ImagePath}", questionId, imagePath);

            // Log activity
            var userId = httpContext.User.FindFirst("sub")?.Value ?? httpContext.User.FindFirst("userId")?.Value;
            await loggingService.LogActivityAsync(userId, "Questions", "Image Uploaded", "Question", questionId,
                $"Uploaded image: {file.FileName} (Width: {widthPercentage}%, Alignment: {alignment})");

            return Results.Ok(questionImage.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to upload image for question {QuestionId}", questionId);
            return Results.Problem("Failed to upload image. Please try again.");
        }
    }
}
