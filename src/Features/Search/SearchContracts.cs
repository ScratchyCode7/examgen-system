using Databank.Entities;
using Databank.Features.Options;

namespace Databank.Features.Search;

public sealed record SearchFilters(
    string? Subject,
    string? Topic,
    string? BloomLevel,
    string? QuestionType
);

public sealed record SearchResultItem(
    int Id,
    int TopicId,
    string Content,
    string QuestionType,
    BloomLevel BloomLevel,
    int Points,
    int DisplayOrder,
    bool IsActive,
    string Subject,
    string Topic,
    float Score,
    List<OptionResponse>? Options,
    bool CanEdit = false,
    bool CanDelete = false
);

public sealed record SearchResponse(
    List<SearchResultItem> Results,
    int TotalCount,
    long ExecutionTime,
    int SimilarCount
);
