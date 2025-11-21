using Databank.Entities;

namespace Databank.Features.Tests;

public static class TestMappings
{
    public static TestResponse ToResponse(this Test test)
    {
        return new TestResponse(
            test.Id,
            test.SubjectId,
            test.Title,
            test.Description,
            test.DurationMinutes,
            test.IsPublished,
            test.AvailableFrom,
            test.CreatedAt,
            test.UpdatedAt
        );
    }
}

