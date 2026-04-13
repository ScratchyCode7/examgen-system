using Databank.Database;
using Databank.Entities;
using Databank.Features.Courses;
using Databank.Features.Questions;
using Databank.Features.Subjects;
using Databank.Features.Topics;
using Microsoft.EntityFrameworkCore;

namespace Databank.Services;

public sealed record OwnershipSummary(int Courses, int Subjects, int Topics, int Questions);

public interface IUserOwnershipTransferService
{
    Task<OwnershipSummary> GetOwnershipSummaryAsync(Guid userId, CancellationToken ct = default);
    Task<OwnershipSummary> TransferOwnershipAsync(Guid sourceUserId, Guid targetUserId, bool deactivateSourceUser, CancellationToken ct = default);
}

public sealed class UserOwnershipTransferService(AppDbContext dbContext) : IUserOwnershipTransferService
{
    private const string OwnershipTransferredAction = "OwnershipTransferred";

    public async Task<OwnershipSummary> GetOwnershipSummaryAsync(Guid userId, CancellationToken ct = default)
    {
        var courseIds = await GetOwnedCourseIdsAsync(userId, ct);
        var subjectIds = await GetOwnedSubjectIdsAsync(userId, ct);
        var topicIds = await GetOwnedTopicIdsAsync(userId, ct);
        var questionIds = await GetOwnedQuestionIdsAsync(userId, ct);

        return new OwnershipSummary(courseIds.Count, subjectIds.Count, topicIds.Count, questionIds.Count);
    }

    public async Task<OwnershipSummary> TransferOwnershipAsync(Guid sourceUserId, Guid targetUserId, bool deactivateSourceUser, CancellationToken ct = default)
    {
        if (sourceUserId == targetUserId)
        {
            return new OwnershipSummary(0, 0, 0, 0);
        }

        var sourceUser = await dbContext.Users.FirstOrDefaultAsync(u => u.UserId == sourceUserId, ct);
        var targetUser = await dbContext.Users.FirstOrDefaultAsync(u => u.UserId == targetUserId, ct);

        if (sourceUser is null || targetUser is null)
        {
            return new OwnershipSummary(0, 0, 0, 0);
        }

        var courseIds = await GetOwnedCourseIdsAsync(sourceUserId, ct);
        var subjectIds = await GetOwnedSubjectIdsAsync(sourceUserId, ct);
        var topicIds = await GetOwnedTopicIdsAsync(sourceUserId, ct);
        var questionIds = await GetOwnedQuestionIdsAsync(sourceUserId, ct);

        if (questionIds.Count > 0)
        {
            var questions = await dbContext.Questions
                .Where(q => questionIds.Contains(q.Id))
                .ToListAsync(ct);

            foreach (var question in questions)
            {
                question.CreatedByUserId = targetUserId;
                question.UpdatedAt = DateTime.UtcNow;
            }
        }

        var tests = await dbContext.Tests
            .Where(t => t.CreatedByUserId == sourceUserId)
            .ToListAsync(ct);

        foreach (var test in tests)
        {
            test.CreatedByUserId = targetUserId;
            test.UpdatedAt = DateTime.UtcNow;
        }

        await AddOwnershipTransferLogsAsync("Courses", "Course", courseIds, targetUserId, ct);
        await AddOwnershipTransferLogsAsync("Subjects", "Subject", subjectIds, targetUserId, ct);
        await AddOwnershipTransferLogsAsync("Topics", "Topic", topicIds, targetUserId, ct);
        await AddOwnershipTransferLogsAsync("Questions", "Question", questionIds, targetUserId, ct);

        if (deactivateSourceUser)
        {
            sourceUser.IsActive = false;
            sourceUser.UpdatedAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(ct);

        return new OwnershipSummary(courseIds.Count, subjectIds.Count, topicIds.Count, questionIds.Count);
    }

    private async Task<List<int>> GetOwnedCourseIdsAsync(Guid userId, CancellationToken ct)
    {
        var courseIds = await dbContext.Courses
            .AsNoTracking()
            .Select(c => c.Id)
            .ToListAsync(ct);

        var ownerByCourse = await CourseOwnershipResolver.ResolveOwnerIdsAsync(dbContext, courseIds, ct);
        return ownerByCourse
            .Where(kvp => kvp.Value.HasValue && kvp.Value.Value == userId)
            .Select(kvp => kvp.Key)
            .ToList();
    }

    private async Task<List<int>> GetOwnedSubjectIdsAsync(Guid userId, CancellationToken ct)
    {
        var subjectIds = await dbContext.Subjects
            .AsNoTracking()
            .Select(s => s.Id)
            .ToListAsync(ct);

        var ownerBySubject = await SubjectPermissionResolver.ResolveOwnerIdsAsync(dbContext, subjectIds, ct);
        return ownerBySubject
            .Where(kvp => kvp.Value.HasValue && kvp.Value.Value == userId)
            .Select(kvp => kvp.Key)
            .ToList();
    }

    private async Task<List<int>> GetOwnedTopicIdsAsync(Guid userId, CancellationToken ct)
    {
        var topicIds = await dbContext.Topics
            .AsNoTracking()
            .Select(t => t.Id)
            .ToListAsync(ct);

        var ownerByTopic = await TopicPermissionResolver.ResolveOwnerIdsAsync(dbContext, topicIds, ct);
        return ownerByTopic
            .Where(kvp => kvp.Value.HasValue && kvp.Value.Value == userId)
            .Select(kvp => kvp.Key)
            .ToList();
    }

    private async Task<List<int>> GetOwnedQuestionIdsAsync(Guid userId, CancellationToken ct)
    {
        var explicitQuestionIds = await dbContext.Questions
            .AsNoTracking()
            .Where(q => q.CreatedByUserId == userId)
            .Select(q => q.Id)
            .ToListAsync(ct);

        var unresolvedQuestionIds = await dbContext.Questions
            .AsNoTracking()
            .Where(q => !q.CreatedByUserId.HasValue)
            .Select(q => q.Id)
            .ToListAsync(ct);

        if (unresolvedQuestionIds.Count == 0)
        {
            return explicitQuestionIds;
        }

        var ownerByQuestion = await QuestionPermissionResolver.ResolveOwnerIdsAsync(dbContext, unresolvedQuestionIds, ct);
        var inferredQuestionIds = ownerByQuestion
            .Where(kvp => kvp.Value.HasValue && kvp.Value.Value == userId)
            .Select(kvp => kvp.Key)
            .ToList();

        return explicitQuestionIds
            .Concat(inferredQuestionIds)
            .Distinct()
            .ToList();
    }

    private async Task AddOwnershipTransferLogsAsync(
        string category,
        string entityType,
        IReadOnlyCollection<int> entityIds,
        Guid targetUserId,
        CancellationToken ct)
    {
        if (entityIds.Count == 0)
        {
            return;
        }

        var departmentByEntity = entityType switch
        {
            "Course" => await dbContext.Courses
                .AsNoTracking()
                .Where(c => entityIds.Contains(c.Id))
                .Select(c => new { c.Id, c.DepartmentId })
                .ToDictionaryAsync(c => c.Id, c => c.DepartmentId, ct),
            "Subject" => await dbContext.Subjects
                .AsNoTracking()
                .Where(s => entityIds.Contains(s.Id))
                .Select(s => new { s.Id, DepartmentId = s.Course.DepartmentId })
                .ToDictionaryAsync(s => s.Id, s => s.DepartmentId, ct),
            "Topic" => await dbContext.Topics
                .AsNoTracking()
                .Where(t => entityIds.Contains(t.Id))
                .Select(t => new { t.Id, DepartmentId = t.Subject.Course.DepartmentId })
                .ToDictionaryAsync(t => t.Id, t => t.DepartmentId, ct),
            "Question" => await dbContext.Questions
                .AsNoTracking()
                .Where(q => entityIds.Contains(q.Id))
                .Select(q => new { q.Id, DepartmentId = q.Topic.Subject.Course.DepartmentId })
                .ToDictionaryAsync(q => q.Id, q => q.DepartmentId, ct),
            _ => new Dictionary<int, int>()
        };

        var now = DateTime.UtcNow;
        var logs = entityIds
            .Where(id => departmentByEntity.ContainsKey(id))
            .Select(id => new ActivityLog
            {
                DepartmentId = departmentByEntity[id],
                UserId = targetUserId,
                Category = category,
                Action = OwnershipTransferredAction,
                EntityType = entityType,
                EntityId = id,
                Details = "Ownership transferred by administrator.",
                Severity = "Info",
                CreatedAt = now
            })
            .ToList();

        if (logs.Count > 0)
        {
            await dbContext.ActivityLogs.AddRangeAsync(logs, ct);
        }
    }
}
