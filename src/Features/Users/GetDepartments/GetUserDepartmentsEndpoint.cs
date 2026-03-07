using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.GetDepartments;

public sealed record UserDepartmentDto(int Id, string Name, string Code, string? Description);

public sealed class GetUserDepartmentsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/users/{userId:guid}/departments", async Task<IResult> (
                Guid userId,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var user = await dbContext.Users
                .Include(u => u.UserDepartments)
                    .ThenInclude(ud => ud.Department)
                .FirstOrDefaultAsync(u => u.UserId == userId, ct);

            if (user is null)
            {
                return TypedResults.NotFound();
            }

            var departments = user.UserDepartments
                .Select(ud => new UserDepartmentDto(
                    ud.Department.Id,
                    ud.Department.Name,
                    ud.Department.Code,
                    ud.Department.Description
                ))
                .ToList();

            return TypedResults.Ok(departments);
        }).RequireAuthorization();
    }
}
