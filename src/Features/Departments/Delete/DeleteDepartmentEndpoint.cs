using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Departments.Delete;

public sealed class DeleteDepartmentEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/departments/{id:int}", async Task<IResult> (
                int id,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var department = await dbContext.Departments
                .Include(d => d.Users)
                .Include(d => d.Courses)
                .FirstOrDefaultAsync(d => d.Id == id, ct);

            if (department is null)
            {
                return TypedResults.NotFound();
            }

            // Check if department has users or courses
            if (department.Users.Any() || department.Courses.Any())
            {
                return TypedResults.BadRequest(
                    "Cannot delete department with associated users or courses. " +
                    "Please migrate or remove them first.");
            }

            dbContext.Departments.Remove(department);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.NoContent();
        }).RequireAuthorization("AdminOnly");
    }
}
