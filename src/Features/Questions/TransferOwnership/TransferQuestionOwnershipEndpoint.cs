using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Questions;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Questions.TransferOwnership;

public sealed class TransferQuestionOwnershipEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/questions/{id:int}/transfer-ownership", async Task<IResult> (
                int id,
                TransferQuestionOwnershipRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var question = await dbContext.Questions
                .Include(q => q.Topic)
                .ThenInclude(t => t.Subject)
                .ThenInclude(s => s.Course)
                .FirstOrDefaultAsync(q => q.Id == id, ct);

            if (question is null)
            {
                return TypedResults.NotFound();
            }

            var targetUser = await dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == request.TargetUserId, ct);

            if (targetUser is null)
            {
                return TypedResults.BadRequest("Target user not found.");
            }

            if (!targetUser.IsActive)
            {
                return TypedResults.BadRequest("Target user is inactive.");
            }

            question.CreatedByUserId = request.TargetUserId;
            question.UpdatedAt = DateTime.UtcNow;

            var noteText = string.IsNullOrWhiteSpace(request.Note)
                ? "Ownership transferred by administrator."
                : request.Note.Trim();

            dbContext.ActivityLogs.Add(new ActivityLog
            {
                DepartmentId = question.Topic.Subject.Course.DepartmentId,
                UserId = request.TargetUserId,
                Category = "Questions",
                Action = QuestionPermissionResolver.OwnershipTransferredAction,
                EntityType = QuestionPermissionResolver.RequestEntityType,
                EntityId = question.Id,
                Details = noteText,
                Severity = "Info",
                CreatedAt = DateTime.UtcNow
            });

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(new
            {
                questionId = question.Id,
                targetUserId = request.TargetUserId
            });
        }).RequireAuthorization("AdminOnly");
    }
}
