namespace Databank.Features.Subjects.EditRequests;

public sealed record CreateSubjectEditRequest(
    string? Message
);

public sealed record ResolveSubjectEditRequest(
    bool Approve,
    bool CanDelete,
    string? Note
);

public sealed record RevokeSubjectEditPermission(
    string? Note
);

public sealed record SubjectEditRequestResponse(
    long RequestId,
    int SubjectId,
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