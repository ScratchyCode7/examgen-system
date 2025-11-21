namespace Databank.Features.Subjects;

public sealed record SubjectRequest(string Name, string? Description);

public sealed record SubjectResponse(
    int Id,
    string Name,
    string? Description,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

