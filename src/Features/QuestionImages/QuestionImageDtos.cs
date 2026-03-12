using Databank.Entities;

namespace Databank.Features.QuestionImages;

public sealed record QuestionImageRequest(
    int QuestionId,
    int WidthPercentage,
    string Alignment
);

public sealed record QuestionImageResponse(
    int Id,
    int QuestionId,
    string ImagePath,
    int WidthPercentage,
    string Alignment
);

// Mappings
public static class QuestionImageMappings
{
    public static QuestionImageResponse ToResponse(this QuestionImage image)
    {
        return new QuestionImageResponse(
            image.Id,
            image.QuestionId,
            image.ImagePath,
            image.WidthPercentage,
            image.Alignment
        );
    }
}
