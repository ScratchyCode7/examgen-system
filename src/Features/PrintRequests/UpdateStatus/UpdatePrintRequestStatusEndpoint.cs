using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Databank.Features.PrintRequests.UpdateStatus;

public sealed class UpdatePrintRequestStatusEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/printrequests/{id:guid}/status", async (
                Guid id,
                UpdateStatusRequest request,
                HttpContext httpContext,
                AppDbContext db,
                CancellationToken ct) =>
        {
            var adminUserId = Guid.Parse(httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var printRequest = await db.PrintRequests
                .FirstOrDefaultAsync(pr => pr.PrintRequestId == id, ct);

            if (printRequest is null)
            {
                return Results.NotFound(new { error = "Print request not found" });
            }

            // Parse and validate status
            if (!Enum.TryParse<PrintRequestStatus>(request.Status, out var newStatus))
            {
                return Results.BadRequest(new { error = "Invalid status. Valid values: Pending, ReadyForPickup, Completed, Rejected" });
            }

            printRequest.Status = newStatus;
            printRequest.ProcessedAt = DateTime.UtcNow;
            printRequest.ProcessedByUserId = adminUserId;
            
            if (!string.IsNullOrWhiteSpace(request.Notes))
            {
                printRequest.Notes = request.Notes;
            }

            await db.SaveChangesAsync(ct);

            return Results.Ok(new 
            { 
                printRequestId = printRequest.PrintRequestId,
                status = printRequest.Status.ToString(),
                processedAt = printRequest.ProcessedAt
            });
        })
        .RequireAuthorization("AdminOnly")
        .WithTags("PrintRequests");
    }
}
