using System.Text;
using System.Text.Json;
using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Services;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Tests.Save;

public sealed class SaveGeneratedExamEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/tests/save-generated", async Task<IResult> (
                SaveGeneratedExamRequest request,
                AppDbContext dbContext,
                ILoggingService loggingService,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            if (request.Questions is null || request.Questions.Count == 0)
            {
                return TypedResults.BadRequest("At least one question must be provided.");
            }

            var subject = await dbContext.Subjects
                .Include(s => s.Course)
                    .ThenInclude(c => c.Department)
                .FirstOrDefaultAsync(s => s.Id == request.SubjectId, ct);

            if (subject is null)
            {
                return TypedResults.BadRequest("Subject not found.");
            }

            if (subject.CourseId != request.CourseId)
            {
                return TypedResults.BadRequest("Subject does not belong to the selected course.");
            }

            if (subject.Course?.DepartmentId != request.DepartmentId)
            {
                return TypedResults.BadRequest("Course does not belong to the selected department.");
            }

            var questionIds = request.Questions.Select(q => q.QuestionId).ToList();
            var questions = await dbContext.Questions
                .Include(q => q.Topic)
                .Include(q => q.Options)
                .Where(q => questionIds.Contains(q.Id))
                .ToListAsync(ct);

            if (questions.Count != questionIds.Count)
            {
                return TypedResults.BadRequest("One or more questions could not be found.");
            }

            var invalidQuestion = questions.FirstOrDefault(q => q.Topic?.SubjectId != request.SubjectId);
            if (invalidQuestion != null)
            {
                return TypedResults.BadRequest("All questions must belong to the selected subject before saving.");
            }

            var signature = TestSignatureHelper.BuildSignature(
                request.Questions.Select(q => (q.QuestionId, q.DisplayOrder)));

            var duplicateExists = await dbContext.Tests.AnyAsync(t =>
                t.SubjectId == request.SubjectId &&
                t.ExamType == request.ExamType &&
                t.Semester == request.Semester &&
                t.SchoolYear == request.SchoolYear &&
                t.QuestionSignature == signature,
                ct);

            if (duplicateExists)
            {
                return TypedResults.Conflict("This generated exam has already been saved. Generate a new set to create another saved exam.");
            }

            var existingSetCount = await dbContext.Tests.CountAsync(t =>
                t.SubjectId == request.SubjectId &&
                t.ExamType == request.ExamType &&
                t.Semester == request.Semester &&
                t.SchoolYear == request.SchoolYear,
                ct);

            var setLabel = BuildSetLabel(existingSetCount);

            var test = new Test
            {
                SubjectId = request.SubjectId,
                CourseId = request.CourseId,
                DepartmentId = request.DepartmentId,
                Title = $"{subject.Code} {request.ExamType} {setLabel}".Trim(),
                Description = request.Description ?? $"{request.ExamType} - {request.Semester} {request.SchoolYear} ({setLabel})",
                DurationMinutes = request.DurationMinutes,
                TotalQuestions = request.Questions.Count,
                TotalPoints = request.TotalPoints,
                ExamType = request.ExamType,
                Semester = request.Semester,
                SchoolYear = request.SchoolYear,
                SetLabel = setLabel,
                SpecificationSnapshot = request.SpecificationSnapshot,
                GenerationNotes = request.GenerationNotes,
                QuestionSignature = signature,
                IsPublished = false,
                AvailableFrom = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await dbContext.Tests.AddAsync(test, ct);
            await dbContext.SaveChangesAsync(ct);

            var questionLookup = questions.ToDictionary(q => q.Id);
            var orderedRequestQuestions = request.Questions
                .OrderBy(q => q.DisplayOrder)
                .ToList();

            var testQuestions = new List<TestQuestion>(orderedRequestQuestions.Count);
            foreach (var requestQuestion in orderedRequestQuestions)
            {
                if (!questionLookup.TryGetValue(requestQuestion.QuestionId, out var questionEntity))
                {
                    return TypedResults.BadRequest($"Question {requestQuestion.QuestionId} could not be resolved.");
                }

                var snapshotResult = BuildOptionSnapshot(questionEntity, requestQuestion);
                if (!snapshotResult.Success)
                {
                    return TypedResults.BadRequest(snapshotResult.ErrorMessage);
                }

                testQuestions.Add(new TestQuestion
                {
                    TestId = test.Id,
                    QuestionId = requestQuestion.QuestionId,
                    DisplayOrder = requestQuestion.DisplayOrder,
                    OptionSnapshotJson = snapshotResult.Json
                });
            }

            await dbContext.TestQuestions.AddRangeAsync(testQuestions, ct);
            await dbContext.SaveChangesAsync(ct);

            // Log activity
            var userId = httpContext.User.FindFirst("sub")?.Value ?? httpContext.User.FindFirst("userId")?.Value;
            await loggingService.LogActivityAsync(userId, "Tests", "Saved", "Test", test.Id,
                $"Saved generated exam: {test.Title} ({request.Questions.Count} questions, {request.ExamType} {request.Semester} {request.SchoolYear})");

            return TypedResults.Created($"/api/tests/{test.Id}", test.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }

    private static string BuildSetLabel(int index)
    {
        index = Math.Max(index, 0);
        index += 1;
        var sb = new StringBuilder();
        while (index > 0)
        {
            index--;
            sb.Insert(0, (char)('A' + (index % 26)));
            index /= 26;
        }

        return $"Set {sb}";
    }

    private static (bool Success, string Json, string? ErrorMessage) BuildOptionSnapshot(Question question, SaveGeneratedExamQuestionDto dto)
    {
        var options = question.Options?.OrderBy(o => o.DisplayOrder).ToList() ?? new List<Option>();
        if (options.Count == 0)
        {
            return (true, "[]", null);
        }

        if (dto.Options is null || dto.Options.Count == 0)
        {
            var fallback = options
                .Select(o => new OptionSnapshotDto(o.Id, o.DisplayOrder))
                .ToList();
            return (true, JsonSerializer.Serialize(fallback), null);
        }

        var validOptionIds = options.Select(o => o.Id).ToHashSet();
        var seen = new HashSet<int>();
        var snapshotItems = new List<OptionSnapshotDto>(dto.Options.Count);

        foreach (var optionDto in dto.Options.OrderBy(o => o.DisplayOrder))
        {
            if (!validOptionIds.Contains(optionDto.OptionId))
            {
                return (false, string.Empty, $"Option {optionDto.OptionId} does not belong to question {question.Id}.");
            }

            if (!seen.Add(optionDto.OptionId))
            {
                return (false, string.Empty, $"Option {optionDto.OptionId} is duplicated for question {question.Id}.");
            }

            snapshotItems.Add(new OptionSnapshotDto(optionDto.OptionId, optionDto.DisplayOrder));
        }

        if (snapshotItems.Count != options.Count)
        {
            return (false, string.Empty, $"All options must be included when saving question {question.Id}.");
        }

        return (true, JsonSerializer.Serialize(snapshotItems), null);
    }

    private sealed record OptionSnapshotDto(int OptionId, int DisplayOrder);
}
