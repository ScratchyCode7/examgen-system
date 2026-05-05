using Databank.Abstract;
using Databank.Database;
using Databank.Features.Questions;
using Databank.Features.Topics;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Questions.GetById;

public sealed class GetQuestionEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/questions/{id:int}", async Task<IResult> (
                int id,
                AppDbContext dbContext,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var question = await dbContext.Questions
                .AsNoTracking()
                .Include(q => q.Options)
                .Include(q => q.QuestionImage)
                .FirstOrDefaultAsync(q => q.Id == id, ct);

            if (question is null)
            {
                return TypedResults.NotFound();
            }

            var currentUserId = QuestionPermissionResolver.GetCurrentUserId(httpContext.User);
            if (!currentUserId.HasValue)
            {
                return TypedResults.Problem(
                    "Unable to determine current user.",
                    statusCode: StatusCodes.Status401Unauthorized);
            }

            var isAdmin = await dbContext.Users
                .AsNoTracking()
                .AnyAsync(u => u.UserId == currentUserId && u.IsAdmin, ct);

            if (!isAdmin)
            {
                var viewableTopics = await TopicPermissionResolver.ResolveViewAccessForUserAsync(
                    dbContext,
                    currentUserId.Value,
                    new[] { question.TopicId },
                    ct);

                if (!viewableTopics.Contains(question.TopicId))
                {
                    return TypedResults.NotFound();
                }
            }

            var permissionsByQuestionId = await QuestionPermissionResolver.ResolvePermissionsForUserAsync(
                dbContext,
                currentUserId.Value,
                new[] { question.Id },
                ct);

            permissionsByQuestionId.TryGetValue(question.Id, out var perms);

            return TypedResults.Ok(question.ToResponse(perms.CanEdit, perms.CanDelete));
        }).RequireAuthorization();
    }
}

