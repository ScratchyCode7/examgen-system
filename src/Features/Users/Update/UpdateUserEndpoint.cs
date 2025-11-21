using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.Update;

public sealed record UpdateUserRequest(
    string FirstName,
    string LastName,
    string Department,
    string Email,
    bool? IsAdmin,
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

            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            user.Department = request.Department;
            user.Email = request.Email;

            if (request.IsAdmin.HasValue)
            {
                user.IsAdmin = request.IsAdmin.Value;
            }

            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                user.Password = passwordHasher.HashPassword(user, request.Password);
            }

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(user.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}

