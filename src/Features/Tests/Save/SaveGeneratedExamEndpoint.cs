using System.Text;
using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Tests.Save;

public sealed class SaveGeneratedExamEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/tests/save-generated", async Task<IResult> (
                SaveGeneratedExamRequest request,
                AppDbContext dbContext,
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

            var testQuestions = request.Questions
                .OrderBy(q => q.DisplayOrder)
                .Select(q => new TestQuestion
                {
                    TestId = test.Id,
                    QuestionId = q.QuestionId,
                    DisplayOrder = q.DisplayOrder
                })
                .ToList();

            await dbContext.TestQuestions.AddRangeAsync(testQuestions, ct);
            await dbContext.SaveChangesAsync(ct);

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
}
