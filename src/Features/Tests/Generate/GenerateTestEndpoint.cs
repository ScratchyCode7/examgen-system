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
            var subjectExists = await dbContext.Subjects.AnyAsync(s => s.Id == request.SubjectId, ct);
            if (!subjectExists)
            {
                return TypedResults.BadRequest("Subject not found.");
            }

            // Build query to find questions matching criteria
            var questionQuery = dbContext.Questions.AsNoTracking()
                .Where(q => q.Test.SubjectId == request.SubjectId);

            if (request.Difficulty.HasValue)
            {
                questionQuery = questionQuery.Where(q => q.Difficulty == request.Difficulty.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.Category))
            {
                questionQuery = questionQuery.Where(q => q.Category != null && q.Category.Contains(request.Category));
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

            // Create the test
            var test = new Test
            {
                SubjectId = request.SubjectId,
                Title = request.Title,
                Description = request.Description ?? $"Generated test with {request.QuestionCount} questions",
                DurationMinutes = request.DurationMinutes,
                IsPublished = request.IsPublished,
                AvailableFrom = request.AvailableFrom ?? DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await dbContext.Tests.AddAsync(test, ct);
            await dbContext.SaveChangesAsync(ct);

            // Create new question instances linked to the new test
            var newQuestions = new List<Question>();
            foreach (var (originalQuestion, index) in selectedQuestions.Select((q, i) => (q, i)))
            {
                var newQuestion = new Question
                {
                    TestId = test.Id,
                    Content = originalQuestion.Content,
                    Type = originalQuestion.Type,
                    Points = originalQuestion.Points,
                    DisplayOrder = index,
                    Difficulty = originalQuestion.Difficulty,
                    Category = originalQuestion.Category
                };
                newQuestions.Add(newQuestion);
            }

            await dbContext.Questions.AddRangeAsync(newQuestions, ct);
            await dbContext.SaveChangesAsync(ct);

            // Copy options for each question
            var optionsToAdd = new List<Option>();
            foreach (var (originalQuestion, index) in selectedQuestions.Select((q, i) => (q, i)))
            {
                var originalOptions = await dbContext.Options
                    .Where(o => o.QuestionId == originalQuestion.Id)
                    .ToListAsync(ct);

                var newQuestion = newQuestions[index];
                foreach (var (originalOption, optIndex) in originalOptions.Select((o, i) => (o, i)))
                {
                    optionsToAdd.Add(new Option
                    {
                        QuestionId = newQuestion.Id,
                        Content = originalOption.Content,
                        IsCorrect = originalOption.IsCorrect,
                        DisplayOrder = originalOption.DisplayOrder
                    });
                }
            }

            await dbContext.Options.AddRangeAsync(optionsToAdd, ct);
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
    QuestionDifficulty? Difficulty,
    string? Category
);

