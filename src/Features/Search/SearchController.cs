using Databank.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Databank.Features.Search;

[ApiController]
[Authorize]
[Route("api/search")]
public sealed class SearchController : ControllerBase
{
    private readonly ISearchService _searchService;

    public SearchController(ISearchService searchService)
    {
        _searchService = searchService;
    }

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string q,
        [FromQuery] string? subject,
        [FromQuery] string? topic,
        [FromQuery] string? bloomLevel,
        [FromQuery] string? questionType,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return BadRequest(new { message = "Query parameter 'q' is required." });
        }

        var filters = new SearchFilters(subject, topic, bloomLevel, questionType);
        var response = await _searchService.SearchAsync(q, filters, ct);
        return Ok(response);
    }
}
