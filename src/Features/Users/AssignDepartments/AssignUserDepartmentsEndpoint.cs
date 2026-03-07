using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.AssignDepartments;

public sealed record AssignDepartmentsRequest(int[] DepartmentIds);

public sealed class AssignUserDepartmentsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/users/{userId:guid}/departments", async Task<IResult> (
                Guid userId,
                AssignDepartmentsRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            if (request.DepartmentIds == null || request.DepartmentIds.Length == 0)
            {
                return TypedResults.BadRequest("At least one department must be specified.");
            }

            var user = await dbContext.Users
                .Include(u => u.UserDepartments)
                .FirstOrDefaultAsync(u => u.UserId == userId, ct);

            if (user is null)
            {
                return TypedResults.NotFound("User not found.");
            }

            // Verify all departments exist
            var existingDeptCount = await dbContext.Departments
                .CountAsync(d => request.DepartmentIds.Contains(d.Id), ct);

            if (existingDeptCount != request.DepartmentIds.Length)
            {
                return TypedResults.BadRequest("One or more departments do not exist.");
            }

            // Remove existing department assignments
            user.UserDepartments.Clear();

            // Add new department assignments
            foreach (var deptId in request.DepartmentIds)
            {
                user.UserDepartments.Add(new UserDepartment
                {
                    UserId = userId,
                    DepartmentId = deptId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(new { message = "Departments assigned successfully", departmentIds = request.DepartmentIds });
        }).RequireAuthorization("AdminOnly");
    }
}
