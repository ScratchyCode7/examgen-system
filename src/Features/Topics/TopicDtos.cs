using Databank.Entities;

namespace Databank.Features.Topics;

public sealed record TopicResponse(
    int Id,
    int SubjectId,
    string Title,
    string? Description,
    int SequenceOrder,
    decimal AllocatedHours,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public sealed record CreateTopicRequest(
    int SubjectId,
    string Title,
    string? Description,
    int SequenceOrder,
    decimal AllocatedHours
);

public sealed record UpdateTopicRequest(
    string Title,
    string? Description,
    int? SequenceOrder,
    decimal? AllocatedHours,
    bool? IsActive
);

public static class TopicMappings
{
    public static TopicResponse ToResponse(this Topic topic)
    {
        return new TopicResponse(
            topic.Id,
            topic.SubjectId,
            topic.Title,
            topic.Description,
            topic.SequenceOrder,
            topic.AllocatedHours,
            topic.IsActive,
            topic.CreatedAt,
            topic.UpdatedAt
        );
    }
}
