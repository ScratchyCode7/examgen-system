using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Databank.Features.Users.GetTopics;

public sealed record UserTopicDto(
    int Id,
    int SubjectId,
    int CourseId,
    int DepartmentId,
    string Title,
    bool IsActive);

public sealed class GetUserTopicsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/users/{userId:guid}/topics", async Task<IResult> (
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

            var topics = await dbContext.UserTopics
                .AsNoTracking()
                .Where(ut => ut.UserId == userId)
                .Select(ut => new UserTopicDto(
                    ut.Topic.Id,
                    ut.Topic.SubjectId,
                    ut.Topic.Subject.CourseId,
                    ut.Topic.Subject.Course.DepartmentId,
                    ut.Topic.Title,
                    ut.Topic.IsActive))
                .ToListAsync(ct);

            return TypedResults.Ok(topics);
        }).RequireAuthorization();
    }
}
