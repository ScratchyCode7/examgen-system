namespace Databank.Features.Questions.EditRequests;

public sealed record CreateQuestionEditRequest(
    string? Message
);

public sealed record ResolveQuestionEditRequest(
    bool Approve,
    bool CanDelete,
    string? Note
);

public sealed record RevokeQuestionEditPermission(
    string? Note
);

public sealed record QuestionEditRequestResponse(
    long RequestId,
    int QuestionId,
    Guid RequesterUserId,
    string RequesterName,
    Guid OwnerUserId,
    string OwnerName,
    string? Message,
    string Status,
    DateTime RequestedAt,
    DateTime? ResolvedAt,
    string? ResolutionNote,
    bool IsMine,
    string PermissionLevel,
    bool CanRevoke
);
