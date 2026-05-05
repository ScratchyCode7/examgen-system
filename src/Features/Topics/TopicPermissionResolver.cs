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
        // Only admins may edit or delete topics. Non-admins have no edit/delete permissions.
        if (isAdmin)
        {
            foreach (var topicId in permissions.Keys.ToList())
            {
                permissions[topicId] = (true, true);
            }
        }

        return permissions;
    }

    public static async Task<HashSet<int>> ResolveViewAccessForUserAsync(
        AppDbContext dbContext,
        Guid currentUserId,
        IReadOnlyCollection<int> topicIds,
        CancellationToken ct)
    {
        var distinctTopicIds = topicIds.Distinct().ToList();
        if (distinctTopicIds.Count == 0)
        {
            return new HashSet<int>();
        }

        var isAdmin = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(u => u.UserId == currentUserId && u.IsAdmin, ct);
        if (isAdmin)
        {
            return distinctTopicIds.ToHashSet();
        }

        var accessibleTopicIds = await dbContext.UserTopics
            .AsNoTracking()
            .Where(ut => ut.UserId == currentUserId && distinctTopicIds.Contains(ut.TopicId))
            .Select(ut => ut.TopicId)
            .Distinct()
            .ToListAsync(ct);

        return accessibleTopicIds.ToHashSet();
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