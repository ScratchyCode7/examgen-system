using Databank.Abstract;

namespace Databank.Features.Admin;

public sealed class AdminStatusEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/admin/health", () =>
            Results.Ok(new { Message = "Admin access verified." }))
            .RequireAuthorization("AdminOnly");
    }
}

