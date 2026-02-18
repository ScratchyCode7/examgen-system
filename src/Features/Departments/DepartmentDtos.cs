using Databank.Entities;

namespace Databank.Features.Departments;

public sealed record DepartmentResponse(
    int Id,
    string Name,
    string Code,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public sealed record CreateDepartmentRequest(
    string Name,
    string Code,
    string? Description
);

public sealed record UpdateDepartmentRequest(
    string Name,
    string? Description,
    bool? IsActive
);

public static class DepartmentMappings
{
    public static DepartmentResponse ToResponse(this Department dept)
    {
        return new DepartmentResponse(
            dept.Id,
            dept.Name,
            dept.Code,
            dept.Description,
            dept.IsActive,
            dept.CreatedAt,
            dept.UpdatedAt
        );
    }
}
