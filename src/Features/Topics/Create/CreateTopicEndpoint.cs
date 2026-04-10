using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Topics;
using Databank.Services;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Topics.Create;

public sealed class CreateTopicEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/topics", async Task<IResult> (
                CreateTopicRequest request,
                AppDbContext dbContext,
                IDepartmentAccessService departmentAccessService,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var subject = await dbContext.Subjects
                .AsNoTracking()
                .Include(s => s.Course)
                .FirstOrDefaultAsync(s => s.Id == request.SubjectId, ct);

            if (subject is null)
            {
                return TypedResults.BadRequest("Subject not found.");
            }

            var isAdminUser = string.Equals(
                httpContext.User.FindFirst("isAdmin")?.Value,
                "true",
                StringComparison.OrdinalIgnoreCase);

            if (!isAdminUser)
            {
                var userIdClaim = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? httpContext.User.FindFirst("sub")?.Value
                    ?? httpContext.User.FindFirst("userId")?.Value;

                if (!Guid.TryParse(userIdClaim, out var userId))
                {
                    return TypedResults.Problem(
                        "Unable to determine the current user. Please sign in again and retry.",
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var hasAccess = await departmentAccessService.HasAccessToDepartmentAsync(userId, subject.Course.DepartmentId, ct);
                if (!hasAccess)
                {
                    return TypedResults.Problem(
                        "You do not have permission to create topics for this department.",
                        statusCode: StatusCodes.Status403Forbidden);
                }
            }

            var topic = new Topic
            {
                SubjectId = request.SubjectId,
                Title = request.Title,
                Description = request.Description,
                SequenceOrder = request.SequenceOrder,
                AllocatedHours = request.AllocatedHours,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await dbContext.Topics.AddAsync(topic, ct);
            await dbContext.SaveChangesAsync(ct);

            var creatorId = TopicPermissionResolver.GetCurrentUserId(httpContext.User);
            var isOwner = creatorId.HasValue;
            if (creatorId.HasValue)
            {
                dbContext.ActivityLogs.Add(new ActivityLog
                {
                    DepartmentId = subject.Course.DepartmentId,
                    UserId = creatorId.Value,
                    Category = "Topics",
                    Action = "Created",
                    EntityType = "Topic",
                    EntityId = topic.Id,
                    Details = $"Created topic: {topic.Title}",
                    Severity = "Info",
                    CreatedAt = DateTime.UtcNow
                });

                await dbContext.SaveChangesAsync(ct);
            }

            return TypedResults.Created($"/api/topics/{topic.Id}", topic.ToResponse(canEdit: isOwner, canDelete: isOwner));
        }).RequireAuthorization();
    }
}
