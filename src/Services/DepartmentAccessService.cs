using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

#pragma warning disable CS0618 // Access legacy User.DepartmentId for backward compatibility

namespace Databank.Services;

public interface IDepartmentAccessService
{
    /// <summary>
    /// Gets all department IDs that a user has access to
    /// </summary>
    Task<int[]> GetUserDepartmentIdsAsync(Guid userId, CancellationToken ct = default);
    
    /// <summary>
    /// Checks if a user has access to a specific department
    /// </summary>
    Task<bool> HasAccessToDepartmentAsync(Guid userId, int departmentId, CancellationToken ct = default);
    
    /// <summary>
    /// Validates that all specified department IDs are accessible by the user
    /// </summary>
    Task<bool> HasAccessToAllDepartmentsAsync(Guid userId, int[] departmentIds, CancellationToken ct = default);
}

public sealed class DepartmentAccessService : IDepartmentAccessService
{
    private readonly AppDbContext _dbContext;

    public DepartmentAccessService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<int[]> GetUserDepartmentIdsAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.UserDepartments)
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);

        if (user == null)
        {
            return Array.Empty<int>();
        }

        // Admins have access to all departments
        if (user.IsAdmin)
        {
            return await _dbContext.Departments
                .Where(d => d.IsActive)
                .Select(d => d.Id)
                .ToArrayAsync(ct);
        }

        var assignedIds = user.UserDepartments
            .Select(ud => ud.DepartmentId)
            .Distinct()
            .ToList();

        if (assignedIds.Count == 0 && user.DepartmentId.HasValue)
        {
            assignedIds.Add(user.DepartmentId.Value);
        }

        return assignedIds.ToArray();
    }

    public async Task<bool> HasAccessToDepartmentAsync(Guid userId, int departmentId, CancellationToken ct = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.UserDepartments)
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);

        if (user == null)
        {
            return false;
        }

        // Admins have access to all departments
        if (user.IsAdmin)
        {
            return await _dbContext.Departments
                .AnyAsync(d => d.Id == departmentId && d.IsActive, ct);
        }

        var hasExplicitAccess = user.UserDepartments.Any(ud => ud.DepartmentId == departmentId);
        if (hasExplicitAccess)
        {
            return true;
        }

        return user.DepartmentId.HasValue && user.DepartmentId.Value == departmentId;
    }

    public async Task<bool> HasAccessToAllDepartmentsAsync(Guid userId, int[] departmentIds, CancellationToken ct = default)
    {
        if (departmentIds == null || departmentIds.Length == 0)
        {
            return true;
        }

        var userDepartmentIds = await GetUserDepartmentIdsAsync(userId, ct);
        return departmentIds.All(id => userDepartmentIds.Contains(id));
    }
}
#pragma warning restore CS0618
