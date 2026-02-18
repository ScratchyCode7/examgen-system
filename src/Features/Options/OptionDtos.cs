namespace Databank.Features.Options;

public sealed record OptionRequest(
    int QuestionId,
    string Content,
    bool IsCorrect,
    int DisplayOrder
);

public sealed record OptionResponse(
    int Id,
    int QuestionId,
    string Content,
    bool IsCorrect,
    int DisplayOrder
);
