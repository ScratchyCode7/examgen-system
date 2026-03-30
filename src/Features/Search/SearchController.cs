using Databank.Database;
using Databank.Features.Questions;
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
    private readonly AppDbContext _dbContext;

    public SearchController(ISearchService searchService, AppDbContext dbContext)
    {
        _searchService = searchService;
        _dbContext = dbContext;
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

        var currentUserId = QuestionPermissionResolver.GetCurrentUserId(User);
        if (!currentUserId.HasValue || response.Results.Count == 0)
        {
            return Ok(response);
        }

        var questionIds = response.Results.Select(r => r.Id).Distinct().ToList();
        var permissionsByQuestionId = await QuestionPermissionResolver.ResolvePermissionsForUserAsync(
            _dbContext,
            currentUserId.Value,
            questionIds,
            ct);

        var permissionAwareResults = response.Results
            .Select(item =>
            {
                permissionsByQuestionId.TryGetValue(item.Id, out var permission);
                var canEdit = permission.CanEdit;
                var canDelete = permission.CanDelete;

                return item with
                {
                    CanEdit = canEdit,
                    CanDelete = canDelete
                };
            })
            .ToList();

        return Ok(response with { Results = permissionAwareResults });
    }
}
