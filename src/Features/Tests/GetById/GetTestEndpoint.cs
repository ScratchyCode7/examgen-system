using System.Linq;
using System.Text.Json;
using System.Security.Claims;
using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Tests;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Tests.GetById;

public sealed class GetTestEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tests/{id:int}", async Task<IResult> (int id, HttpContext httpContext, AppDbContext dbContext, CancellationToken ct) =>
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

            var test = await dbContext.Tests
                .Include(t => t.TestQuestions)
                    .ThenInclude(tq => tq.Question)
                        .ThenInclude(q => q.Options)
                .Include(t => t.TestQuestions)
                    .ThenInclude(tq => tq.Question)
                        .ThenInclude(q => q.QuestionImage)
                .Include(t => t.Subject)
                    .ThenInclude(s => s.Course)
                .Include(t => t.CreatedByUser)
                .FirstOrDefaultAsync(t => t.Id == id, ct);

            if (test is null)
                return TypedResults.NotFound();

            if (!isAdmin)
            {
                var ownsTest = test.CreatedByUserId.HasValue && test.CreatedByUserId.Value == actingUserId;

                var deanDepartmentIds = await dbContext.UserDepartments
                    .AsNoTracking()
                    .Where(ud => ud.UserId == actingUserId && ud.RoleScope == UserDepartment.DeanRoleScope)
                    .Select(ud => ud.DepartmentId)
                    .Distinct()
                    .ToArrayAsync(ct);

                var testDepartmentId = test.DepartmentId ?? test.Subject?.Course?.DepartmentId;
                var isDeanForTestDepartment = testDepartmentId.HasValue && deanDepartmentIds.Contains(testDepartmentId.Value);

                if (!ownsTest && !isDeanForTestDepartment)
                {
                    return TypedResults.Forbid();
                }
            }

            var questionResponses = test.TestQuestions
                .OrderBy(tq => tq.DisplayOrder)
                .Select(tq =>
                {
                    var orderedOptions = OrderOptionsBySnapshot(tq);
                    QuestionImageResponse? image = null;
                    if (tq.Question.QuestionImage != null)
                    {
                        image = new QuestionImageResponse(
                            tq.Question.QuestionImage.Id,
                            tq.Question.QuestionImage.ImagePath,
                            tq.Question.QuestionImage.ImageData,
                            tq.Question.QuestionImage.WidthPercentage,
                            tq.Question.QuestionImage.Alignment);
                    }

                    return new QuestionResponse(
                        tq.Question.Id,
                        tq.Question.Content,
                        (int)tq.Question.BloomLevel,
                        tq.DisplayOrder,
                        orderedOptions
                            .Select((o, idx) => new OptionResponse(o.Option.Id, o.Option.Content, o.IsCorrect, idx))
                            .ToList(),
                        image);
                })
                .ToList();

            var response = test.ToResponse(questionResponses);
            return TypedResults.Ok(response);
        }).RequireAuthorization();
    }

    private static IReadOnlyList<OptionSnapshotView> OrderOptionsBySnapshot(TestQuestion testQuestion)
    {
        var options = testQuestion.Question.Options?.ToList() ?? new List<Option>();
        if (options.Count == 0)
        {
            return new List<OptionSnapshotView>();
        }

        if (string.IsNullOrWhiteSpace(testQuestion.OptionSnapshotJson))
        {
            return options
                .OrderBy(o => o.DisplayOrder)
                .Select(o => new OptionSnapshotView(o, o.IsCorrect))
                .ToList();
        }

        try
        {
            var snapshot = JsonSerializer.Deserialize<List<OptionSnapshotDto>>(testQuestion.OptionSnapshotJson);
            if (snapshot is null || snapshot.Count == 0)
            {
                return options
                    .OrderBy(o => o.DisplayOrder)
                    .Select(o => new OptionSnapshotView(o, o.IsCorrect))
                    .ToList();
            }

            var lookup = options.ToDictionary(o => o.Id);
            var ordered = new List<OptionSnapshotView>(options.Count);

            foreach (var entry in snapshot.OrderBy(s => s.DisplayOrder))
            {
                if (lookup.TryGetValue(entry.OptionId, out var option))
                {
                    ordered.Add(new OptionSnapshotView(option, entry.IsCorrect ?? option.IsCorrect));
                }
            }

            if (ordered.Count < options.Count)
            {
                var orderedIds = ordered.Select(o => o.Option.Id).ToHashSet();
                var remaining = options
                    .Where(o => !orderedIds.Contains(o.Id))
                    .OrderBy(o => o.DisplayOrder);
                ordered.AddRange(remaining.Select(o => new OptionSnapshotView(o, o.IsCorrect)));
            }

            return ordered;
        }
        catch (JsonException)
        {
            return options
                .OrderBy(o => o.DisplayOrder)
                .Select(o => new OptionSnapshotView(o, o.IsCorrect))
                .ToList();
        }
    }

    private sealed record OptionSnapshotDto(int OptionId, int DisplayOrder, bool? IsCorrect = null);
    private sealed record OptionSnapshotView(Option Option, bool IsCorrect);
}

