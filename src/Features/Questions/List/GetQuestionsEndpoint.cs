using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Questions.List;

public sealed class GetQuestionsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/questions", async Task<IResult> (
                int? testId,
                int? subjectId,
                string? search,
                QuestionDifficulty? difficulty,
                string? category,
                int pageNumber = 1,
                int pageSize = 10,
                AppDbContext dbContext = null!,
                CancellationToken ct = default) =>
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            var query = dbContext.Questions.AsNoTracking();

            if (testId.HasValue)
            {
                query = query.Where(q => q.TestId == testId.Value);
            }

            if (subjectId.HasValue)
            {
                query = query.Where(q => q.Test.SubjectId == subjectId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(q => q.Content.Contains(search));
            }

            if (difficulty.HasValue)
            {
                query = query.Where(q => q.Difficulty == difficulty.Value);
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(q => q.Category != null && q.Category.Contains(category));
            }

            var totalCount = await query.CountAsync(ct);

            var questions = await query
                .OrderBy(q => q.TestId)
                .ThenBy(q => q.DisplayOrder)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .Select(q => q.ToResponse())
                .ToListAsync(ct);

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

