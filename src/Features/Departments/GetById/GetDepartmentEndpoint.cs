using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Departments.GetById;

public sealed class GetDepartmentEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/departments/{id:int}", async Task<IResult> (
                int id,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var department = await dbContext.Departments
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Id == id, ct);

            if (department is null)
            {
                return TypedResults.NotFound();
            }

            return TypedResults.Ok(department.ToResponse());
        }).RequireAuthorization();
    }
}
