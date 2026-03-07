using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Departments.GetByCode;

public sealed record DepartmentDto(int Id, string Name, string Code, string? Description, bool IsActive);

public sealed class GetDepartmentByCodeEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/departments/by-code/{code}", async Task<IResult> (
                string code,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var department = await dbContext.Departments
                .Where(d => d.Code == code)
                .Select(d => new DepartmentDto(
                    d.Id,
                    d.Name,
                    d.Code,
                    d.Description,
                    d.IsActive
                ))
                .FirstOrDefaultAsync(ct);

            if (department is null)
            {
                return TypedResults.NotFound($"Department with code '{code}' not found.");
            }

            return TypedResults.Ok(department);
        }).RequireAuthorization();
    }
}
