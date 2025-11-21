using Databank.Entities;

namespace Databank.Features.Subjects;

public static class SubjectMappings
{
    public static SubjectResponse ToResponse(this Subject subject)
    {
        return new SubjectResponse(
            subject.Id,
            subject.Name,
            subject.Description,
            subject.CreatedAt,
            subject.UpdatedAt
        );
    }
}

