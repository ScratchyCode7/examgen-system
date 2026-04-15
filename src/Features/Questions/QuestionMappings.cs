using Databank.Entities;
using Databank.Features.Options;

namespace Databank.Features.Questions;

public static class QuestionMappings
{
    public static QuestionResponse ToResponse(this Question question, bool canEdit = false, bool canDelete = false)
    {
        var createdByName = BuildCreatedByName(question);

        QuestionImageDto? imageDto = null;
        if (question.QuestionImage != null)
        {
            imageDto = new QuestionImageDto(
                question.QuestionImage.Id,
                question.QuestionImage.ImagePath,
                question.QuestionImage.ImageData,
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
            imageDto,
            canEdit,
            canDelete,
            createdByName
        );
    }

    private static string? BuildCreatedByName(Question question)
    {
        var creator = question.CreatedByUser;
        if (creator is null)
        {
            return null;
        }

        var first = creator.FirstName?.Trim();
        var last = creator.LastName?.Trim();
        var fullName = $"{first} {last}".Trim();
        if (!string.IsNullOrWhiteSpace(fullName))
        {
            return fullName;
        }

        return string.IsNullOrWhiteSpace(creator.Username) ? null : creator.Username;
    }
}


