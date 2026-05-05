using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Topics;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Topics.Access;

public sealed record GrantTopicAccessRequest(
    Guid TargetUserId,
    bool CanDelete = false,
    string? Note = null);

public sealed class GrantTopicAccessEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/topics/{topicId:int}/grant-access", GrantAccessAsync)
            .RequireAuthorization("AdminOnly");
    }

    private static async Task<IResult> GrantAccessAsync(
        int topicId,
        GrantTopicAccessRequest request,
        AppDbContext dbContext,
        HttpContext httpContext,
        CancellationToken ct)
    {
        if (request.TargetUserId == Guid.Empty)
        {
            return TypedResults.BadRequest(new { message = "Target user is required." });
        }

        var topic = await dbContext.Topics
            .AsNoTracking()
            .Select(t => new
            {
                t.Id,
                CourseId = t.Subject.CourseId,
                DepartmentId = t.Subject.Course.DepartmentId
            })
            .FirstOrDefaultAsync(t => t.Id == topicId, ct);

        if (topic is null)
        {
            return TypedResults.NotFound(new { message = "Topic not found." });
        }

        var targetUser = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == request.TargetUserId, ct);

        if (targetUser is null)
        {
            return TypedResults.BadRequest(new { message = "Target user not found." });
        }

        if (!targetUser.IsActive)
        {
            return TypedResults.BadRequest(new { message = "Target user is inactive." });
        }

        var enrolledInCourse = await dbContext.UserCourses
            .AsNoTracking()
            .AnyAsync(uc => uc.UserId == request.TargetUserId && uc.CourseId == topic.CourseId, ct);

        if (!enrolledInCourse)
        {
            return TypedResults.BadRequest(new { message = "User must be added to the course before granting topic access." });
        }

        var assignedToDepartment = await dbContext.UserDepartments
            .AsNoTracking()
            .AnyAsync(ud => ud.UserId == request.TargetUserId && ud.DepartmentId == topic.DepartmentId, ct);

        if (!assignedToDepartment)
        {
            return TypedResults.BadRequest(new { message = "User must be added to the department before granting topic access." });
        }

        var alreadyAssigned = await dbContext.UserTopics
            .AsNoTracking()
            .AnyAsync(ut => ut.UserId == request.TargetUserId && ut.TopicId == topicId, ct);

        if (alreadyAssigned)
        {
            return TypedResults.Conflict(new { message = "User already has access to this topic." });
        }

        dbContext.UserTopics.Add(new UserTopic
        {
            UserId = request.TargetUserId,
            TopicId = topicId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(ct);

        return TypedResults.Ok(new
        {
            message = "Topic access granted.",
            topicId = topic.Id,
            targetUserId = request.TargetUserId,
            canDelete = request.CanDelete
        });
    }
}
