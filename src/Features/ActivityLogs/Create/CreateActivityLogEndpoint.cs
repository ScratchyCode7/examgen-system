using System.Security.Claims;
using Databank.Abstract;
using Databank.Services;

namespace Databank.Features.ActivityLogs.Create;

public sealed class CreateActivityLogEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/activity-logs", async Task<IResult> (
                CreateActivityLogRequest request,
                ILoggingService loggingService,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(request.Category) || string.IsNullOrWhiteSpace(request.Action))
            {
                return TypedResults.BadRequest("Category and action are required.");
            }

            var userIdClaim = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? httpContext.User.FindFirst("sub")?.Value
                ?? httpContext.User.FindFirst("userId")?.Value;

            var category = request.Category.Trim();
            var action = request.Action.Trim();
            var details = string.IsNullOrWhiteSpace(request.Details) ? null : request.Details.Trim();
            var hasEntityContext = !string.IsNullOrWhiteSpace(request.EntityType) || request.EntityId.HasValue;

            if (hasEntityContext)
            {
                await loggingService.LogActivityAsync(
                    userIdClaim,
                    category,
                    action,
                    string.IsNullOrWhiteSpace(request.EntityType) ? "Activity" : request.EntityType.Trim(),
                    request.EntityId,
                    details);
            }
            else
            {
                await loggingService.LogActivityAsync(userIdClaim, category, action, details);
            }

            return TypedResults.Ok(new { success = true });
        }).RequireAuthorization();
    }
}

public sealed class CreateActivityLogRequest
{
    public string Category { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public int? EntityId { get; set; }
    public string? Details { get; set; }
}
