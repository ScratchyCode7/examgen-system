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
            var userIdValue = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? httpContext.User.FindFirst("sub")?.Value
                ?? httpContext.User.FindFirst("userId")?.Value;

            if (!Guid.TryParse(userIdValue, out var actingUserId))
            {
                return Results.Unauthorized();
            }

            var isAdmin = httpContext.User.HasClaim("isAdmin", "true");

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

            if (!isAdmin)
            {
                if (printRequest.RequestedByUserId != actingUserId)
                {
                    return Results.Forbid();
                }

                if (newStatus != PrintRequestStatus.Completed)
                {
                    return Results.BadRequest(new { error = "Only completed status can be confirmed by the request owner." });
                }

                if (printRequest.Status != PrintRequestStatus.ReadyForPickup && printRequest.Status != PrintRequestStatus.Completed)
                {
                    return Results.BadRequest(new { error = "This request is not ready for pickup yet." });
                }
            }
            else
            {
                printRequest.ProcessedByUserId = actingUserId;
            }

            printRequest.Status = newStatus;
            printRequest.ProcessedAt = DateTime.UtcNow;

            if (isAdmin && !string.IsNullOrWhiteSpace(request.Notes))
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
        .RequireAuthorization()
        .WithTags("PrintRequests");
    }
}
