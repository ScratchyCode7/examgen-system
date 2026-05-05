using Databank.Abstract;
using Databank.Database;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Departments.GetByCode;

public sealed record DepartmentDto(int Id, string Name, string Code, string? Description, bool IsActive);

public sealed class GetDepartmentByCodeEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/departments/by-code/{code}", async Task<IResult> (
                string code,
                AppDbContext dbContext,
            HttpContext httpContext,
                CancellationToken ct) =>
        {
            var department = await dbContext.Departments
                .Where(d => d.Code == code)
                .Select(d => new DepartmentDto(
                    d.Id,
                    d.Name,
                    d.Code,
                    d.Description,
                    d.IsActive
                ))
                .FirstOrDefaultAsync(ct);

            if (department is null)
            {
                return TypedResults.NotFound($"Department with code '{code}' not found.");
            }

            var isAdmin = httpContext.User.HasClaim("isAdmin", "true");
            if (!isAdmin)
            {
                var currentUserIdValue = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? httpContext.User.FindFirst("sub")?.Value
                    ?? httpContext.User.FindFirst("userId")?.Value;

                if (!Guid.TryParse(currentUserIdValue, out var currentUserId))
                {
                    return TypedResults.Problem(
                        "Unable to determine the current user.",
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var hasAccess = await dbContext.UserDepartments
                    .AsNoTracking()
                    .AnyAsync(ud => ud.UserId == currentUserId && ud.DepartmentId == department.Id, ct);

                if (!hasAccess)
                {
                    return TypedResults.NotFound();
                }
            }

            return TypedResults.Ok(department);
        }).RequireAuthorization();
    }
}
