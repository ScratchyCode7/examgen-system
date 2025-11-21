using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Tests.Update;

public sealed class UpdateTestEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/tests/{id:int}", async Task<IResult> (
                int id,
                TestRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var test = await dbContext.Tests.FirstOrDefaultAsync(t => t.Id == id, ct);
            if (test is null)
            {
                return TypedResults.NotFound();
            }

            var subjectExists = await dbContext.Subjects.AnyAsync(s => s.Id == request.SubjectId, ct);
            if (!subjectExists)
            {
                return TypedResults.BadRequest("Subject not found.");
            }

            test.SubjectId = request.SubjectId;
            test.Title = request.Title;
            test.Description = request.Description;
            test.DurationMinutes = request.DurationMinutes;
            test.IsPublished = request.IsPublished;
            test.AvailableFrom = request.AvailableFrom ?? test.AvailableFrom;
            test.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(test.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }
}

