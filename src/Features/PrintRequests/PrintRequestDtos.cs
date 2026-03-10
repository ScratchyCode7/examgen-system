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
    int CopiesRequested
);

public sealed record CreatePrintRequestRequest(
    int TestId,
    string? Notes,
    int CopiesRequested
);

public sealed record UpdateStatusRequest(
    string Status,
    string? Notes
);
