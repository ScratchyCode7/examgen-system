using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.List;

public sealed class GetUsersEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/users", async Task<IResult> (
                PaginationParams pagination,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var query = dbContext.Users.AsNoTracking();

            var totalCount = await query.CountAsync(ct);

            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip(pagination.Skip)
                .Take(pagination.Take)
                .Select(u => u.ToResponse())
                .ToListAsync(ct);

            var response = new PagedResponse<UserResponse>
            {
                Items = users,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize,
                TotalCount = totalCount
            };

            return TypedResults.Ok(response);
        }).RequireAuthorization("AdminOnly");
    }
}

