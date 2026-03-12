using Databank.Entities;
using Databank.Features.Options;

namespace Databank.Features.Questions;

public static class QuestionMappings
{
    public static QuestionResponse ToResponse(this Question question)
    {
        QuestionImageDto? imageDto = null;
        if (question.QuestionImage != null)
        {
            imageDto = new QuestionImageDto(
                question.QuestionImage.Id,
                question.QuestionImage.ImagePath,
                question.QuestionImage.WidthPercentage,
                question.QuestionImage.Alignment
            );
        }

        return new QuestionResponse(
            question.Id,
            question.TopicId,
            question.Content,
            question.QuestionType,
            question.BloomLevel,
            question.Points,
            question.DisplayOrder,
            question.IsActive,
            question.Options?.Select(o => o.ToResponse()).ToList(),
            imageDto
        );
    }
}


