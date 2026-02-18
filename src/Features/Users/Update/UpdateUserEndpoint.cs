using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.Update;

public sealed record UpdateUserRequest(
    string FirstName,
    string LastName,
    int DepartmentId,
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
            var user = await dbContext.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);

            if (user is null)
            {
                return TypedResults.NotFound();
            }

            // Verify department exists
            var departmentExists = await dbContext.Departments
                .AnyAsync(d => d.Id == request.DepartmentId, ct);
            
            if (!departmentExists)
            {
                return TypedResults.BadRequest("Department does not exist.");
            }

            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            user.DepartmentId = request.DepartmentId;
            user.Email = request.Email;

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

