using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Departments.Create;

public sealed class CreateDepartmentEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/departments", async Task<IResult> (
                CreateDepartmentRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            // Check if department with this code already exists
            var exists = await dbContext.Departments
                .AnyAsync(d => d.Code == request.Code, ct);

            if (exists)
            {
                return TypedResults.Conflict($"Department with code '{request.Code}' already exists.");
            }

            var department = new Department
            {
                Name = request.Name,
                Code = request.Code,
                Description = request.Description,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await dbContext.Departments.AddAsync(department, ct);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Created($"/api/departments/{department.Id}", department.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}
