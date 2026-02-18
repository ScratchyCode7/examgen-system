using Databank.Entities;

namespace Databank.Features.Questions;

public static class QuestionMappings
{
    public static QuestionResponse ToResponse(this Question question)
    {
        return new QuestionResponse(
            question.Id,
            question.TopicId,
            question.Content,
            question.QuestionType,
            question.BloomLevel,
            question.Points,
            question.DisplayOrder,
            question.IsActive
        );
    }
}

