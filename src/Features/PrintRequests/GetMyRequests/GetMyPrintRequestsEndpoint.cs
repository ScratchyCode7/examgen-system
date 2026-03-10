using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Databank.Features.PrintRequests.GetMyRequests;

public sealed class GetMyPrintRequestsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/printrequests/my-requests", async (
                HttpContext httpContext,
                AppDbContext db,
                CancellationToken ct) =>
        {
            var userId = Guid.Parse(httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var requests = await db.PrintRequests
                .Include(pr => pr.Test)
                .Include(pr => pr.Department)
                .Include(pr => pr.ProcessedBy)
                .Where(pr => pr.RequestedByUserId == userId)
                .OrderByDescending(pr => pr.CreatedAt)
                .Select(pr => new PrintRequestResponse(
                    pr.PrintRequestId,
                    pr.TestId,
                    pr.Test.Title,
                    pr.DepartmentId,
                    pr.Department.Name,
                    pr.RequestedByUserId,
                    "",  // No need to return own name
                    pr.Status.ToString(),
                    pr.CreatedAt,
                    pr.ProcessedAt,
                    pr.ProcessedByUserId,
                    pr.ProcessedBy != null ? pr.ProcessedBy.FirstName + " " + pr.ProcessedBy.LastName : null,
                    pr.Notes,
                    pr.CopiesRequested
                ))
                .ToListAsync(ct);

            return Results.Ok(requests);
        })
        .RequireAuthorization()
        .WithTags("PrintRequests");
    }
}
