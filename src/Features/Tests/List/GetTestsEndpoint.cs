using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Databank.Features.Tests.List;

public sealed class GetTestsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tests", async Task<IResult> (
                int pageNumber = 1,
                int pageSize = 10,
                int? subjectId = null,
                string? examType = null,
                string? semester = null,
                string? schoolYear = null,
                bool includeDrafts = false,
                HttpContext httpContext = null!,
                AppDbContext dbContext = null!,
                CancellationToken ct = default) =>
        {
            var isAdmin = httpContext.User.HasClaim("isAdmin", "true");
            var userIdValue = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? httpContext.User.FindFirst("sub")?.Value
                ?? httpContext.User.FindFirst("userId")?.Value;
            var hasUserId = Guid.TryParse(userIdValue, out var actingUserId);

            if (!isAdmin && !hasUserId)
            {
                return TypedResults.Unauthorized();
            }

            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
            IQueryable<Test> query = dbContext.Tests
                .AsNoTracking();

            if (!isAdmin)
            {
                query = query.Where(t => t.CreatedByUserId == actingUserId);
            }

            if (!includeDrafts)
            {
                query = query.Where(t => !t.IsDraft);
            }

            if (subjectId.HasValue)
            {
                query = query.Where(t => t.SubjectId == subjectId.Value);
            }

            if (!string.IsNullOrWhiteSpace(examType))
            {
                query = query.Where(t => t.ExamType == examType);
            }

            if (!string.IsNullOrWhiteSpace(semester))
            {
                query = query.Where(t => t.Semester == semester);
            }

            if (!string.IsNullOrWhiteSpace(schoolYear))
            {
                query = query.Where(t => t.SchoolYear == schoolYear);
            }

            var totalCount = await query.CountAsync(ct);

            var tests = await query
                .OrderByDescending(t => t.CreatedAt)
                .Include(t => t.CreatedByUser)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .ToListAsync(ct);

            var testResponses = tests.Select(t => t.ToResponse()).ToList();

            var response = new PagedResponse<TestResponse>
            {
                Items = testResponses,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize,
                TotalCount = totalCount
            };

            return TypedResults.Ok(response);
        }).RequireAuthorization();
    }
}

