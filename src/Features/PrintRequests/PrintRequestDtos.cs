namespace Databank.Features.PrintRequests;

public sealed record PrintRequestResponse(
    Guid PrintRequestId,
    int TestId,
    string TestTitle,
    int DepartmentId,
    string DepartmentName,
    Guid RequestedByUserId,
    string RequestedBy,
    string Status,
    DateTime CreatedAt,
    DateTime? ProcessedAt,
    Guid? ProcessedByUserId,
    string? ProcessedBy,
    string? Notes,
    int CopiesRequested,
    bool IsDraft
);

public sealed record CreatePrintRequestRequest(
    int? TestId,
    string? Notes,
    int CopiesRequested,
    bool IsDraft = false,
    PrintRequestExamDraftDto? ExamData = null
);

public sealed record PrintRequestExamDraftDto(
    int DepartmentId,
    int CourseId,
    int SubjectId,
    string Title,
    string? Description,
    string? Instructions,
    string ExamType,
    string Semester,
    string SchoolYear,
    int DurationMinutes,
    int TotalPoints,
    bool IsExamLeftAligned,
    bool IsQuestionSeparatorEnabled,
    string? SpecificationSnapshot,
    string? GenerationNotes,
    List<PrintRequestExamQuestionDto> Questions
);

public sealed record PrintRequestExamQuestionDto(
    int QuestionId,
    int DisplayOrder,
    string? Content,
    int? BloomLevel,
    int? Points,
    PrintRequestExamImageDto? Image,
    List<PrintRequestExamOptionDto>? Options
);

public sealed record PrintRequestExamOptionDto(
    int OptionId,
    int DisplayOrder,
    string? Content,
    bool? IsCorrect
);

public sealed record PrintRequestExamImageDto(
    string? ImagePath,
    string? ImageData,
    int? WidthPercentage,
    string? Alignment
);

public sealed record UpdateStatusRequest(
    string Status,
    string? Notes
);
