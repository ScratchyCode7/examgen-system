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

            object testInfo;
            object questions;

            if (!string.IsNullOrWhiteSpace(printRequest.ExamSnapshotJson))
            {
                try
                {
                    using var snapshotDoc = JsonDocument.Parse(printRequest.ExamSnapshotJson);
                    var snapshotRoot = snapshotDoc.RootElement;
                    testInfo = snapshotRoot.TryGetProperty("testInfo", out var testInfoNode)
                        ? JsonSerializer.Deserialize<object>(testInfoNode.GetRawText()) ?? new { }
                        : new { };

                    questions = snapshotRoot.TryGetProperty("questions", out var questionsNode)
                        ? JsonSerializer.Deserialize<object>(questionsNode.GetRawText()) ?? Array.Empty<object>()
                        : Array.Empty<object>();
                }
                catch (JsonException)
                {
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
                    };

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
                                    optionText = o.Option.Content,
                                    isCorrect = o.IsCorrect,
                                    displayOrder = idx
                                })
                                .ToList()
                        })
                        .ToList();
                }
            }
            else
            {
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
                };

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
                                optionText = o.Option.Content,
                                isCorrect = o.IsCorrect,
                                displayOrder = idx
                            })
                            .ToList()
                    })
                    .ToList();
            }

            // Build Master Set data structure
            var masterSet = new
            {
                printRequest = new
                {
                    id = printRequest.PrintRequestId,
                    requestedBy = printRequest.RequestedBy?.FirstName + " " + printRequest.RequestedBy?.LastName,
                    department = test.Department?.Name,
                    copiesRequested = printRequest.CopiesRequested,
                    notes = printRequest.Notes,
                    isDraft = printRequest.IsDraftRequest
                },
                testInfo,
                questions
            };

            return Results.Ok(masterSet);
        })
        .RequireAuthorization("AdminOnly")
        .WithTags("PrintRequests");
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
