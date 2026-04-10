using Databank.Abstract;
using Databank.Database;
using Databank.Features.Subjects;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Subjects.Delete;

public sealed class DeleteSubjectEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/subjects/{id:int}", async Task<IResult> (int id, AppDbContext dbContext, HttpContext httpContext, CancellationToken ct) =>
        {
            var subject = await dbContext.Subjects.FirstOrDefaultAsync(s => s.Id == id, ct);
            if (subject is null)
            {
                return TypedResults.NotFound();
            }

            var requesterId = SubjectPermissionResolver.GetCurrentUserId(httpContext.User);
            if (!requesterId.HasValue)
            {
                return TypedResults.Problem("Unable to determine the current user.", statusCode: StatusCodes.Status401Unauthorized);
            }

            var permission = await SubjectPermissionResolver.ResolvePermissionsForUserAsync(
                dbContext,
                requesterId.Value,
                new[] { id },
                ct);

            var canDelete = permission.TryGetValue(id, out var perms) && perms.CanDelete;
            if (!canDelete)
            {
                return TypedResults.Problem(
                    "You do not have permission to delete this course entry. Request delete permission from the owner.",
                    statusCode: StatusCodes.Status403Forbidden);
            }

            dbContext.Subjects.Remove(subject);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.NoContent();
        }).RequireAuthorization();
    }
}

