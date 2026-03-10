using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.PrintRequests.GetByDepartment;

public sealed class GetPrintRequestsByDepartmentEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/printrequests/department/{departmentId:int}", async (
                int departmentId,
                AppDbContext db,
                CancellationToken ct) =>
        {
            var requests = await db.PrintRequests
                .Include(pr => pr.Test)
                .Include(pr => pr.RequestedBy)
                .Include(pr => pr.ProcessedBy)
                .Include(pr => pr.Department)
                .Where(pr => pr.DepartmentId == departmentId)
                .OrderByDescending(pr => pr.CreatedAt)
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
                    pr.ProcessedBy != null ? pr.ProcessedBy.FirstName + " " + pr.ProcessedBy.LastName : null,
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
