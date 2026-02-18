using Databank.Entities;

namespace Databank.Features.Questions;

public sealed record QuestionRequest(
    int TopicId,
    string Content,
    string QuestionType,
    BloomLevel BloomLevel,
    int Points,
    int DisplayOrder
);

public sealed record QuestionResponse(
    int Id,
    int TopicId,
    string Content,
    string QuestionType,
    BloomLevel BloomLevel,
    int Points,
    int DisplayOrder,
    bool IsActive
);

