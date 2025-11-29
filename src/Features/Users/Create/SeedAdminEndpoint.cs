using Databank.Abstract;
using Databank.Database;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Databank.Entities;

namespace Databank.Features.Users.Create;

/// <summary>
/// Temporary endpoint to seed the first admin user.
/// Remove or secure this endpoint after creating the first admin.
/// </summary>
public sealed class SeedAdminEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/users/seed-admin", async Task<IResult> (
                AppDbContext dbContext,
                IPasswordHasher<User> passwordHasher,
                CancellationToken ct) =>
        {
            // Check if any admin exists
            var adminExists = await dbContext.Users.AnyAsync(u => u.IsAdmin, ct);
            if (adminExists)
            {
                return TypedResults.BadRequest("Admin user already exists. Use regular registration endpoint.");
            }

            var admin = new User
            {
                FirstName = "Admin",
                LastName = "User",
                Username = "admin",
                Email = "admin@databank.dev",
                Department = "IT",
                IsAdmin = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            admin.Password = passwordHasher.HashPassword(admin, "Admin123!");

            await dbContext.Users.AddAsync(admin, ct);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(new
            {
                message = "Admin user created successfully",
                username = "admin",
                password = "Admin123!",
                note = "Please change the password after first login"
            });
        });
    }
}

