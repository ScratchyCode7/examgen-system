using Databank.Database;
using Databank.Features.Questions;
using Databank.Features.Topics;
using Databank.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Search;

[ApiController]
[Authorize]
[Route("api/search")]
public sealed class SearchController : ControllerBase
{
    private readonly ISearchService _searchService;
    private readonly AppDbContext _dbContext;
    public SearchController(
        ISearchService searchService,
        AppDbContext dbContext)
    {
        _searchService = searchService;
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string q,
        [FromQuery] int? courseId,
        [FromQuery] int? subjectId,
        [FromQuery] int? topicId,
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

        var filters = new SearchFilters(courseId, subjectId, topicId, subject, topic, bloomLevel, questionType);
        var response = await _searchService.SearchAsync(q, filters, ct);

        var currentUserId = QuestionPermissionResolver.GetCurrentUserId(User);
        if (!currentUserId.HasValue || response.Results.Count == 0)
        {
            return Ok(response);
        }

        var questionIds = response.Results.Select(r => r.Id).Distinct().ToList();
        var topicByQuestionId = await _dbContext.Questions
            .AsNoTracking()
            .Where(q => questionIds.Contains(q.Id))
            .Select(q => new
            {
                q.Id,
                q.TopicId
            })
            .ToDictionaryAsync(x => x.Id, x => x.TopicId, ct);

        var topicIds = topicByQuestionId.Values.Distinct().ToList();
        if (topicIds.Count == 0)
        {
            return Ok(response with
            {
                Results = new List<SearchResultItem>(),
                TotalCount = 0,
                SimilarCount = 0
            });
        }

        var accessibleTopicIds = await TopicPermissionResolver.ResolveViewAccessForUserAsync(
            _dbContext,
            currentUserId.Value,
            topicIds,
            ct);

        if (accessibleTopicIds.Count == 0)
        {
            return Ok(response with
            {
                Results = new List<SearchResultItem>(),
                TotalCount = 0,
                SimilarCount = 0
            });
        }

        var topicScopedResults = response.Results
            .Where(item =>
                topicByQuestionId.TryGetValue(item.Id, out var topicId) &&
                accessibleTopicIds.Contains(topicId))
            .ToList();

        if (topicScopedResults.Count == 0)
        {
            return Ok(response with
            {
                Results = new List<SearchResultItem>(),
                TotalCount = 0,
                SimilarCount = 0
            });
        }

        var permissionsByQuestionId = await QuestionPermissionResolver.ResolvePermissionsForUserAsync(
            _dbContext,
            currentUserId.Value,
            topicScopedResults.Select(r => r.Id).ToList(),
            ct);

        var permissionAwareResults = topicScopedResults
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

        var similarThreshold = permissionAwareResults.Count > 0
            ? permissionAwareResults.Average(r => r.Score)
            : 0;
        var similarCount = permissionAwareResults.Count(r => r.Score >= similarThreshold && r.Score > 0);

        return Ok(response with
        {
            Results = permissionAwareResults,
            TotalCount = permissionAwareResults.Count,
            SimilarCount = similarCount
        });
    }
}
