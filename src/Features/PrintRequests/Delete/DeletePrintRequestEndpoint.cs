using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Databank.Features.PrintRequests.Delete;

public sealed class DeletePrintRequestEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("/api/printrequests/{id:guid}", async (
                Guid id,
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

            if (!isAdmin && printRequest.RequestedByUserId != actingUserId)
            {
                return Results.Forbid();
            }

            if (!isAdmin
                && printRequest.Status != PrintRequestStatus.Pending
                && printRequest.Status != PrintRequestStatus.Rejected
                && printRequest.Status != PrintRequestStatus.Completed)
            {
                return Results.BadRequest(new { error = "Only pending, rejected, or completed requests can be deleted." });
            }

            db.PrintRequests.Remove(printRequest);
            await db.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .RequireAuthorization()
        .WithTags("PrintRequests");
    }
}
