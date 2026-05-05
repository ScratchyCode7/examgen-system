using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Databank.Features.Subjects;

public static class SubjectPermissionResolver
{
    public const string OwnershipTransferredAction = "OwnershipTransferred";
    public const string RequestAction = "EditRequestCreated";
    public const string ApproveEditOnlyAction = "EditRequestApproved";
    public const string ApproveEditDeleteAction = "EditRequestApprovedWithDelete";
    public const string RejectAction = "EditRequestRejected";
    public const string RevokeAction = "EditPermissionRevoked";
    public const string RequestEntityType = "Subject";
    public const string ResolutionEntityType = "SubjectEditRequest";

    private static readonly string[] OwnerCreationActions =
    {
        "Created",
        "Imported",
        "Seeded",
        "SubjectCreated"
    };

    public static async Task<Dictionary<int, Guid?>> ResolveOwnerIdsAsync(
        AppDbContext dbContext,
        IReadOnlyCollection<int> subjectIds,
        CancellationToken ct)
    {
        var ownerBySubjectId = subjectIds
            .Distinct()
            .ToDictionary(id => id, _ => (Guid?)null);

        if (ownerBySubjectId.Count == 0)
        {
            return ownerBySubjectId;
        }

        var ownerRows = await dbContext.ActivityLogs
            .AsNoTracking()
            .Where(a =>
                a.Category == "Subjects" &&
                a.EntityType == RequestEntityType &&
                a.EntityId.HasValue &&
                subjectIds.Contains(a.EntityId.Value) &&
                a.UserId.HasValue &&
                OwnerCreationActions.Contains(a.Action))
            .OrderBy(a => a.CreatedAt)
            .ThenBy(a => a.Id)
            .Select(a => new { SubjectId = a.EntityId!.Value, OwnerId = a.UserId!.Value })
            .ToListAsync(ct);

        var transferRows = await dbContext.ActivityLogs
            .AsNoTracking()
            .Where(a =>
                a.Category == "Subjects" &&
                a.EntityType == RequestEntityType &&
                a.EntityId.HasValue &&
                subjectIds.Contains(a.EntityId.Value) &&
                a.UserId.HasValue &&
                a.Action == OwnershipTransferredAction)
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .Select(a => new { SubjectId = a.EntityId!.Value, OwnerId = a.UserId!.Value })
            .ToListAsync(ct);

        foreach (var row in transferRows)
        {
            if (!ownerBySubjectId[row.SubjectId].HasValue)
            {
                ownerBySubjectId[row.SubjectId] = row.OwnerId;
            }
        }

        foreach (var row in ownerRows)
        {
            if (!ownerBySubjectId[row.SubjectId].HasValue)
            {
                ownerBySubjectId[row.SubjectId] = row.OwnerId;
            }
        }

        return ownerBySubjectId;
    }

    public static async Task<Dictionary<int, (bool CanEdit, bool CanDelete)>> ResolvePermissionsForUserAsync(
        AppDbContext dbContext,
        Guid currentUserId,
        IReadOnlyCollection<int> subjectIds,
        CancellationToken ct)
    {
        var permissions = subjectIds
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
            foreach (var subjectId in permissions.Keys.ToList())
            {
                permissions[subjectId] = (true, true);
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