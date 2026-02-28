using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Tests.Create;

public sealed class CreateTestWithQuestionsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/tests/create-with-questions", async Task<IResult> (
                CreateTestWithQuestionsRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            // Validate input
            if (request.QuestionIds == null || request.QuestionIds.Count == 0)
            {
                return TypedResults.BadRequest("At least one question must be selected.");
            }

            // Verify all questions exist and gather topic/subject info
            var questionsExist = await dbContext.Questions
                .Include(q => q.Topic)
                    .ThenInclude(t => t.Subject)
                        .ThenInclude(s => s.Course)
                            .ThenInclude(c => c.Department)
                .Where(q => request.QuestionIds.Contains(q.Id))
                .ToListAsync(ct);

            if (questionsExist.Count != request.QuestionIds.Count)
            {
                return TypedResults.BadRequest("One or more questions not found.");
            }

            // Get the subject from the first question
            var firstQuestion = questionsExist.FirstOrDefault();
            if (firstQuestion?.Topic?.SubjectId == null)
            {
                return TypedResults.BadRequest("Could not determine subject for the selected questions.");
            }

            var subjectId = firstQuestion.Topic.SubjectId;
            var courseId = firstQuestion.Topic.Subject?.CourseId;
            var departmentId = firstQuestion.Topic.Subject?.Course?.DepartmentId;

            // Ensure every question belongs to the same subject
            var mismatchedQuestion = questionsExist.FirstOrDefault(q => q.Topic?.SubjectId != subjectId);
            if (mismatchedQuestion != null)
            {
                return TypedResults.BadRequest("All questions must belong to the same subject when creating a test.");
            }

            var questionSignatures = request.QuestionIds
                .Select((id, index) => (questionId: id, displayOrder: index))
                .ToList();
            var signature = TestSignatureHelper.BuildSignature(questionSignatures);

            // Create the test
            var test = new Test
            {
                SubjectId = subjectId,
                CourseId = courseId,
                DepartmentId = departmentId,
                Title = request.Title,
                Description = request.Description ?? $"Test with {request.QuestionIds.Count} questions",
                DurationMinutes = request.DurationMinutes,
                TotalQuestions = request.QuestionIds.Count,
                TotalPoints = request.TotalPoints ?? request.QuestionIds.Count,
                IsPublished = request.IsPublished,
                AvailableFrom = request.AvailableFrom ?? DateTime.UtcNow,
                ExamType = request.ExamType ?? "Custom",
                Semester = request.Semester ?? string.Empty,
                SchoolYear = request.SchoolYear ?? string.Empty,
                SetLabel = request.SetLabel ?? string.Empty,
                SpecificationSnapshot = request.SpecificationSnapshot,
                GenerationNotes = request.GenerationNotes,
                QuestionSignature = signature,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await dbContext.Tests.AddAsync(test, ct);
            await dbContext.SaveChangesAsync(ct);

            // Link questions to the test
            var testQuestions = new List<TestQuestion>();
            for (int i = 0; i < request.QuestionIds.Count; i++)
            {
                testQuestions.Add(new TestQuestion
                {
                    TestId = test.Id,
                    QuestionId = request.QuestionIds[i],
                    DisplayOrder = i
                });
            }

            await dbContext.TestQuestions.AddRangeAsync(testQuestions, ct);
            await dbContext.SaveChangesAsync(ct);

            var response = test.ToResponse();
            return TypedResults.Created($"/api/tests/{test.Id}", response);
        }).RequireAuthorization("AdminOnly");
    }
}

public sealed record CreateTestWithQuestionsRequest(
    string Title,
    string? Description,
    List<int> QuestionIds,
    int DurationMinutes,
    bool IsPublished,
    int? TotalPoints = null,
    DateTime? AvailableFrom = null,
    string? ExamType = null,
    string? Semester = null,
    string? SchoolYear = null,
    string? SetLabel = null,
    string? SpecificationSnapshot = null,
    string? GenerationNotes = null
);
