using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Account;

public sealed class UpdateMyAccountEndpoint : IEndpoint
{
    private const long MaxProfileImageBytes = 5 * 1024 * 1024;

    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/account/me", async Task<IResult> (
                HttpContext httpContext,
                AppDbContext dbContext,
                IPasswordHasher<User> passwordHasher,
                IFileStorageService fileStorageService,
                CancellationToken ct) =>
        {
            var userIdValue = httpContext.User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                              ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdValue, out var userId))
            {
                return TypedResults.Unauthorized();
            }

            var form = await httpContext.Request.ReadFormAsync(ct);

            var fullName = form["fullName"].ToString().Trim();
            var newPassword = form["newPassword"].ToString().Trim();
            var profileImage = form.Files.GetFile("profilePicture");

            if (string.IsNullOrWhiteSpace(fullName))
            {
                return TypedResults.BadRequest(new { message = "Name must not be empty." });
            }

            if (!string.IsNullOrWhiteSpace(newPassword) && newPassword.Length < 8)
            {
                return TypedResults.BadRequest(new { message = "Password must be at least 8 characters." });
            }

            if (profileImage is not null)
            {
                if (profileImage.Length <= 0)
                {
                    return TypedResults.BadRequest(new { message = "Uploaded profile image is empty." });
                }

                if (profileImage.Length > MaxProfileImageBytes)
                {
                    return TypedResults.BadRequest(new { message = "Profile image must be 5MB or smaller." });
                }

                if (!profileImage.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                {
                    return TypedResults.BadRequest(new { message = "Only image files are allowed for profile picture." });
                }
            }

            var user = await dbContext.Users
                .SingleOrDefaultAsync(x => x.UserId == userId, ct);

            if (user is null)
            {
                return TypedResults.Unauthorized();
            }

            var (firstName, lastName) = SplitFullName(fullName);
            user.FirstName = firstName;
            user.LastName = lastName;

            if (!string.IsNullOrWhiteSpace(newPassword))
            {
                user.Password = passwordHasher.HashPassword(user, newPassword);
            }

            if (profileImage is not null)
            {
                await using var stream = profileImage.OpenReadStream();
                var newPath = await fileStorageService.SaveFileAsync(stream, profileImage.FileName, "profiles");

                if (!string.IsNullOrWhiteSpace(user.ProfileImagePath) &&
                    !string.Equals(user.ProfileImagePath, newPath, StringComparison.OrdinalIgnoreCase))
                {
                    await fileStorageService.DeleteFileAsync(user.ProfileImagePath);
                }

                user.ProfileImagePath = newPath;
            }

            user.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(user.ToAccountProfileResponse());
        }).RequireAuthorization();
    }

    private static (string FirstName, string LastName) SplitFullName(string fullName)
    {
        var parts = fullName
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (parts.Length == 0)
        {
            return (string.Empty, string.Empty);
        }

        if (parts.Length == 1)
        {
            return (parts[0], string.Empty);
        }

        var firstName = string.Join(' ', parts[..^1]);
        var lastName = parts[^1];
        return (firstName, lastName);
    }
}
