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
                int pageNumber = 1,
                int pageSize = 10,
                AppDbContext dbContext = null!,
                CancellationToken ct = default) =>
        {
            var pagination = new PaginationParams { PageNumber = pageNumber, PageSize = pageSize };
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
        }).RequireAuthorization();
    }
}

