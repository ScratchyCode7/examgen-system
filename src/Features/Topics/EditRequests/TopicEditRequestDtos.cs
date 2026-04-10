namespace Databank.Features.Topics.EditRequests;

public sealed record CreateTopicEditRequest(
    string? Message
);

public sealed record ResolveTopicEditRequest(
    bool Approve,
    bool CanDelete,
    string? Note
);

public sealed record RevokeTopicEditPermission(
    string? Note
);

public sealed record TopicEditRequestResponse(
    long RequestId,
    int TopicId,
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