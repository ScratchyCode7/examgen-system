using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Databank.Features.PrintRequests.GetMasterSet;

public sealed class GetMasterSetEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/printrequests/{id:guid}/masterset", async (
                Guid id,
                AppDbContext db,
                CancellationToken ct) =>
        {
            var printRequest = await db.PrintRequests
                .Include(pr => pr.Test)
                    .ThenInclude(t => t.Subject)
                .Include(pr => pr.Test)
                    .ThenInclude(t => t.Course)
                .Include(pr => pr.Test)
                    .ThenInclude(t => t.Department)
                .Include(pr => pr.Test)
                    .ThenInclude(t => t.TestQuestions)
                        .ThenInclude(tq => tq.Question)
                            .ThenInclude(q => q.Topic)
                .Include(pr => pr.Test)
                    .ThenInclude(t => t.TestQuestions)
                        .ThenInclude(tq => tq.Question)
                            .ThenInclude(q => q.Options)
                .Include(pr => pr.RequestedBy)
                .FirstOrDefaultAsync(pr => pr.PrintRequestId == id, ct);

            if (printRequest is null)
            {
                return Results.NotFound(new { error = "Print request not found" });
            }

            var test = printRequest.Test;

            // Build Master Set data structure
            var masterSet = new
            {
                printRequest = new
                {
                    id = printRequest.PrintRequestId,
                    requestedBy = printRequest.RequestedBy?.FirstName + " " + printRequest.RequestedBy?.LastName,
                    department = test.Department?.Name,
                    copiesRequested = printRequest.CopiesRequested,
                    notes = printRequest.Notes
                },
                testInfo = new
                {
                    id = test.Id,
                    title = test.Title,
                    description = test.Description,
                    subject = test.Subject.Name,
                    course = test.Course?.Name,
                    department = test.Department?.Name,
                    examType = test.ExamType,
                    semester = test.Semester,
                    schoolYear = test.SchoolYear,
                    setLabel = test.SetLabel,
                    durationMinutes = test.DurationMinutes,
                    totalQuestions = test.TotalQuestions,
                    totalPoints = test.TotalPoints,
                    specificationSnapshot = test.SpecificationSnapshot
                },
                questions = test.TestQuestions
                    .OrderBy(tq => tq.DisplayOrder)
                    .Select(tq => new
                    {
                        displayOrder = tq.DisplayOrder,
                        questionText = tq.Question.Content,
                        topic = tq.Question.Topic?.Title,
                        bloomLevel = tq.Question.BloomLevel,
                        questionType = tq.Question.QuestionType,
                        points = tq.Question.Points,
                        options = OrderOptionsBySnapshot(tq)
                            .Select((o, idx) => new
                            {
                                optionText = o.Content,
                                isCorrect = o.IsCorrect,
                                displayOrder = idx
                            })
                            .ToList()
                    })
                    .ToList()
            };

            return Results.Ok(masterSet);
        })
        .RequireAuthorization("AdminOnly")
        .WithTags("PrintRequests");
    }

    private static IReadOnlyList<Option> OrderOptionsBySnapshot(TestQuestion testQuestion)
    {
        var options = testQuestion.Question.Options?.ToList() ?? new List<Option>();
        if (options.Count == 0)
        {
            return options;
        }

        if (string.IsNullOrWhiteSpace(testQuestion.OptionSnapshotJson))
        {
            return options.OrderBy(o => o.DisplayOrder).ToList();
        }

        try
        {
            var snapshot = JsonSerializer.Deserialize<List<OptionSnapshotDto>>(testQuestion.OptionSnapshotJson);
            if (snapshot is null || snapshot.Count == 0)
            {
                return options.OrderBy(o => o.DisplayOrder).ToList();
            }

            var lookup = options.ToDictionary(o => o.Id);
            var ordered = new List<Option>(options.Count);

            foreach (var entry in snapshot.OrderBy(s => s.DisplayOrder))
            {
                if (lookup.TryGetValue(entry.OptionId, out var option))
                {
                    ordered.Add(option);
                }
            }

            if (ordered.Count < options.Count)
            {
                var orderedIds = ordered.Select(o => o.Id).ToHashSet();
                var remaining = options
                    .Where(o => !orderedIds.Contains(o.Id))
                    .OrderBy(o => o.DisplayOrder);
                ordered.AddRange(remaining);
            }

            return ordered;
        }
        catch (JsonException)
        {
            return options.OrderBy(o => o.DisplayOrder).ToList();
        }
    }

    private sealed record OptionSnapshotDto(int OptionId, int DisplayOrder);
}
