using Databank.Abstract;
using Databank.Database;
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
                CancellationToken ct) =>
        {
            var subject = await dbContext.Subjects.FirstOrDefaultAsync(s => s.Id == id, ct);

            if (subject is null)
            {
                return TypedResults.NotFound();
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
        }).RequireAuthorization("AdminOnly");
    }
}

