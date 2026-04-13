using Databank.Database;
using Databank.Entities;
using Databank.Features.Subjects;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Databank.Features.Topics;

public static class TopicPermissionResolver
{
    public const string OwnershipTransferredAction = "OwnershipTransferred";
    public const string RequestAction = "EditRequestCreated";
    public const string ApproveEditOnlyAction = "EditRequestApproved";
    public const string ApproveEditDeleteAction = "EditRequestApprovedWithDelete";
    public const string RejectAction = "EditRequestRejected";
    public const string RevokeAction = "EditPermissionRevoked";
    public const string RequestEntityType = "Topic";
    public const string ResolutionEntityType = "TopicEditRequest";

    private static readonly string[] OwnerCreationActions =
    {
        "Created",
        "Imported",
        "Seeded",
        "TopicCreated"
    };

    public static async Task<Dictionary<int, Guid?>> ResolveOwnerIdsAsync(
        AppDbContext dbContext,
        IReadOnlyCollection<int> topicIds,
        CancellationToken ct)
    {
        var ownerByTopicId = topicIds
            .Distinct()
            .ToDictionary(id => id, _ => (Guid?)null);

        if (ownerByTopicId.Count == 0)
        {
            return ownerByTopicId;
        }

        var ownerRows = await dbContext.ActivityLogs
            .AsNoTracking()
            .Where(a =>
                a.Category == "Topics" &&
                a.EntityType == RequestEntityType &&
                a.EntityId.HasValue &&
                topicIds.Contains(a.EntityId.Value) &&
                a.UserId.HasValue &&
                OwnerCreationActions.Contains(a.Action))
            .OrderBy(a => a.CreatedAt)
            .ThenBy(a => a.Id)
            .Select(a => new { TopicId = a.EntityId!.Value, OwnerId = a.UserId!.Value })
            .ToListAsync(ct);

        var transferRows = await dbContext.ActivityLogs
            .AsNoTracking()
            .Where(a =>
                a.Category == "Topics" &&
                a.EntityType == RequestEntityType &&
                a.EntityId.HasValue &&
                topicIds.Contains(a.EntityId.Value) &&
                a.UserId.HasValue &&
                a.Action == OwnershipTransferredAction)
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .Select(a => new { TopicId = a.EntityId!.Value, OwnerId = a.UserId!.Value })
            .ToListAsync(ct);

        foreach (var row in transferRows)
        {
            if (!ownerByTopicId[row.TopicId].HasValue)
            {
                ownerByTopicId[row.TopicId] = row.OwnerId;
            }
        }

        foreach (var row in ownerRows)
        {
            if (!ownerByTopicId[row.TopicId].HasValue)
            {
                ownerByTopicId[row.TopicId] = row.OwnerId;
            }
        }

        return ownerByTopicId;
    }

    public static async Task<Dictionary<int, (bool CanEdit, bool CanDelete)>> ResolvePermissionsForUserAsync(
        AppDbContext dbContext,
        Guid currentUserId,
        IReadOnlyCollection<int> topicIds,
        CancellationToken ct)
    {
        var permissions = topicIds
            .Distinct()
            .ToDictionary(id => id, _ => (CanEdit: false, CanDelete: false));

        if (permissions.Count == 0)
        {
            return permissions;
        }

        var isAdmin = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(u => u.UserId == currentUserId && u.IsAdmin, ct);
        if (isAdmin)
        {
            foreach (var topicId in permissions.Keys.ToList())
            {
                permissions[topicId] = (true, true);
            }

            return permissions;
        }

        var deanDepartmentIds = await dbContext.UserDepartments
            .AsNoTracking()
            .Where(ud => ud.UserId == currentUserId && ud.RoleScope == UserDepartment.DeanRoleScope)
            .Select(ud => ud.DepartmentId)
            .Distinct()
            .ToListAsync(ct);

        if (deanDepartmentIds.Count > 0)
        {
            var topicDepartmentRows = await dbContext.Topics
                .AsNoTracking()
                .Where(t => permissions.Keys.Contains(t.Id))
                .Select(t => new { t.Id, DepartmentId = t.Subject.Course.DepartmentId })
                .ToListAsync(ct);

            foreach (var row in topicDepartmentRows)
            {
                if (deanDepartmentIds.Contains(row.DepartmentId))
                {
                    permissions[row.Id] = (true, true);
                }
            }
        }

        var ownerByTopicId = await ResolveOwnerIdsAsync(dbContext, permissions.Keys.ToList(), ct);
        foreach (var (topicId, ownerId) in ownerByTopicId)
        {
            if (ownerId.HasValue && ownerId.Value == currentUserId)
            {
                permissions[topicId] = (true, true);
            }
        }

        var topicIdsWithoutOwnerRights = permissions
            .Where(kvp => !kvp.Value.CanEdit)
            .Select(kvp => kvp.Key)
            .ToList();

        if (topicIdsWithoutOwnerRights.Count > 0)
        {
            var topicToSubjectRows = await dbContext.Topics
                .AsNoTracking()
                .Where(t => topicIdsWithoutOwnerRights.Contains(t.Id))
                .Select(t => new { t.Id, t.SubjectId })
                .ToListAsync(ct);

            if (topicToSubjectRows.Count > 0)
            {
                var subjectIds = topicToSubjectRows
                    .Select(row => row.SubjectId)
                    .Distinct()
                    .ToList();

                var subjectOwnerById = await SubjectPermissionResolver.ResolveOwnerIdsAsync(dbContext, subjectIds, ct);
                foreach (var row in topicToSubjectRows)
                {
                    if (subjectOwnerById.TryGetValue(row.SubjectId, out var ownerId) &&
                        ownerId.HasValue &&
                        ownerId.Value == currentUserId)
                    {
                        permissions[row.Id] = (true, true);
                    }
                }

                var subjectPermissions = await SubjectPermissionResolver.ResolvePermissionsForUserAsync(
                    dbContext,
                    currentUserId,
                    subjectIds,
                    ct);

                foreach (var row in topicToSubjectRows)
                {
                    if (!subjectPermissions.TryGetValue(row.SubjectId, out var subjectPerms) || !subjectPerms.CanEdit)
                    {
                        continue;
                    }

                    permissions[row.Id] = subjectPerms.CanDelete ? (true, true) : (true, false);
                }
            }
        }

        var remainingTopicIds = permissions
            .Where(kvp => !kvp.Value.CanEdit)
            .Select(kvp => kvp.Key)
            .ToList();

        if (remainingTopicIds.Count == 0)
        {
            return permissions;
        }

        var requestRows = await dbContext.ActivityLogs
            .AsNoTracking()
            .Where(a =>
                a.Action == RequestAction &&
                a.EntityType == RequestEntityType &&
                a.EntityId.HasValue &&
                remainingTopicIds.Contains(a.EntityId.Value) &&
                a.UserId == currentUserId)
            .Select(a => new { RequestId = (int)a.Id, TopicId = a.EntityId!.Value })
            .ToListAsync(ct);

        if (requestRows.Count == 0)
        {
            return permissions;
        }

        var requestById = requestRows.ToDictionary(r => r.RequestId, r => r.TopicId);
        var requestIds = requestRows.Select(r => r.RequestId).Distinct().ToList();

        var resolutionRows = await dbContext.ActivityLogs
            .AsNoTracking()
            .Where(a =>
                a.EntityType == ResolutionEntityType &&
                a.EntityId.HasValue &&
                requestIds.Contains(a.EntityId.Value) &&
                (a.Action == ApproveEditOnlyAction ||
                 a.Action == ApproveEditDeleteAction ||
                 a.Action == RevokeAction))
            .Select(a => new { RequestId = a.EntityId!.Value, a.Action, a.CreatedAt, a.Id })
            .ToListAsync(ct);

        var latestResolutionByTopicId = resolutionRows
            .Where(r => requestById.ContainsKey(r.RequestId))
            .Select(r => new
            {
                TopicId = requestById[r.RequestId],
                r.Action,
                r.CreatedAt,
                r.Id
            })
            .GroupBy(row => row.TopicId)
            .ToDictionary(
                group => group.Key,
                group => group.OrderByDescending(row => row.CreatedAt).ThenByDescending(row => row.Id).First());

        foreach (var (topicId, resolution) in latestResolutionByTopicId)
        {
            if (resolution.Action == ApproveEditDeleteAction)
            {
                permissions[topicId] = (true, true);
            }
            else if (resolution.Action == ApproveEditOnlyAction)
            {
                permissions[topicId] = (true, false);
            }
            else if (resolution.Action == RevokeAction)
            {
                permissions[topicId] = (false, false);
            }
        }

        return permissions;
    }

    public static Guid? GetCurrentUserId(ClaimsPrincipal user)
    {
        var claimValue = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirst("sub")?.Value
            ?? user.FindFirst("userId")?.Value
            ?? user.FindFirst("UserId")?.Value
            ?? user.FindFirst("userid")?.Value
            ?? user.FindFirst("user_id")?.Value
            ?? user.FindFirst("nameid")?.Value
            ?? user.FindFirst("uid")?.Value;

        return Guid.TryParse(claimValue, out var parsed) ? parsed : null;
    }
}