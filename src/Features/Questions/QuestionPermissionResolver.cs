using Databank.Database;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Databank.Features.Questions;

public static class QuestionPermissionResolver
{
    public const string RequestAction = "EditRequestCreated";
    public const string ApproveEditOnlyAction = "EditRequestApproved";
    public const string ApproveEditDeleteAction = "EditRequestApprovedWithDelete";
    public const string RejectAction = "EditRequestRejected";
    public const string RevokeAction = "EditPermissionRevoked";
    public const string RequestEntityType = "Question";
    public const string ResolutionEntityType = "QuestionEditRequest";
    private static readonly string[] OwnerCreationActions =
    {
        "Created",
        "Imported",
        "Seeded",
        "Created Question",
        "QuestionCreated",
        "QuestionImported"
    };

    public static async Task<Dictionary<int, Guid?>> ResolveOwnerIdsAsync(
        AppDbContext dbContext,
        IReadOnlyCollection<int> questionIds,
        CancellationToken ct)
    {
        var ownerByQuestionId = new Dictionary<int, Guid?>();
        if (questionIds.Count == 0)
        {
            return ownerByQuestionId;
        }

        var questionRows = await dbContext.Questions
            .AsNoTracking()
            .Where(q => questionIds.Contains(q.Id))
            .Select(q => new { q.Id, q.CreatedByUserId })
            .ToListAsync(ct);

        foreach (var row in questionRows)
        {
            ownerByQuestionId[row.Id] = row.CreatedByUserId;
        }

        var missingOwnerQuestionIds = questionRows
            .Where(row => !row.CreatedByUserId.HasValue)
            .Select(row => row.Id)
            .ToList();

        if (missingOwnerQuestionIds.Count == 0)
        {
            return ownerByQuestionId;
        }

        var ownerFromLogs = await dbContext.ActivityLogs
            .AsNoTracking()
            .Where(a =>
                a.EntityType == "Question" &&
                a.EntityId.HasValue &&
                missingOwnerQuestionIds.Contains(a.EntityId.Value) &&
                a.UserId.HasValue &&
                OwnerCreationActions.Contains(a.Action))
            .OrderBy(a => a.CreatedAt)
            .ThenBy(a => a.Id)
            .Select(a => new { QuestionId = a.EntityId!.Value, OwnerId = a.UserId!.Value })
            .ToListAsync(ct);

        foreach (var owner in ownerFromLogs)
        {
            if (!ownerByQuestionId.TryGetValue(owner.QuestionId, out var existing) || !existing.HasValue)
            {
                ownerByQuestionId[owner.QuestionId] = owner.OwnerId;
            }
        }

        return ownerByQuestionId;
    }

    public static async Task<Dictionary<int, (bool CanEdit, bool CanDelete)>> ResolvePermissionsForUserAsync(
        AppDbContext dbContext,
        Guid currentUserId,
        IReadOnlyCollection<int> questionIds,
        CancellationToken ct)
    {
        var permissions = questionIds
            .Distinct()
            .ToDictionary(id => id, _ => (CanEdit: false, CanDelete: false));

        if (permissions.Count == 0)
        {
            return permissions;
        }

        var ownerByQuestionId = await ResolveOwnerIdsAsync(dbContext, permissions.Keys.ToList(), ct);
        foreach (var (questionId, ownerId) in ownerByQuestionId)
        {
            if (ownerId.HasValue && ownerId.Value == currentUserId)
            {
                permissions[questionId] = (true, true);
            }
        }

        var remainingQuestionIds = permissions
            .Where(kvp => !kvp.Value.CanEdit)
            .Select(kvp => kvp.Key)
            .ToList();

        if (remainingQuestionIds.Count == 0)
        {
            return permissions;
        }

        var requestRows = await dbContext.ActivityLogs
            .AsNoTracking()
            .Where(a =>
                a.Action == RequestAction &&
                a.EntityType == RequestEntityType &&
                a.EntityId.HasValue &&
                remainingQuestionIds.Contains(a.EntityId.Value) &&
                a.UserId == currentUserId)
            .Select(a => new { RequestId = (int)a.Id, QuestionId = a.EntityId!.Value })
            .ToListAsync(ct);

        if (requestRows.Count == 0)
        {
            return permissions;
        }

        var requestById = requestRows.ToDictionary(r => r.RequestId, r => r.QuestionId);
        var requestIds = requestRows
            .Select(row => row.RequestId)
            .Distinct()
            .ToList();

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

        var latestEffectiveResolutionByQuestionId = resolutionRows
            .Where(r => requestById.ContainsKey(r.RequestId))
            .Select(r => new
            {
                QuestionId = requestById[r.RequestId],
                r.Action,
                r.CreatedAt,
                r.Id
            })
            .GroupBy(row => row.QuestionId)
            .ToDictionary(
                group => group.Key,
                group => group.OrderByDescending(row => row.CreatedAt).ThenByDescending(row => row.Id).First());

        foreach (var (questionId, resolution) in latestEffectiveResolutionByQuestionId)
        {
            if (resolution.Action == ApproveEditDeleteAction)
            {
                permissions[questionId] = (true, true);
            }
            else if (resolution.Action == ApproveEditOnlyAction)
            {
                permissions[questionId] = (true, false);
            }
            else if (resolution.Action == RevokeAction)
            {
                permissions[questionId] = (false, false);
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
