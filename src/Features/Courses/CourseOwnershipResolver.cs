using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Courses;

public static class CourseOwnershipResolver
{
    public const string OwnershipTransferredAction = "OwnershipTransferred";

    private static readonly string[] OwnerCreationActions =
    {
        "Created",
        "Imported",
        "Seeded",
        "CourseCreated"
    };

    public static async Task<Dictionary<int, Guid?>> ResolveOwnerIdsAsync(
        AppDbContext dbContext,
        IReadOnlyCollection<int> courseIds,
        CancellationToken ct)
    {
        var ownerByCourseId = courseIds
            .Distinct()
            .ToDictionary(id => id, _ => (Guid?)null);

        if (ownerByCourseId.Count == 0)
        {
            return ownerByCourseId;
        }

        var transferRows = await dbContext.ActivityLogs
            .AsNoTracking()
            .Where(a =>
                a.Category == "Courses" &&
                a.EntityType == "Course" &&
                a.EntityId.HasValue &&
                courseIds.Contains(a.EntityId.Value) &&
                a.UserId.HasValue &&
                a.Action == OwnershipTransferredAction)
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .Select(a => new { CourseId = a.EntityId!.Value, OwnerId = a.UserId!.Value })
            .ToListAsync(ct);

        foreach (var row in transferRows)
        {
            if (!ownerByCourseId[row.CourseId].HasValue)
            {
                ownerByCourseId[row.CourseId] = row.OwnerId;
            }
        }

        var unresolvedCourseIds = ownerByCourseId
            .Where(kvp => !kvp.Value.HasValue)
            .Select(kvp => kvp.Key)
            .ToList();

        if (unresolvedCourseIds.Count == 0)
        {
            return ownerByCourseId;
        }

        var creationRows = await dbContext.ActivityLogs
            .AsNoTracking()
            .Where(a =>
                a.Category == "Courses" &&
                a.EntityType == "Course" &&
                a.EntityId.HasValue &&
                unresolvedCourseIds.Contains(a.EntityId.Value) &&
                a.UserId.HasValue &&
                OwnerCreationActions.Contains(a.Action))
            .OrderBy(a => a.CreatedAt)
            .ThenBy(a => a.Id)
            .Select(a => new { CourseId = a.EntityId!.Value, OwnerId = a.UserId!.Value })
            .ToListAsync(ct);

        foreach (var row in creationRows)
        {
            if (!ownerByCourseId[row.CourseId].HasValue)
            {
                ownerByCourseId[row.CourseId] = row.OwnerId;
            }
        }

        return ownerByCourseId;
    }
}
