using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.Update;

public sealed record UpdateUserRequest(
    string FirstName,
    string LastName,
    int[] DepartmentIds,
    string Email,
    bool? IsAdmin,
    bool? IsActive,
    string? Password
);

public sealed class UpdateUserEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/users/{userId:guid}", async Task<IResult> (
                Guid userId,
                UpdateUserRequest request,
                AppDbContext dbContext,
                IPasswordHasher<User> passwordHasher,
                CancellationToken ct) =>
        {
            var user = await dbContext.Users
                .Include(u => u.UserDepartments)
                .FirstOrDefaultAsync(u => u.UserId == userId, ct);

            if (user is null)
            {
                return TypedResults.NotFound();
            }

            // Verify all departments exist
            if (request.DepartmentIds == null || request.DepartmentIds.Length == 0)
            {
                return TypedResults.BadRequest("At least one department must be specified.");
            }
            
            var existingDeptCount = await dbContext.Departments
                .CountAsync(d => request.DepartmentIds.Contains(d.Id), ct);
            
            if (existingDeptCount != request.DepartmentIds.Length)
            {
                return TypedResults.BadRequest("One or more departments do not exist.");
            }

            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            user.Email = request.Email;
            
            // Update department assignments
            user.UserDepartments.Clear();
            user.UserDepartments = request.DepartmentIds
                .Select(deptId => new UserDepartment
                {
                    UserId = userId,
                    DepartmentId = deptId
                })
                .ToList();

            if (request.IsAdmin.HasValue)
            {
                user.IsAdmin = request.IsAdmin.Value;
            }

            if (request.IsActive.HasValue)
            {
                user.IsActive = request.IsActive.Value;
            }

            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                user.Password = passwordHasher.HashPassword(user, request.Password);
            }

            user.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(user.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}

