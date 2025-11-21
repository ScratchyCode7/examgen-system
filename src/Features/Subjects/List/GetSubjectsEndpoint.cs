using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Subjects.List;

public sealed class GetSubjectsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/subjects", async Task<IResult> (AppDbContext dbContext, CancellationToken ct) =>
        {
            var subjects = await dbContext.Subjects
                .AsNoTracking()
                .OrderBy(s => s.Name)
                .Select(s => s.ToResponse())
                .ToListAsync(ct);

            return TypedResults.Ok(subjects);
        }).RequireAuthorization();
    }
}

