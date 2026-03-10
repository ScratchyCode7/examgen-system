using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Databank.Features.PrintRequests.Submit;

public sealed class SubmitPrintRequestEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/printrequests", async (
                CreatePrintRequestRequest request,
                HttpContext httpContext,
                AppDbContext db,
                CancellationToken ct) =>
        {
            var userId = Guid.Parse(httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            // Load the test and verify it exists
            var test = await db.Tests
                .Include(t => t.Department)
                .FirstOrDefaultAsync(t => t.Id == request.TestId, ct);

            if (test is null)
            {
                return Results.NotFound(new { error = "Test not found" });
            }

            if (!test.DepartmentId.HasValue)
            {
                return Results.BadRequest(new { error = "Test must be associated with a department" });
            }

            // Check if user already has a pending request for this test
            var existingRequest = await db.PrintRequests
                .FirstOrDefaultAsync(pr => 
                    pr.TestId == request.TestId && 
                    pr.RequestedByUserId == userId && 
                    pr.Status == PrintRequestStatus.Pending, 
                    ct);

            if (existingRequest is not null)
            {
                return Results.BadRequest(new { error = "You already have a pending print request for this test" });
            }

            var printRequest = new PrintRequest
            {
                PrintRequestId = Guid.NewGuid(),
                TestId = request.TestId,
                RequestedByUserId = userId,
                DepartmentId = test.DepartmentId.Value,
                Status = PrintRequestStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                Notes = request.Notes,
                CopiesRequested = request.CopiesRequested > 0 ? request.CopiesRequested : 1
            };

            db.PrintRequests.Add(printRequest);
            await db.SaveChangesAsync(ct);

            return Results.Created(
                $"/api/printrequests/{printRequest.PrintRequestId}",
                new { printRequestId = printRequest.PrintRequestId, status = "Pending" }
            );
        })
        .RequireAuthorization()
        .WithTags("PrintRequests");
    }
}
