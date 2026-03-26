using Microsoft.Extensions.Hosting;

namespace Databank.Services;

public sealed class SearchIndexWarmupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SearchIndexWarmupService> _logger;

    public SearchIndexWarmupService(
        IServiceProvider serviceProvider,
        ILogger<SearchIndexWarmupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var searchService = scope.ServiceProvider.GetRequiredService<ISearchService>();
            await searchService.RebuildIndexAsync(stoppingToken);
            _logger.LogInformation("Search index warmup completed.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Search index warmup failed. Search will lazily rebuild on first query.");
        }
    }
}
