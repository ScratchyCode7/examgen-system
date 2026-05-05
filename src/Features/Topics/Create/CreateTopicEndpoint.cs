using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Topics;
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

                var hasDepartmentAccess = await dbContext.UserDepartments
                    .AsNoTracking()
                    .AnyAsync(ud => ud.UserId == userId && ud.DepartmentId == subject.Course.DepartmentId, ct);

                var hasCourseAccess = await dbContext.UserCourses
                    .AsNoTracking()
                    .AnyAsync(uc => uc.UserId == userId && uc.CourseId == subject.CourseId, ct);

                if (!hasDepartmentAccess || !hasCourseAccess)
                {
                    return TypedResults.Problem(
                        "You do not have permission to create topics for this course.",
                        statusCode: StatusCodes.Status403Forbidden);
                }
            }

            var normalizedTitle = DuplicateKeyNormalizer.NormalizeKey(request.Title);
            if (string.IsNullOrWhiteSpace(normalizedTitle))
            {
                return TypedResults.BadRequest("Topic title is required.");
            }

            var siblingTitles = await dbContext.Topics
                .AsNoTracking()
                .Where(t => t.SubjectId == request.SubjectId)
                .Select(t => t.Title)
                .ToListAsync(ct);

            var duplicateExists = siblingTitles.Any(title => DuplicateKeyNormalizer.NormalizeKey(title) == normalizedTitle);
            if (duplicateExists)
            {
                return TypedResults.Conflict($"Topic '{request.Title}' already exists in this subject.");
            }

            var topic = new Topic
            {
                SubjectId = request.SubjectId,
                Title = request.Title.Trim(),
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

            if (creatorId.HasValue && !isAdminUser)
            {
                var alreadyAssigned = await dbContext.UserTopics
                    .AsNoTracking()
                    .AnyAsync(ut => ut.UserId == creatorId.Value && ut.TopicId == topic.Id, ct);

                if (!alreadyAssigned)
                {
                    dbContext.UserTopics.Add(new UserTopic
                    {
                        UserId = creatorId.Value,
                        TopicId = topic.Id,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });

                    await dbContext.SaveChangesAsync(ct);
                }
            }

            var isAdminCreator = string.Equals(
                httpContext.User.FindFirst("isAdmin")?.Value,
                "true",
                StringComparison.OrdinalIgnoreCase);

            return TypedResults.Created(
                $"/api/topics/{topic.Id}",
                topic.ToResponse(canEdit: isAdminCreator, canDelete: isAdminCreator));
        }).RequireAuthorization();
    }
}
