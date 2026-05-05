using Databank.Abstract;
using Databank.Database;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Departments.GetById;

public sealed class GetDepartmentEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/departments/{id:int}", async Task<IResult> (
                int id,
                AppDbContext dbContext,
            HttpContext httpContext,
                CancellationToken ct) =>
        {
            var department = await dbContext.Departments
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Id == id, ct);

            if (department is null)
            {
                return TypedResults.NotFound();
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
                    .AnyAsync(ud => ud.UserId == currentUserId && ud.DepartmentId == id, ct);

                if (!hasAccess)
                {
                    return TypedResults.NotFound();
                }
            }

            return TypedResults.Ok(department.ToResponse());
        }).RequireAuthorization();
    }
}
