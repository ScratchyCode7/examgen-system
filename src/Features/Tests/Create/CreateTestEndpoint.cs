using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Tests.Create;

public sealed class CreateTestEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/tests", async Task<IResult> (
                TestRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var subjectExists = await dbContext.Subjects
                .AnyAsync(s => s.Id == request.SubjectId, ct);

            if (!subjectExists)
            {
                return TypedResults.BadRequest("Subject not found.");
            }

            var test = new Test
            {
                SubjectId = request.SubjectId,
                Title = request.Title,
                Description = request.Description,
                DurationMinutes = request.DurationMinutes,
                IsPublished = request.IsPublished,
                AvailableFrom = request.AvailableFrom ?? DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await dbContext.Tests.AddAsync(test, ct);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Created($"/api/tests/{test.Id}", test.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}

