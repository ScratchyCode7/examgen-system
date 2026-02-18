using Databank.Abstract;
using Databank.Database;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Databank.Entities;

namespace Databank.Features.Users.Create;

public sealed record CreateUserRequest(string FirstName, string LastName, int DepartmentId, string Username, string Password, string Email, bool IsAdmin = false);
public sealed record CreateUserResponse(string FirstName, string LastName, int DepartmentId, string Username, string Email, bool IsAdmin);

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
            // Verify department exists
            var departmentExists = await dbContext.Departments
                .AnyAsync(d => d.Id == req.DepartmentId, ct);
            
            if (!departmentExists)
            {
                return TypedResults.BadRequest("Department does not exist.");
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