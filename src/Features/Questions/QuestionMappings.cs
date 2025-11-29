using Databank.Entities;

namespace Databank.Features.Questions;

public static class QuestionMappings
{
    public static QuestionResponse ToResponse(this Question question)
    {
        return new QuestionResponse(
            question.Id,
            question.TestId,
            question.Content,
            question.Type,
            question.Points,
            question.DisplayOrder,
            question.Difficulty,
            question.Category
        );
    }
}

