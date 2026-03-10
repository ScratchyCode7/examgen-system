using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.PrintRequests.GetPending;

public sealed class GetPendingPrintRequestsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/printrequests/pending", async (
                AppDbContext db,
                CancellationToken ct) =>
        {
            var requests = await db.PrintRequests
                .Include(pr => pr.Test)
                .Include(pr => pr.RequestedBy)
                .Include(pr => pr.Department)
                .Where(pr => pr.Status == PrintRequestStatus.Pending)
                .OrderBy(pr => pr.CreatedAt)
                .Select(pr => new PrintRequestResponse(
                    pr.PrintRequestId,
                    pr.TestId,
                    pr.Test.Title,
                    pr.DepartmentId,
                    pr.Department.Name,
                    pr.RequestedByUserId,
                    pr.RequestedBy.FirstName + " " + pr.RequestedBy.LastName,
                    pr.Status.ToString(),
                    pr.CreatedAt,
                    pr.ProcessedAt,
                    pr.ProcessedByUserId,
                    null,
                    pr.Notes,
                    pr.CopiesRequested
                ))
                .ToListAsync(ct);

            return Results.Ok(requests);
        })
        .RequireAuthorization("AdminOnly")
        .WithTags("PrintRequests");
    }
}
