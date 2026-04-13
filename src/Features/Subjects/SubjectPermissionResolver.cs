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
            var subjectDepartmentRows = await dbContext.Subjects
                .AsNoTracking()
                .Where(s => permissions.Keys.Contains(s.Id))
                .Select(s => new { s.Id, DepartmentId = s.Course.DepartmentId })
                .ToListAsync(ct);

            foreach (var row in subjectDepartmentRows)
            {
                if (deanDepartmentIds.Contains(row.DepartmentId))
                {
                    permissions[row.Id] = (true, true);
                }
            }
        }

        var ownerBySubjectId = await ResolveOwnerIdsAsync(dbContext, permissions.Keys.ToList(), ct);
        foreach (var (subjectId, ownerId) in ownerBySubjectId)
        {
            if (ownerId.HasValue && ownerId.Value == currentUserId)
            {
                permissions[subjectId] = (true, true);
            }
        }

        var remainingSubjectIds = permissions
            .Where(kvp => !kvp.Value.CanEdit)
            .Select(kvp => kvp.Key)
            .ToList();

        if (remainingSubjectIds.Count == 0)
        {
            return permissions;
        }

        var requestRows = await dbContext.ActivityLogs
            .AsNoTracking()
            .Where(a =>
                a.Action == RequestAction &&
                a.EntityType == RequestEntityType &&
                a.EntityId.HasValue &&
                remainingSubjectIds.Contains(a.EntityId.Value) &&
                a.UserId == currentUserId)
            .Select(a => new { RequestId = (int)a.Id, SubjectId = a.EntityId!.Value })
            .ToListAsync(ct);

        if (requestRows.Count == 0)
        {
            return permissions;
        }

        var requestById = requestRows.ToDictionary(r => r.RequestId, r => r.SubjectId);
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

        var latestResolutionBySubjectId = resolutionRows
            .Where(r => requestById.ContainsKey(r.RequestId))
            .Select(r => new
            {
                SubjectId = requestById[r.RequestId],
                r.Action,
                r.CreatedAt,
                r.Id
            })
            .GroupBy(row => row.SubjectId)
            .ToDictionary(
                group => group.Key,
                group => group.OrderByDescending(row => row.CreatedAt).ThenByDescending(row => row.Id).First());

        foreach (var (subjectId, resolution) in latestResolutionBySubjectId)
        {
            if (resolution.Action == ApproveEditDeleteAction)
            {
                permissions[subjectId] = (true, true);
            }
            else if (resolution.Action == ApproveEditOnlyAction)
            {
                permissions[subjectId] = (true, false);
            }
            else if (resolution.Action == RevokeAction)
            {
                permissions[subjectId] = (false, false);
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