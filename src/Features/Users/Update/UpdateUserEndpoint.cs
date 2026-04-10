using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.AspNetCore.Http;
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
    string? Password,
    string? AdminPasswordVerification
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
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var user = await dbContext.Users
                .Include(u => u.UserDepartments)
                .FirstOrDefaultAsync(u => u.UserId == userId, ct);

            if (user is null)
            {
                return TypedResults.NotFound();
            }

            var normalizedEmail = request.Email?.Trim();
            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                return TypedResults.BadRequest("Email is required.");
            }

            var duplicateEmail = await dbContext.Users
                .AnyAsync(u => u.UserId != userId && u.Email.ToLower() == normalizedEmail.ToLower(), ct);

            if (duplicateEmail)
            {
                return TypedResults.Conflict($"Email '{normalizedEmail}' is already in use.");
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
            user.Email = normalizedEmail;
            
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
                if (!request.IsActive.Value)
                {
                    var actingUserIdValue = httpContext.User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                        ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);

                    if (Guid.TryParse(actingUserIdValue, out var actingUserId) && actingUserId == userId)
                    {
                        return TypedResults.BadRequest("Admins cannot lock their own account.");
                    }
                }

                user.IsActive = request.IsActive.Value;

                if (request.IsActive.Value)
                {
                    user.FailedLoginAttempts = 0;
                    user.LockoutEnd = null;
                }
            }

            var isPasswordChangeRequested = !string.IsNullOrWhiteSpace(request.Password);
            if (isPasswordChangeRequested)
            {
                if (string.IsNullOrWhiteSpace(request.AdminPasswordVerification))
                {
                    return TypedResults.BadRequest("Admin password verification is required before changing a user's password.");
                }

                var requesterIdValue = httpContext.User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                    ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!Guid.TryParse(requesterIdValue, out var requesterId))
                {
                    return TypedResults.Unauthorized();
                }

                var requestingAdmin = await dbContext.Users
                    .FirstOrDefaultAsync(u => u.UserId == requesterId, ct);

                if (requestingAdmin is null)
                {
                    return TypedResults.Unauthorized();
                }

                var verificationResult = passwordHasher.VerifyHashedPassword(
                    requestingAdmin,
                    requestingAdmin.Password,
                    request.AdminPasswordVerification);

                if (verificationResult == PasswordVerificationResult.Failed)
                {
                    return TypedResults.Problem(
                        "Admin identity verification failed. Please enter your current password to change a user's password.",
                        statusCode: StatusCodes.Status403Forbidden);
                }

                user.Password = passwordHasher.HashPassword(user, request.Password!);
            }

            user.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(user.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}

