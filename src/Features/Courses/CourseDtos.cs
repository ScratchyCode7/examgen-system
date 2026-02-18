using Databank.Entities;

namespace Databank.Features.Courses;

public sealed record CourseRequest(
    int DepartmentId,
    string Name,
    string Code,
    string? Description
);

public sealed record CourseResponse(
    int Id,
    int DepartmentId,
    string Name,
    string Code,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public static class CourseMappings
{
    public static CourseResponse ToResponse(this Course course)
    {
        return new CourseResponse(
            course.Id,
            course.DepartmentId,
            course.Name,
            course.Code,
            course.Description,
            course.IsActive,
            course.CreatedAt,
            course.UpdatedAt
        );
    }
}
