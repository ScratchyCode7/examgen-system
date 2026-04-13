using Databank.Database;
using Databank.Features.Questions;
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
    private readonly IDepartmentAccessService _departmentAccessService;

    public SearchController(
        ISearchService searchService,
        AppDbContext dbContext,
        IDepartmentAccessService departmentAccessService)
    {
        _searchService = searchService;
        _dbContext = dbContext;
        _departmentAccessService = departmentAccessService;
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

        var allowedDepartmentIds = await _departmentAccessService.GetUserDepartmentIdsAsync(currentUserId.Value, ct);
        if (allowedDepartmentIds.Length == 0)
        {
            return Ok(response with
            {
                Results = new List<SearchResultItem>(),
                TotalCount = 0,
                SimilarCount = 0
            });
        }

        var allowedDepartmentIdSet = allowedDepartmentIds.ToHashSet();
        var questionIds = response.Results.Select(r => r.Id).Distinct().ToList();
        var departmentByQuestionId = await _dbContext.Questions
            .AsNoTracking()
            .Where(q => questionIds.Contains(q.Id))
            .Select(q => new
            {
                q.Id,
                DepartmentId = q.Topic.Subject.Course.DepartmentId
            })
            .ToDictionaryAsync(x => x.Id, x => x.DepartmentId, ct);

        var departmentScopedResults = response.Results
            .Where(item =>
                departmentByQuestionId.TryGetValue(item.Id, out var departmentId) &&
                allowedDepartmentIdSet.Contains(departmentId))
            .ToList();

        if (departmentScopedResults.Count == 0)
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
            departmentScopedResults.Select(r => r.Id).ToList(),
            ct);

        var permissionAwareResults = departmentScopedResults
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
