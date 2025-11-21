using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Subjects.Create;

public sealed class CreateSubjectEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/subjects", async Task<IResult> (
                SubjectRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var exists = await dbContext.Subjects
                .AnyAsync(s => s.Name == request.Name, ct);

            if (exists)
            {
                return TypedResults.Conflict("Subject name already exists.");
            }

            var subject = new Subject
            {
                Name = request.Name,
                Description = request.Description,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await dbContext.Subjects.AddAsync(subject, ct);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Created($"/api/subjects/{subject.Id}", subject.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}

