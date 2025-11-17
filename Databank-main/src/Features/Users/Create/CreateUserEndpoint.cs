using Databank.Abstract;
using Databank.Database;

namespace Databank.Features.Users.Create;

public record CreateUserRequest(string FirstName, string LastName, string Department, string Username, string Password, string Email);
public record CreateUserResponse(string FirstName, string LastName, string Department, string Username, string Email);

public  class CreateUserAsync : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/databank/create", async (CreateUserRequest req, CancellationToken ct, AppDbContext dbContext) =>
        {
            var user = req.ToCreate();

            await dbContext.Users.AddAsync(user, ct);
            await dbContext.SaveChangesAsync(ct);

            var response = user.ToResponse();

            return TypedResults.Ok(response);
        });
    }
}