using Databank.Entities;
using Databank.Features.Options;

namespace Databank.Features.Questions;

public sealed record QuestionRequest(
    int TopicId,
    string Content,
    string QuestionType,
    BloomLevel BloomLevel,
    int Points,
    int DisplayOrder,
    List<OptionRequest>? Options = null
);

public sealed record QuestionImageDto(
    int Id,
    string ImagePath,
    int WidthPercentage,
    string Alignment
);

public sealed record QuestionResponse(
    int Id,
    int TopicId,
    string Content,
    string QuestionType,
    BloomLevel BloomLevel,
    int Points,
    int DisplayOrder,
    bool IsActive,
    List<OptionResponse>? Options = null,
    QuestionImageDto? Image = null
);

