using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Questions;
using Databank.Features.Topics;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Questions.List;

public sealed class GetQuestionsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/questions", async Task<IResult> (
                int? topicId,
                int? subjectId,
            int? courseId,
            int? departmentId,
                string? search,
                BloomLevel? bloomLevel,
                string? bloomGroup,
                int pageNumber = 1,
                int pageSize = 10,
                AppDbContext dbContext = null!,
                HttpContext httpContext = null!,
                CancellationToken ct = default) =>
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            
            IQueryable<Question> query = dbContext.Questions
                .AsNoTrackingWithIdentityResolution()
                .AsSplitQuery()
                .Include(q => q.Options)
                .Include(q => q.CreatedByUser)
                .Include(q => q.QuestionImage);

            if (topicId.HasValue)
            {
                query = query.Where(q => q.TopicId == topicId.Value);
            }

            if (subjectId.HasValue)
            {
                query = query.Where(q => q.Topic.SubjectId == subjectId.Value);
            }

            if (courseId.HasValue)
            {
                query = query.Where(q => q.Topic.Subject.CourseId == courseId.Value);
            }

            if (departmentId.HasValue)
            {
                query = query.Where(q => q.Topic.Subject.Course.DepartmentId == departmentId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(q => q.Content.Contains(search));
            }

            if (bloomLevel.HasValue)
            {
                query = query.Where(q => q.BloomLevel == bloomLevel.Value);
            }
            else if (!string.IsNullOrWhiteSpace(bloomGroup))
            {
                var normalizedGroup = bloomGroup.Trim();
                if (string.Equals(normalizedGroup, "RememberUnderstand", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(q => q.BloomLevel == BloomLevel.Remember || q.BloomLevel == BloomLevel.Understand);
                }
                else if (string.Equals(normalizedGroup, "ApplyAnalyze", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(q => q.BloomLevel == BloomLevel.Apply || q.BloomLevel == BloomLevel.Analyze);
                }
                else if (string.Equals(normalizedGroup, "EvaluateCreate", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(q => q.BloomLevel == BloomLevel.Evaluate || q.BloomLevel == BloomLevel.Create);
                }
            }

            query = query.Where(q => q.IsActive);

            Dictionary<int, (bool CanEdit, bool CanDelete)> permissionsByQuestionId = new();
            var currentUserId = QuestionPermissionResolver.GetCurrentUserId(httpContext.User);
            if (!currentUserId.HasValue)
            {
                return TypedResults.Problem("Unable to determine current user.", statusCode: StatusCodes.Status401Unauthorized);
            }

            var candidateTopicIds = await query
                .Select(q => q.TopicId)
                .Distinct()
                .ToListAsync(ct);

            if (candidateTopicIds.Count > 0)
            {
                var accessibleTopicIds = await TopicPermissionResolver.ResolveViewAccessForUserAsync(
                    dbContext,
                    currentUserId.Value,
                    candidateTopicIds,
                    ct);

                if (accessibleTopicIds.Count == 0)
                {
                    var emptyResponse = new PagedResponse<QuestionResponse>
                    {
                        Items = new List<QuestionResponse>(),
                        PageNumber = pagination.PageNumber,
                        PageSize = pagination.PageSize,
                        TotalCount = 0
                    };

                    return TypedResults.Ok(emptyResponse);
                }

                query = query.Where(q => accessibleTopicIds.Contains(q.TopicId));
            }

            var totalCount = await query.CountAsync(ct);

            var questionEntities = await query
                .OrderBy(q => q.TopicId)
                .ThenBy(q => q.DisplayOrder)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .ToListAsync(ct);

            if (questionEntities.Count > 0)
            {
                permissionsByQuestionId = await QuestionPermissionResolver.ResolvePermissionsForUserAsync(
                    dbContext,
                    currentUserId.Value,
                    questionEntities.Select(q => q.Id).ToList(),
                    ct);
            }

            var questions = questionEntities
                .Select(q =>
                {
                    permissionsByQuestionId.TryGetValue(q.Id, out var perms);
                    return q.ToResponse(perms.CanEdit, perms.CanDelete);
                })
                .ToList();

            var response = new PagedResponse<QuestionResponse>
            {
                Items = questions,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize,
                TotalCount = totalCount
            };

            return TypedResults.Ok(response);
        }).RequireAuthorization();
    }
}

