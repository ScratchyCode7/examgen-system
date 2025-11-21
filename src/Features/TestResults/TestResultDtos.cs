namespace Databank.Features.TestResults;

public sealed record TestResultRequest(
    Guid UserId,
    int TestId,
    double Score,
    int CorrectAnswers,
    int TotalQuestions,
    TimeSpan Duration,
    DateTime? CompletedAt
);

public sealed record TestResultResponse(
    int Id,
    Guid UserId,
    int TestId,
    double Score,
    int CorrectAnswers,
    int TotalQuestions,
    TimeSpan Duration,
    DateTime CompletedAt
);

