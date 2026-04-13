using System.Linq;
using Databank.Entities;

namespace Databank.Features.Tests;

public static class TestMappings
{
    public static TestResponse ToResponse(this Test test, List<QuestionResponse>? questions = null)
    {
        var createdByName = BuildCreatedByName(test);

        return new TestResponse(
            test.Id,
            test.SubjectId,
            test.CourseId,
            test.DepartmentId,
            test.Title,
            test.Description,
            test.ExamType,
            test.Semester,
            test.SchoolYear,
            test.SetLabel,
            test.CreatedByUserId,
            createdByName,
            test.DurationMinutes,
            test.TotalQuestions,
            test.TotalPoints,
            test.IsPublished,
            test.AvailableFrom,
            test.CreatedAt,
            test.UpdatedAt,
            test.IsDraft,
            test.IsExamLeftAligned,
            test.IsQuestionSeparatorEnabled,
            test.SpecificationSnapshot,
            test.QuestionSignature,
            questions
        );
    }

    private static string? BuildCreatedByName(Test test)
    {
        var creator = test.CreatedByUser;
        if (creator is null)
        {
            return null;
        }

        var first = creator.FirstName?.Trim();
        var last = creator.LastName?.Trim();
        var hasFirst = !string.IsNullOrWhiteSpace(first);
        var hasLast = !string.IsNullOrWhiteSpace(last);

        if (hasFirst || hasLast)
        {
            return string.Join(" ", new[] { first, last }.Where(value => !string.IsNullOrWhiteSpace(value)));
        }

        return string.IsNullOrWhiteSpace(creator.Username) ? null : creator.Username;
    }
}
