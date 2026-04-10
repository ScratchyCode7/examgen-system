using Databank.Abstract;
using Databank.Database;
using Databank.Features.Subjects;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Subjects.Update;

public sealed class UpdateSubjectEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/subjects/{id:int}", async Task<IResult> (
                int id,
                SubjectRequest request,
                AppDbContext dbContext,
            HttpContext httpContext,
                CancellationToken ct) =>
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

            var canEdit = permission.TryGetValue(id, out var perms) && perms.CanEdit;
            if (!canEdit)
            {
                return TypedResults.Problem(
                    "You do not have permission to edit this course entry. Request edit permission from the owner.",
                    statusCode: StatusCodes.Status403Forbidden);
            }

            var nameExists = await dbContext.Subjects
                .AnyAsync(s => s.Id != id && s.Name == request.Name, ct);

            if (nameExists)
            {
                return TypedResults.Conflict("Subject name already exists.");
            }

            subject.Name = request.Name;
            subject.Description = request.Description;
            subject.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(subject.ToResponse());
        }).RequireAuthorization();
    }
}

