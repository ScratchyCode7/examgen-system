using Databank.Abstract;
using Databank.Database;
using Databank.Features.Subjects;
using Microsoft.EntityFrameworkCore;

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

