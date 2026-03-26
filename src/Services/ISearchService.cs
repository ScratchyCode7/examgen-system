using Databank.Features.Search;

namespace Databank.Services;

public interface ISearchService
{
    Task RebuildIndexAsync(CancellationToken ct = default);
    Task IndexQuestionAsync(int questionId, CancellationToken ct = default);
    Task RemoveQuestionAsync(int questionId, CancellationToken ct = default);
    Task<SearchResponse> SearchAsync(string query, SearchFilters filters, CancellationToken ct = default);
}
