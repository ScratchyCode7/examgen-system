using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Questions;
using Databank.Features.Topics;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Topics.TransferOwnership;

public sealed class TransferTopicOwnershipEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/topics/{id:int}/transfer-ownership", async Task<IResult> (
                int id,
                TransferTopicOwnershipRequest request,
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var topic = await dbContext.Topics
                .Include(t => t.Subject)
                .ThenInclude(s => s.Course)
                .FirstOrDefaultAsync(t => t.Id == id, ct);

            if (topic is null)
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

            var now = DateTime.UtcNow;
            var noteText = string.IsNullOrWhiteSpace(request.Note)
                ? "Ownership transferred by administrator."
                : request.Note.Trim();

            dbContext.ActivityLogs.Add(new ActivityLog
            {
                DepartmentId = topic.Subject.Course.DepartmentId,
                UserId = request.TargetUserId,
                Category = "Topics",
                Action = TopicPermissionResolver.OwnershipTransferredAction,
                EntityType = TopicPermissionResolver.RequestEntityType,
                EntityId = topic.Id,
                Details = noteText,
                Severity = "Info",
                CreatedAt = now
            });

            var transferredQuestionsCount = 0;
            if (request.TransferQuestions)
            {
                var topicQuestions = await dbContext.Questions
                    .Where(q => q.TopicId == topic.Id)
                    .ToListAsync(ct);

                transferredQuestionsCount = topicQuestions.Count;
                foreach (var question in topicQuestions)
                {
                    question.CreatedByUserId = request.TargetUserId;
                    question.UpdatedAt = now;
                }

                if (topicQuestions.Count > 0)
                {
                    var questionLogs = topicQuestions.Select(question => new ActivityLog
                    {
                        DepartmentId = topic.Subject.Course.DepartmentId,
                        UserId = request.TargetUserId,
                        Category = "Questions",
                        Action = QuestionPermissionResolver.OwnershipTransferredAction,
                        EntityType = QuestionPermissionResolver.RequestEntityType,
                        EntityId = question.Id,
                        Details = noteText,
                        Severity = "Info",
                        CreatedAt = now
                    });

                    await dbContext.ActivityLogs.AddRangeAsync(questionLogs, ct);
                }
            }

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(new
            {
                topicId = topic.Id,
                targetUserId = request.TargetUserId,
                questionsTransferred = transferredQuestionsCount,
                transferQuestions = request.TransferQuestions
            });
        }).RequireAuthorization("AdminOnly");
    }
}
