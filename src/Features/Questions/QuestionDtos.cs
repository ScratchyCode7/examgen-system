namespace Databank.Features.Questions;

public sealed record QuestionRequest(
    int TestId,
    string Content,
    string Type,
    int Points,
    int DisplayOrder
);

public sealed record QuestionResponse(
    int Id,
    int TestId,
    string Content,
    string Type,
    int Points,
    int DisplayOrder
);

