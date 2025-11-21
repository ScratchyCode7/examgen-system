using Databank.Entities;

namespace Databank.Features.TestResults;

public static class TestResultMappings
{
    public static TestResultResponse ToResponse(this TestResult testResult)
    {
        return new TestResultResponse(
            testResult.Id,
            testResult.UserId,
            testResult.TestId,
            testResult.Score,
            testResult.CorrectAnswers,
            testResult.TotalQuestions,
            testResult.Duration,
            testResult.CompletedAt
        );
    }
}

