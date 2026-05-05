using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Databank.Features.Courses.GetById;

public sealed class GetCourseEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/courses/{id:int}", async Task<IResult> (
                int id,
                AppDbContext dbContext,
            HttpContext httpContext,
                CancellationToken ct) =>
        {
            var course = await dbContext.Courses
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id, ct);

            if (course is null)
            {
                return TypedResults.NotFound();
            }

            var isAdmin = httpContext.User.HasClaim("isAdmin", "true");
            if (!isAdmin)
            {
                var currentUserIdValue = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? httpContext.User.FindFirst("sub")?.Value
                    ?? httpContext.User.FindFirst("userId")?.Value;

                if (!Guid.TryParse(currentUserIdValue, out var currentUserId))
                {
                    return TypedResults.Problem(
                        "Unable to determine the current user.",
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var hasCourse = await dbContext.UserCourses
                    .AsNoTracking()
                    .AnyAsync(uc => uc.UserId == currentUserId && uc.CourseId == id, ct);

                if (!hasCourse)
                {
                    return TypedResults.NotFound();
                }
            }

            return TypedResults.Ok(course.ToResponse());
        }).RequireAuthorization();
    }
}
