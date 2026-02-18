using Databank.Entities;

namespace Databank.Features.Options;

public static class OptionMappings
{
    public static OptionResponse ToResponse(this Option option)
    {
        return new OptionResponse(
            option.Id,
            option.QuestionId,
            option.Content,
            option.IsCorrect,
            option.DisplayOrder
        );
    }
}
