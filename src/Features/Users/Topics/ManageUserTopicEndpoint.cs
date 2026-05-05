using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.Topics;

public sealed class ManageUserTopicEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/users/{userId:guid}/topics/{topicId:int}", AddTopicAsync)
            .RequireAuthorization("AdminOnly");

        app.MapDelete("/api/users/{userId:guid}/topics/{topicId:int}", RemoveTopicAsync)
            .RequireAuthorization("AdminOnly");
    }

    private static async Task<IResult> AddTopicAsync(
        Guid userId,
        int topicId,
        AppDbContext dbContext,
        CancellationToken ct)
    {
        var user = await dbContext.Users
            .Include(u => u.UserDepartments)
            .Include(u => u.UserCourses)
            .Include(u => u.UserTopics)
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);

        if (user is null)
        {
            return TypedResults.NotFound("User not found.");
        }

        var topicInfo = await dbContext.Topics
            .AsNoTracking()
            .Select(t => new
            {
                t.Id,
                CourseId = t.Subject.CourseId,
                DepartmentId = t.Subject.Course.DepartmentId
            })
            .FirstOrDefaultAsync(t => t.Id == topicId, ct);

        if (topicInfo is null)
        {
            return TypedResults.NotFound("Topic not found.");
        }

        var allowedDepartments = user.UserDepartments
            .Select(ud => ud.DepartmentId)
            .ToHashSet();

        if (!allowedDepartments.Contains(topicInfo.DepartmentId))
        {
            return TypedResults.BadRequest("The selected topic is outside the user's assigned departments.");
        }

        var allowedCourses = user.UserCourses
            .Select(uc => uc.CourseId)
            .ToHashSet();

        if (!allowedCourses.Contains(topicInfo.CourseId))
        {
            return TypedResults.BadRequest("The selected topic is outside the user's assigned courses.");
        }

        var alreadyAssigned = user.UserTopics.Any(ut => ut.TopicId == topicId);
        if (!alreadyAssigned)
        {
            user.UserTopics.Add(new UserTopic
            {
                UserId = userId,
                TopicId = topicId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await dbContext.SaveChangesAsync(ct);
        }

        return TypedResults.Ok(new { message = "Topic access granted.", topicId, added = !alreadyAssigned });
    }

    private static async Task<IResult> RemoveTopicAsync(
        Guid userId,
        int topicId,
        AppDbContext dbContext,
        CancellationToken ct)
    {
        var user = await dbContext.Users
            .Include(u => u.UserTopics)
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);

        if (user is null)
        {
            return TypedResults.NotFound("User not found.");
        }

        var assignment = user.UserTopics.FirstOrDefault(ut => ut.TopicId == topicId);
        if (assignment is null)
        {
            return TypedResults.Ok(new { message = "Topic access already absent.", topicId, removed = false });
        }

        dbContext.UserTopics.Remove(assignment);
        await dbContext.SaveChangesAsync(ct);

        return TypedResults.Ok(new { message = "Topic access revoked.", topicId, removed = true });
    }
}
