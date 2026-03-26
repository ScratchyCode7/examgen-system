using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Tests;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace Databank.Features.PrintRequests.Submit;

public sealed class SubmitPrintRequestEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/printrequests", async (
                CreatePrintRequestRequest request,
                HttpContext httpContext,
                AppDbContext db,
                CancellationToken ct) =>
        {
            var userIdClaim = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? httpContext.User.FindFirst("sub")?.Value
                ?? httpContext.User.FindFirst("userId")?.Value;

            if (!Guid.TryParse(userIdClaim, out var userId))
            {
                return Results.BadRequest(new { error = "Unable to determine the current user. Please sign in again." });
            }

            if (request.CopiesRequested <= 0)
            {
                return Results.BadRequest(new { error = "Copies requested must be at least 1." });
            }

            Test? test;
            var isDraftRequest = request.IsDraft || request.ExamData is not null;

            if (request.ExamData is not null)
            {
                var examData = request.ExamData;

                if (examData.Questions is null || examData.Questions.Count == 0)
                {
                    return Results.BadRequest(new { error = "Exam data must include at least one question." });
                }

                test = await UpsertDraftTestAsync(examData, userId, db, ct);
                if (test is null)
                {
                    return Results.BadRequest(new { error = "Unable to build draft exam from provided data." });
                }
            }
            else
            {
                if (!request.TestId.HasValue)
                {
                    return Results.BadRequest(new { error = "Either testId or examData must be provided." });
                }

                test = await db.Tests
                    .Include(t => t.Subject)
                    .Include(t => t.Course)
                    .Include(t => t.Department)
                    .Include(t => t.TestQuestions)
                        .ThenInclude(tq => tq.Question)
                            .ThenInclude(q => q.Options)
                    .Include(t => t.TestQuestions)
                        .ThenInclude(tq => tq.Question)
                            .ThenInclude(q => q.QuestionImage)
                    .FirstOrDefaultAsync(t => t.Id == request.TestId.Value, ct);

                if (test is null)
                {
                    return Results.NotFound(new { error = "Test not found" });
                }
            }

            if (!test.DepartmentId.HasValue)
            {
                return Results.BadRequest(new { error = "Test must be associated with a department" });
            }

            var existingRequest = await db.PrintRequests
                .FirstOrDefaultAsync(pr =>
                    pr.TestId == test.Id &&
                    pr.RequestedByUserId == userId &&
                    pr.Status == PrintRequestStatus.Pending,
                    ct);

            if (existingRequest is not null)
            {
                existingRequest.Notes = request.Notes;
                existingRequest.CopiesRequested = request.CopiesRequested;
                existingRequest.IsDraftRequest = isDraftRequest;
                existingRequest.ExamSnapshotJson = BuildExamSnapshotJson(test);

                await db.SaveChangesAsync(ct);

                return Results.Ok(new
                {
                    printRequestId = existingRequest.PrintRequestId,
                    status = "Pending",
                    testId = test.Id,
                    wasUpdated = true,
                    isDraft = existingRequest.IsDraftRequest
                });
            }

            var printRequest = new PrintRequest
            {
                PrintRequestId = Guid.NewGuid(),
                TestId = test.Id,
                RequestedByUserId = userId,
                DepartmentId = test.DepartmentId.Value,
                Status = PrintRequestStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                Notes = request.Notes,
                CopiesRequested = request.CopiesRequested,
                IsDraftRequest = isDraftRequest,
                ExamSnapshotJson = BuildExamSnapshotJson(test)
            };

            db.PrintRequests.Add(printRequest);
            await db.SaveChangesAsync(ct);

            return Results.Created(
                $"/api/printrequests/{printRequest.PrintRequestId}",
                new
                {
                    printRequestId = printRequest.PrintRequestId,
                    status = "Pending",
                    testId = test.Id,
                    isDraft = printRequest.IsDraftRequest
                }
            );
        })
        .RequireAuthorization()
        .WithTags("PrintRequests");
    }

    private static async Task<Test?> UpsertDraftTestAsync(
        PrintRequestExamDraftDto examData,
        Guid userId,
        AppDbContext db,
        CancellationToken ct)
    {
        if (examData.DepartmentId <= 0 || examData.CourseId <= 0 || examData.SubjectId <= 0)
        {
            return null;
        }

        var orderedQuestions = examData.Questions
            .OrderBy(q => q.DisplayOrder)
            .ToList();

        var questionIds = orderedQuestions
            .Select(q => q.QuestionId)
            .Distinct()
            .ToList();

        var questions = await db.Questions
            .Include(q => q.Options)
            .Include(q => q.QuestionImage)
            .Include(q => q.Topic)
            .Where(q => questionIds.Contains(q.Id))
            .ToListAsync(ct);

        if (questions.Count != questionIds.Count)
        {
            return null;
        }

        var invalidQuestion = questions.FirstOrDefault(q => q.Topic.SubjectId != examData.SubjectId);
        if (invalidQuestion is not null)
        {
            return null;
        }

        var signature = TestSignatureHelper.BuildSignature(
            orderedQuestions.Select(q => (q.QuestionId, q.DisplayOrder)));

        var draftSetLabel = "Draft";
        var draftTest = await db.Tests
            .Include(t => t.TestQuestions)
            .FirstOrDefaultAsync(t =>
                t.CreatedByUserId == userId &&
                t.SubjectId == examData.SubjectId &&
                t.CourseId == examData.CourseId &&
                t.DepartmentId == examData.DepartmentId &&
                t.ExamType == examData.ExamType &&
                t.Semester == examData.Semester &&
                t.SchoolYear == examData.SchoolYear &&
                t.SetLabel == draftSetLabel,
                ct);

        if (draftTest is null)
        {
            draftTest = new Test
            {
                SubjectId = examData.SubjectId,
                CourseId = examData.CourseId,
                DepartmentId = examData.DepartmentId,
                CreatedByUserId = userId,
                Title = string.IsNullOrWhiteSpace(examData.Title) ? "Draft Exam" : examData.Title.Trim(),
                Description = examData.Description,
                DurationMinutes = examData.DurationMinutes > 0 ? examData.DurationMinutes : 60,
                TotalQuestions = orderedQuestions.Count,
                TotalPoints = examData.TotalPoints > 0 ? examData.TotalPoints : orderedQuestions.Count,
                ExamType = string.IsNullOrWhiteSpace(examData.ExamType) ? "Custom" : examData.ExamType,
                Semester = examData.Semester ?? string.Empty,
                SchoolYear = examData.SchoolYear ?? string.Empty,
                SetLabel = draftSetLabel,
                QuestionSignature = signature,
                SpecificationSnapshot = examData.SpecificationSnapshot,
                GenerationNotes = examData.GenerationNotes,
                IsDraft = true,
                IsPublished = false,
                AvailableFrom = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await db.Tests.AddAsync(draftTest, ct);
            await db.SaveChangesAsync(ct);
        }
        else
        {
            draftTest.Title = string.IsNullOrWhiteSpace(examData.Title) ? draftTest.Title : examData.Title.Trim();
            draftTest.Description = examData.Description;
            draftTest.DurationMinutes = examData.DurationMinutes > 0 ? examData.DurationMinutes : draftTest.DurationMinutes;
            draftTest.TotalQuestions = orderedQuestions.Count;
            draftTest.TotalPoints = examData.TotalPoints > 0 ? examData.TotalPoints : orderedQuestions.Count;
            draftTest.ExamType = string.IsNullOrWhiteSpace(examData.ExamType) ? draftTest.ExamType : examData.ExamType;
            draftTest.Semester = examData.Semester ?? string.Empty;
            draftTest.SchoolYear = examData.SchoolYear ?? string.Empty;
            draftTest.QuestionSignature = signature;
            draftTest.SpecificationSnapshot = examData.SpecificationSnapshot;
            draftTest.GenerationNotes = examData.GenerationNotes;
            draftTest.IsDraft = true;
            draftTest.UpdatedAt = DateTime.UtcNow;

            if (draftTest.TestQuestions.Count > 0)
            {
                db.TestQuestions.RemoveRange(draftTest.TestQuestions);
                await db.SaveChangesAsync(ct);
            }
        }

        var questionLookup = questions.ToDictionary(q => q.Id);
        var testQuestions = new List<TestQuestion>(orderedQuestions.Count);
        foreach (var q in orderedQuestions)
        {
            if (!questionLookup.TryGetValue(q.QuestionId, out var questionEntity))
            {
                return null;
            }

            var optionSnapshot = BuildOptionSnapshot(questionEntity, q);
            testQuestions.Add(new TestQuestion
            {
                TestId = draftTest.Id,
                QuestionId = q.QuestionId,
                DisplayOrder = q.DisplayOrder,
                OptionSnapshotJson = optionSnapshot
            });
        }

        await db.TestQuestions.AddRangeAsync(testQuestions, ct);
        await db.SaveChangesAsync(ct);

        return await db.Tests
            .Include(t => t.Subject)
            .Include(t => t.Course)
            .Include(t => t.Department)
            .Include(t => t.TestQuestions)
                .ThenInclude(tq => tq.Question)
                    .ThenInclude(q => q.Options)
            .Include(t => t.TestQuestions)
                .ThenInclude(tq => tq.Question)
                    .ThenInclude(q => q.QuestionImage)
            .FirstOrDefaultAsync(t => t.Id == draftTest.Id, ct);
    }

    private static string BuildOptionSnapshot(Question question, PrintRequestExamQuestionDto dto)
    {
        var options = question.Options?.OrderBy(o => o.DisplayOrder).ToList() ?? new List<Option>();
        if (options.Count == 0)
        {
            return "[]";
        }

        if (dto.Options is null || dto.Options.Count == 0)
        {
            return JsonSerializer.Serialize(options.Select(o => new OptionSnapshotDto(o.Id, o.DisplayOrder, o.IsCorrect)));
        }

        var lookup = options.ToDictionary(o => o.Id);
        var ordered = new List<OptionSnapshotDto>();

        foreach (var optionDto in dto.Options.OrderBy(o => o.DisplayOrder))
        {
            if (lookup.TryGetValue(optionDto.OptionId, out var sourceOption))
            {
                var isCorrect = optionDto.IsCorrect ?? sourceOption.IsCorrect;
                ordered.Add(new OptionSnapshotDto(optionDto.OptionId, optionDto.DisplayOrder, isCorrect));
            }
        }

        if (ordered.Count == 0)
        {
            return JsonSerializer.Serialize(options.Select(o => new OptionSnapshotDto(o.Id, o.DisplayOrder, o.IsCorrect)));
        }

        return JsonSerializer.Serialize(ordered);
    }

    private static string BuildExamSnapshotJson(Test test)
    {
        var snapshot = new
        {
            testInfo = new
            {
                id = test.Id,
                title = test.Title,
                description = test.Description,
                subject = test.Subject?.Name,
                course = test.Course?.Name,
                department = test.Department?.Name,
                examType = test.ExamType,
                semester = test.Semester,
                schoolYear = test.SchoolYear,
                setLabel = test.SetLabel,
                durationMinutes = test.DurationMinutes,
                totalQuestions = test.TotalQuestions,
                totalPoints = test.TotalPoints,
                specificationSnapshot = test.SpecificationSnapshot,
                generationNotes = test.GenerationNotes
            },
            questions = test.TestQuestions
                .OrderBy(tq => tq.DisplayOrder)
                .Select(tq => new
                {
                    displayOrder = tq.DisplayOrder,
                    questionId = tq.QuestionId,
                    questionText = tq.Question.Content,
                    topic = tq.Question.Topic?.Title,
                    bloomLevel = tq.Question.BloomLevel,
                    questionType = tq.Question.QuestionType,
                    points = tq.Question.Points,
                    image = tq.Question.QuestionImage == null
                        ? null
                        : new
                        {
                            imagePath = tq.Question.QuestionImage.ImagePath,
                            widthPercentage = tq.Question.QuestionImage.WidthPercentage,
                            alignment = tq.Question.QuestionImage.Alignment
                        },
                    options = OrderOptionsBySnapshot(tq)
                        .Select((o, idx) => new
                        {
                            optionId = o.Option.Id,
                            optionText = o.Option.Content,
                            isCorrect = o.IsCorrect,
                            displayOrder = idx
                        })
                        .ToList()
                })
                .ToList()
        };

        return JsonSerializer.Serialize(snapshot);
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
