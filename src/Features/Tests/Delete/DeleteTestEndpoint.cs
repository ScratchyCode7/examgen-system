using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Tests.Delete;

public sealed class DeleteTestEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/tests/{id:int}", async Task<IResult> (int id, AppDbContext dbContext, HttpContext httpContext, CancellationToken ct) =>
        {
            var test = await dbContext.Tests.FirstOrDefaultAsync(t => t.Id == id, ct);
            if (test is null)
            {
                return TypedResults.NotFound();
            }

            var user = httpContext.User;
            if (user?.Identity?.IsAuthenticated != true)
            {
                return TypedResults.Unauthorized();
            }

            var isAdmin = user.HasClaim("isAdmin", "true");
            var userIdClaim = user.FindFirst("sub")?.Value ?? user.FindFirst("userId")?.Value;
            Guid? requesterId = null;
            if (Guid.TryParse(userIdClaim, out var parsedUserId))
            {
                requesterId = parsedUserId;
            }

            var ownsExam = requesterId.HasValue && test.CreatedByUserId.HasValue && requesterId.Value == test.CreatedByUserId.Value;
            if (!isAdmin && !ownsExam)
            {
                return TypedResults.Forbid();
            }

            dbContext.Tests.Remove(test);
            await dbContext.SaveChangesAsync(ct);

            return TypedResults.NoContent();
        }).RequireAuthorization();
    }
}

