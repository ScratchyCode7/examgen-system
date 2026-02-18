using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Departments.Update;

public sealed class UpdateDepartmentEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/departments/{id:int}", async Task<IResult> (
                int id,
                UpdateDepartmentRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var department = await dbContext.Departments.FirstOrDefaultAsync(d => d.Id == id, ct);

            if (department is null)
            {
                return TypedResults.NotFound();
            }

            department.Name = request.Name;
            if (request.Description != null)
            {
                department.Description = request.Description;
            }
            if (request.IsActive.HasValue)
            {
                department.IsActive = request.IsActive.Value;
            }
            department.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(department.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}
