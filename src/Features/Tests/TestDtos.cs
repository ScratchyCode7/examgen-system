namespace Databank.Features.Tests;

public sealed record TestRequest(
    int SubjectId,
    string Title,
    string? Description,
    int DurationMinutes,
    bool IsPublished,
    DateTime? AvailableFrom
);

public sealed record TestResponse(
    int Id,
    int SubjectId,
    string Title,
    string? Description,
    int DurationMinutes,
    bool IsPublished,
    DateTime AvailableFrom,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

