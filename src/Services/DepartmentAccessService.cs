using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

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

        return user.UserDepartments
            .Select(ud => ud.DepartmentId)
            .ToArray();
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

        return user.UserDepartments.Any(ud => ud.DepartmentId == departmentId);
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
