using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Tests.Generate;

public sealed class GenerateTestEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/tests/generate", async Task<IResult> (
                GenerateTestRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var subject = await dbContext.Subjects
                .Include(s => s.Course)
                    .ThenInclude(c => c.Department)
                .FirstOrDefaultAsync(s => s.Id == request.SubjectId, ct);
            if (subject is null)
            {
                return TypedResults.BadRequest("Subject not found.");
            }

            // Build query to find questions matching criteria
            var questionQuery = dbContext.Questions.AsNoTracking()
                .Include(q => q.Topic)
                .Where(q => q.Topic.SubjectId == request.SubjectId)
                .Where(q => q.IsActive);

            if (request.BloomLevel.HasValue)
            {
                questionQuery = questionQuery.Where(q => q.BloomLevel == request.BloomLevel.Value);
            }

            // Get available questions
            var availableQuestions = await questionQuery
                .OrderBy(q => Guid.NewGuid()) // Randomize
                .Take(request.QuestionCount * 2) // Get more than needed for selection
                .ToListAsync(ct);

            if (availableQuestions.Count < request.QuestionCount)
            {
                return TypedResults.BadRequest(
                    $"Not enough questions available. Found {availableQuestions.Count}, requested {request.QuestionCount}.");
            }

            // Select random questions
            var selectedQuestions = availableQuestions
                .OrderBy(q => Guid.NewGuid())
                .Take(request.QuestionCount)
                .ToList();

            // Build signature for reproducibility
            var signature = TestSignatureHelper.BuildSignature(selectedQuestions.Select((q, index) => (q.Id, index)));
            var examType = request.ExamType ?? "Generated";
            var semester = request.Semester ?? string.Empty;
            var schoolYear = request.SchoolYear ?? string.Empty;
            var setLabel = request.SetLabel ?? string.Empty;

            // Create the test
            var test = new Test
            {
                SubjectId = request.SubjectId,
                CourseId = subject.CourseId,
                DepartmentId = subject.Course?.DepartmentId,
                Title = request.Title,
                Description = request.Description ?? $"Generated test with {request.QuestionCount} questions",
                DurationMinutes = request.DurationMinutes,
                TotalQuestions = request.QuestionCount,
                TotalPoints = selectedQuestions.Count * 1,  // Default 1 point per question
                IsPublished = request.IsPublished,
                PublishedAt = request.IsPublished ? DateTime.UtcNow : null,
                AvailableFrom = request.AvailableFrom ?? DateTime.UtcNow,
                ExamType = examType,
                Semester = semester,
                SchoolYear = schoolYear,
                SetLabel = setLabel,
                QuestionSignature = signature,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await dbContext.Tests.AddAsync(test, ct);
            await dbContext.SaveChangesAsync(ct);

            // Link selected questions to the test via TestQuestion junction table
            var testQuestions = new List<TestQuestion>();
            foreach (var (question, index) in selectedQuestions.Select((q, i) => (q, i)))
            {
                testQuestions.Add(new TestQuestion
                {
                    TestId = test.Id,
                    QuestionId = question.Id,
                    DisplayOrder = index
                });
            }

            await dbContext.TestQuestions.AddRangeAsync(testQuestions, ct);
            await dbContext.SaveChangesAsync(ct);

            var response = test.ToResponse();
            return TypedResults.Created($"/api/tests/{test.Id}", response);
        }).RequireAuthorization("AdminOnly");
    }
}

public sealed record GenerateTestRequest(
    int SubjectId,
    string Title,
    string? Description,
    int QuestionCount,
    int DurationMinutes,
    bool IsPublished,
    DateTime? AvailableFrom,
    BloomLevel? BloomLevel,
    string? ExamType = null,
    string? Semester = null,
    string? SchoolYear = null,
    string? SetLabel = null
);


