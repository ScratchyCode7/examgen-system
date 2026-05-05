using Databank.Abstract;
using Databank.Database;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Databank.Entities;

namespace Databank.Features.Users.Create;

public sealed record CreateUserRequest(
    string FirstName,
    string LastName,
    int[] DepartmentIds,
    int[] CourseIds,
    string Username,
    string Password,
    string Email,
    bool IsAdmin = false);
public sealed record CreateUserResponse(string FirstName, string LastName, int[] DepartmentIds, int[] CourseIds, string Username, string Email, bool IsAdmin);

public sealed class CreateUserEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/users", async Task<IResult> (
                CreateUserRequest req,
                IPasswordHasher<User> passwordHasher,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            // Verify all departments exist
            if (req.DepartmentIds == null || req.DepartmentIds.Length == 0)
            {
                return TypedResults.BadRequest("At least one department must be specified.");
            }
            
            var existingDeptCount = await dbContext.Departments
                .CountAsync(d => req.DepartmentIds.Contains(d.Id), ct);
            
            if (existingDeptCount != req.DepartmentIds.Length)
            {
                return TypedResults.BadRequest("One or more departments do not exist.");
            }

            var courseIds = req.CourseIds ?? Array.Empty<int>();
            if (courseIds.Length > 0)
            {
                var courseRows = await dbContext.Courses
                    .AsNoTracking()
                    .Where(c => courseIds.Contains(c.Id))
                    .Select(c => new { c.Id, c.DepartmentId })
                    .ToListAsync(ct);

                if (courseRows.Count != courseIds.Length)
                {
                    return TypedResults.BadRequest("One or more courses do not exist.");
                }

                var allowedDepartments = req.DepartmentIds.ToHashSet();
                var invalidCourses = courseRows
                    .Where(c => !allowedDepartments.Contains(c.DepartmentId))
                    .Select(c => c.Id)
                    .ToArray();

                if (invalidCourses.Length > 0)
                {
                    return TypedResults.BadRequest("One or more courses are outside the assigned departments.");
                }
            }

            var exists = await dbContext.Users
                .AnyAsync(user => user.Username == req.Username || user.Email == req.Email, ct);

            if (exists)
            {
                return TypedResults.Conflict("Username or email already exists.");
            }

            var user = req.ToCreate();
            user.Password = passwordHasher.HashPassword(user, req.Password);

            await dbContext.Users.AddAsync(user, ct);
            await dbContext.SaveChangesAsync(ct);

            var response = user.ToResponse();

            return TypedResults.Created($"/api/users/{user.UserId}", response);
        }).RequireAuthorization("AdminOnly");
    }
}