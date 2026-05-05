using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Databank.Features.Users.GetDepartments;

public sealed record UserDepartmentDto(int Id, string Name, string Code, string? Description, bool IsDean);

public sealed class GetUserDepartmentsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/users/{userId:guid}/departments", async Task<IResult> (
                Guid userId,
                AppDbContext dbContext,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var isAdmin = httpContext.User.HasClaim("isAdmin", "true");
            var currentUserIdValue = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? httpContext.User.FindFirst("sub")?.Value
                ?? httpContext.User.FindFirst("userId")?.Value;

            if (!isAdmin && (!Guid.TryParse(currentUserIdValue, out var currentUserId) || currentUserId != userId))
            {
                return TypedResults.Problem("You do not have permission to access this user.", statusCode: StatusCodes.Status403Forbidden);
            }

            var user = await dbContext.Users
                .Include(u => u.UserDepartments)
                    .ThenInclude(ud => ud.Department)
                .FirstOrDefaultAsync(u => u.UserId == userId, ct);

            if (user is null)
            {
                return TypedResults.NotFound();
            }

            var departments = user.UserDepartments
                .Where(ud => ud.Department.Code != "IT" && ud.Department.Code != "ITS")
                .Select(ud => new UserDepartmentDto(
                    ud.Department.Id,
                    ud.Department.Name,
                    ud.Department.Code,
                    ud.Department.Description,
                    ud.IsDean
                ))
                .ToList();

            return TypedResults.Ok(departments);
        }).RequireAuthorization();
    }
}
