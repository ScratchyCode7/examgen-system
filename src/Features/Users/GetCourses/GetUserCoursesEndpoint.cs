using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Databank.Features.Users.GetCourses;

public sealed record UserCourseDto(int Id, int DepartmentId, string Name, string Code, string? Description, bool IsActive);

public sealed class GetUserCoursesEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/users/{userId:guid}/courses", async Task<IResult> (
                Guid userId,
                AppDbContext dbContext,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var isAdmin = httpContext.User.HasClaim("isAdmin", "true");
            var currentUserIdValue = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? httpContext.User.FindFirst("sub")?.Value
                ?? httpContext.User.FindFirst("userId")?.Value;

            if (!isAdmin && (!Guid.TryParse(currentUserIdValue, out var currentUserId) || currentUserId != userId))
            {
                return TypedResults.Problem("You do not have permission to access this user.", statusCode: StatusCodes.Status403Forbidden);
            }

            var courses = await dbContext.UserCourses
                .AsNoTracking()
                .Where(uc => uc.UserId == userId)
                .Select(uc => new UserCourseDto(
                    uc.Course.Id,
                    uc.Course.DepartmentId,
                    uc.Course.Name,
                    uc.Course.Code,
                    uc.Course.Description,
                    uc.Course.IsActive))
                .ToListAsync(ct);

            return TypedResults.Ok(courses);
        }).RequireAuthorization();
    }
}
