using Databank.Abstract;
using Databank.Database;
using Databank.Features.Subjects;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Databank.Features.Subjects.GetById;

public sealed class GetSubjectEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/subjects/{id:int}", async Task<IResult> (int id, AppDbContext dbContext, HttpContext httpContext, CancellationToken ct) =>
        {
            var subject = await dbContext.Subjects.AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id, ct);

            if (subject is null)
            {
                return TypedResults.NotFound();
            }

            var isAdmin = httpContext.User.HasClaim("isAdmin", "true");
            if (!isAdmin)
            {
                var currentUserIdValue = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? httpContext.User.FindFirst("sub")?.Value
                    ?? httpContext.User.FindFirst("userId")?.Value;

                if (!Guid.TryParse(currentUserIdValue, out var requesterUserId))
                {
                    return TypedResults.Problem(
                        "Unable to determine the current user.",
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var hasCourse = await dbContext.UserCourses
                    .AsNoTracking()
                    .AnyAsync(uc => uc.UserId == requesterUserId && uc.CourseId == subject.CourseId, ct);

                if (!hasCourse)
                {
                    return TypedResults.NotFound();
                }
            }

            var currentUserId = SubjectPermissionResolver.GetCurrentUserId(httpContext.User);
            var canEdit = false;
            var canDelete = false;

            if (currentUserId.HasValue)
            {
                var permissions = await SubjectPermissionResolver.ResolvePermissionsForUserAsync(
                    dbContext,
                    currentUserId.Value,
                    new[] { id },
                    ct);

                canEdit = permissions.TryGetValue(id, out var perms) && perms.CanEdit;
                canDelete = permissions.TryGetValue(id, out var perms2) && perms2.CanDelete;
            }

            return TypedResults.Ok(subject.ToResponse(canEdit, canDelete));
        }).RequireAuthorization();
    }
}

