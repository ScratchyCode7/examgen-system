using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.Dean;

public sealed class ManageUserDeanStatusEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/users/{userId:guid}/departments/{departmentId:int}/dean", async Task<IResult> (
                Guid userId,
                int departmentId,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var user = await dbContext.Users
                .Include(u => u.UserDepartments)
                .FirstOrDefaultAsync(u => u.UserId == userId, ct);

            if (user is null)
            {
                return TypedResults.NotFound("User not found.");
            }

            var departmentExists = await dbContext.Departments
                .AnyAsync(d => d.Id == departmentId, ct);

            if (!departmentExists)
            {
                return TypedResults.NotFound("Department not found.");
            }

            // Enforce a single dean per department by clearing dean scope from others.
            var existingDeans = await dbContext.UserDepartments
                .Where(ud => ud.DepartmentId == departmentId && ud.RoleScope == UserDepartment.DeanRoleScope && ud.UserId != userId)
                .ToListAsync(ct);

            foreach (var deanAssignment in existingDeans)
            {
                deanAssignment.RoleScope = null;
                deanAssignment.UpdatedAt = DateTime.UtcNow;
            }

            var assignment = user.UserDepartments.FirstOrDefault(ud => ud.DepartmentId == departmentId);
            if (assignment == null)
            {
                user.UserDepartments.Add(new UserDepartment
                {
                    UserId = userId,
                    DepartmentId = departmentId,
                    RoleScope = UserDepartment.DeanRoleScope,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            else
            {
                assignment.RoleScope = UserDepartment.DeanRoleScope;
                assignment.UpdatedAt = DateTime.UtcNow;
            }

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(new
            {
                message = "Dean status assigned successfully.",
                userId,
                departmentId,
                isDean = true
            });
        }).RequireAuthorization("AdminOnly");

        app.MapDelete("/api/users/{userId:guid}/departments/{departmentId:int}/dean", async Task<IResult> (
                Guid userId,
                int departmentId,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var assignment = await dbContext.UserDepartments
                .FirstOrDefaultAsync(ud => ud.UserId == userId && ud.DepartmentId == departmentId, ct);

            if (assignment == null)
            {
                return TypedResults.NotFound("User department assignment not found.");
            }

            assignment.RoleScope = null;
            assignment.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(new
            {
                message = "Dean status removed successfully.",
                userId,
                departmentId,
                isDean = false
            });
        }).RequireAuthorization("AdminOnly");
    }
}
