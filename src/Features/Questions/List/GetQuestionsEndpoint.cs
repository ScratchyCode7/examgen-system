using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Questions;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Questions.List;

public sealed class GetQuestionsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/questions", async Task<IResult> (
                int? topicId,
                int? subjectId,
                string? search,
                BloomLevel? bloomLevel,
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

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(q => q.Content.Contains(search));
            }

            if (bloomLevel.HasValue)
            {
                query = query.Where(q => q.BloomLevel == bloomLevel.Value);
            }

            query = query.Where(q => q.IsActive);

            var totalCount = await query.CountAsync(ct);

            var questionEntities = await query
                .OrderBy(q => q.TopicId)
                .ThenBy(q => q.DisplayOrder)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .ToListAsync(ct);

            Dictionary<int, (bool CanEdit, bool CanDelete)> permissionsByQuestionId = new();
            var currentUserId = QuestionPermissionResolver.GetCurrentUserId(httpContext.User);
            if (currentUserId.HasValue && questionEntities.Count > 0)
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

