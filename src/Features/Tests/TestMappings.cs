using Databank.Entities;

namespace Databank.Features.Tests;

public static class TestMappings
{
    public static TestResponse ToResponse(this Test test, List<QuestionResponse>? questions = null)
    {
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
            test.DurationMinutes,
            test.TotalQuestions,
            test.TotalPoints,
            test.IsPublished,
            test.AvailableFrom,
            test.CreatedAt,
            test.UpdatedAt,
            test.SpecificationSnapshot,
            test.QuestionSignature,
            questions
        );
    }
}
