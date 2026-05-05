using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.Departments;

public sealed class ManageUserDepartmentEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/users/{userId:guid}/departments/{departmentId:int}", AddDepartmentAsync)
            .RequireAuthorization("AdminOnly");

        app.MapDelete("/api/users/{userId:guid}/departments/{departmentId:int}", RemoveDepartmentAsync)
            .RequireAuthorization("AdminOnly");
    }

    private static async Task<IResult> AddDepartmentAsync(
        Guid userId,
        int departmentId,
        AppDbContext dbContext,
        CancellationToken ct)
    {
        var user = await dbContext.Users
            .Include(u => u.UserDepartments)
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);

        if (user is null)
        {
            return TypedResults.NotFound("User not found.");
        }

        var departmentExists = await dbContext.Departments
            .AsNoTracking()
            .AnyAsync(d => d.Id == departmentId, ct);

        if (!departmentExists)
        {
            return TypedResults.NotFound("Department not found.");
        }

        var alreadyAssigned = user.UserDepartments.Any(ud => ud.DepartmentId == departmentId);
        if (!alreadyAssigned)
        {
            user.UserDepartments.Add(new UserDepartment
            {
                UserId = userId,
                DepartmentId = departmentId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await dbContext.SaveChangesAsync(ct);
        }

        return TypedResults.Ok(new { message = "Department access granted.", departmentId, added = !alreadyAssigned });
    }

    private static async Task<IResult> RemoveDepartmentAsync(
        Guid userId,
        int departmentId,
        AppDbContext dbContext,
        CancellationToken ct)
    {
        var user = await dbContext.Users
            .Include(u => u.UserDepartments)
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);

        if (user is null)
        {
            return TypedResults.NotFound("User not found.");
        }

        var assignment = user.UserDepartments.FirstOrDefault(ud => ud.DepartmentId == departmentId);
        if (assignment is null)
        {
            return TypedResults.Ok(new { message = "Department access already absent.", departmentId, removed = false });
        }

        dbContext.UserDepartments.Remove(assignment);
        await dbContext.SaveChangesAsync(ct);

        return TypedResults.Ok(new { message = "Department access revoked.", departmentId, removed = true });
    }
}
