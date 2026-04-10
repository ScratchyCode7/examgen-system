using Databank.Entities;

namespace Databank.Features.Subjects;

public sealed record SubjectRequest(
    int CourseId,
    string Code,
    string Name,
    string? Description
);

public sealed record SubjectResponse(
    int Id,
    int CourseId,
    string Code,
    string Name,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    bool CanEdit,
    bool CanDelete
);

public static class SubjectMappings
{
    public static SubjectResponse ToResponse(this Subject subject, bool canEdit = false, bool canDelete = false)
    {
        return new SubjectResponse(
            subject.Id,
            subject.CourseId,
            subject.Code,
            subject.Name,
            subject.Description,
            subject.IsActive,
            subject.CreatedAt,
            subject.UpdatedAt,
            canEdit,
            canDelete
        );
    }
}

