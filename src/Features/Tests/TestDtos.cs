namespace Databank.Features.Tests;

public sealed record TestRequest(
    int SubjectId,
    string Title,
    string? Description,
    int DurationMinutes,
    bool IsPublished,
    DateTime? AvailableFrom
);

public sealed record SaveGeneratedExamRequest(
    int DepartmentId,
    int CourseId,
    int SubjectId,
    string ExamType,
    string Semester,
    string SchoolYear,
    int DurationMinutes,
    int TotalPoints,
    List<SaveGeneratedExamQuestionDto> Questions,
    string? SpecificationSnapshot,
    string? GenerationNotes,
    string? Description
);

public sealed record SaveGeneratedExamQuestionDto(
    int QuestionId,
    int DisplayOrder,
    List<SaveGeneratedExamOptionDto>? Options = null
);

public sealed record SaveGeneratedExamOptionDto(
    int OptionId,
    int DisplayOrder
);

public sealed record TestResponse(
    int Id,
    int SubjectId,
    int? CourseId,
    int? DepartmentId,
    string Title,
    string? Description,
    string ExamType,
    string Semester,
    string SchoolYear,
    string SetLabel,
    int DurationMinutes,
    int TotalQuestions,
    int TotalPoints,
    bool IsPublished,
    DateTime AvailableFrom,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? SpecificationSnapshot,
    string QuestionSignature,
    List<QuestionResponse>? Questions = null
);

public sealed record OptionResponse(
    int Id,
    string Content,
    bool IsCorrect,
    int DisplayOrder
);

public sealed record QuestionResponse(
    int Id,
    string Content,
    int BloomLevel,
    int DisplayOrder,
    List<OptionResponse> Options
);

