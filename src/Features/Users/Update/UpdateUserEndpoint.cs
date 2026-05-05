using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Questions;
using Databank.Services;
using Databank.Features.Subjects;
using Databank.Features.Topics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Users.Update;

public sealed record UpdateUserRequest(
    string FirstName,
    string LastName,
    string Username,
    int[] DepartmentIds,
    int[] CourseIds,
    string Email,
    bool? IsAdmin,
    bool? IsActive,
    string? Password,
    string? AdminPasswordVerification,
    Guid? TransferOwnershipFromUserId,
    bool? DeactivateTransferredUser
);

public sealed class UpdateUserEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("/api/users/{userId:guid}", async Task<IResult> (
                Guid userId,
                UpdateUserRequest request,
                AppDbContext dbContext,
                IPasswordHasher<User> passwordHasher,
                IUserOwnershipTransferService ownershipTransferService,
                HttpContext httpContext,
                CancellationToken ct) =>
        {
            var user = await dbContext.Users
                .Include(u => u.UserDepartments)
                .Include(u => u.UserCourses)
                .FirstOrDefaultAsync(u => u.UserId == userId, ct);

            if (user is null)
            {
                return TypedResults.NotFound();
            }

            var actingUserIdValue = httpContext.User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var actingUserId = Guid.TryParse(actingUserIdValue, out var parsedActingUserId)
                ? parsedActingUserId
                : (Guid?)null;

            var normalizedUsername = request.Username?.Trim();
            var normalizedEmail = request.Email?.Trim();

            if (string.IsNullOrWhiteSpace(normalizedUsername))
            {
                return TypedResults.BadRequest("Username is required.");
            }

            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                return TypedResults.BadRequest("Email is required.");
            }

            var duplicateUsername = await dbContext.Users
                .AnyAsync(u => u.UserId != userId && u.Username.ToLower() == normalizedUsername.ToLower(), ct);

            if (duplicateUsername)
            {
                return TypedResults.Conflict(new
                {
                    code = "USERNAME_CONFLICT",
                    message = $"Username '{normalizedUsername}' is already in use."
                });
            }

            var conflictingEmailUser = await dbContext.Users
                .FirstOrDefaultAsync(u => u.UserId != userId && u.Email.ToLower() == normalizedEmail.ToLower(), ct);

            if (conflictingEmailUser != null)
            {
                var isTransferRequest = request.TransferOwnershipFromUserId.HasValue
                    && request.TransferOwnershipFromUserId.Value == conflictingEmailUser.UserId;

                if (isTransferRequest)
                {
                    await ownershipTransferService.TransferOwnershipAsync(
                        conflictingEmailUser.UserId,
                        userId,
                        request.DeactivateTransferredUser ?? true,
                        ct);

                    // Release the email so it can be reassigned to the target account.
                    conflictingEmailUser.Email = $"archived+{conflictingEmailUser.UserId:N}@databank.local";
                    conflictingEmailUser.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    var summary = await ownershipTransferService.GetOwnershipSummaryAsync(conflictingEmailUser.UserId, ct);

                    return TypedResults.Conflict(new
                    {
                        code = "EMAIL_CONFLICT_TRANSFER_AVAILABLE",
                        message = $"Email '{normalizedEmail}' is already used by another account.",
                        conflictingUser = new
                        {
                            userId = conflictingEmailUser.UserId,
                            username = conflictingEmailUser.Username,
                            email = conflictingEmailUser.Email,
                            fullName = $"{conflictingEmailUser.FirstName} {conflictingEmailUser.LastName}".Trim(),
                            isActive = conflictingEmailUser.IsActive
                        },
                        ownershipSummary = new
                        {
                            courses = summary.Courses,
                            subjects = summary.Subjects,
                            topics = summary.Topics,
                            questions = summary.Questions
                        }
                    });
                }
            }

            // Verify all departments exist
            if (request.DepartmentIds == null || request.DepartmentIds.Length == 0)
            {
                return TypedResults.BadRequest("At least one department must be specified.");
            }
            
            var existingDeptCount = await dbContext.Departments
                .CountAsync(d => request.DepartmentIds.Contains(d.Id), ct);
            
            if (existingDeptCount != request.DepartmentIds.Length)
            {
                return TypedResults.BadRequest("One or more departments do not exist.");
            }

            var requestedCourseIds = request.CourseIds ?? Array.Empty<int>();
            if (requestedCourseIds.Length > 0)
            {
                var courseRows = await dbContext.Courses
                    .AsNoTracking()
                    .Where(c => requestedCourseIds.Contains(c.Id))
                    .Select(c => new { c.Id, c.DepartmentId })
                    .ToListAsync(ct);

                if (courseRows.Count != requestedCourseIds.Length)
                {
                    return TypedResults.BadRequest("One or more courses do not exist.");
                }

                var allowedDepartments = request.DepartmentIds.ToHashSet();
                var invalidCourses = courseRows
                    .Where(c => !allowedDepartments.Contains(c.DepartmentId))
                    .Select(c => c.Id)
                    .ToArray();

                if (invalidCourses.Length > 0)
                {
                    return TypedResults.BadRequest("One or more courses are outside the assigned departments.");
                }
            }

            var currentDepartmentIds = user.UserDepartments
                .Select(ud => ud.DepartmentId)
                .ToHashSet();

            var requestedDepartmentIds = request.DepartmentIds
                .Distinct()
                .ToHashSet();

            var assignmentsToRemove = user.UserDepartments
                .Where(assignment => !requestedDepartmentIds.Contains(assignment.DepartmentId))
                .ToArray();

            var removedDepartmentIds = assignmentsToRemove
                .Select(assignment => assignment.DepartmentId)
                .ToArray();

            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            user.Username = normalizedUsername;
            user.Email = normalizedEmail;
            
            // Update department assignments without clearing/re-adding all rows.
            // This avoids duplicate tracked keys and preserves per-department role scope.
            if (assignmentsToRemove.Length > 0)
            {
                dbContext.UserDepartments.RemoveRange(assignmentsToRemove);
            }

            var departmentsToAdd = requestedDepartmentIds
                .Where(departmentId => !currentDepartmentIds.Contains(departmentId))
                .ToArray();

            var retainedAssignments = user.UserDepartments
                .Where(assignment => !removedDepartmentIds.Contains(assignment.DepartmentId))
                .ToList();

            if (departmentsToAdd.Length > 0)
            {
                var newAssignments = departmentsToAdd
                    .Select(deptId => new UserDepartment
                    {
                        UserId = userId,
                        DepartmentId = deptId
                    })
                    .ToList();

                retainedAssignments.AddRange(newAssignments);
            }

            user.UserDepartments = retainedAssignments;

            var currentCourseIds = user.UserCourses
                .Select(uc => uc.CourseId)
                .ToHashSet();

            var requestedCourseIdSet = requestedCourseIds
                .Distinct()
                .ToHashSet();

            var courseAssignmentsToRemove = user.UserCourses
                .Where(assignment => !requestedCourseIdSet.Contains(assignment.CourseId))
                .ToArray();

            if (courseAssignmentsToRemove.Length > 0)
            {
                dbContext.UserCourses.RemoveRange(courseAssignmentsToRemove);
            }

            var coursesToAdd = requestedCourseIdSet
                .Where(courseId => !currentCourseIds.Contains(courseId))
                .ToArray();

            var retainedCourses = user.UserCourses
                .Where(assignment => !courseAssignmentsToRemove
                    .Select(removal => removal.CourseId)
                    .Contains(assignment.CourseId))
                .ToList();

            if (coursesToAdd.Length > 0)
            {
                var newCourseAssignments = coursesToAdd
                    .Select(courseId => new UserCourse
                    {
                        UserId = userId,
                        CourseId = courseId
                    })
                    .ToList();

                retainedCourses.AddRange(newCourseAssignments);
            }

            user.UserCourses = retainedCourses;

            if (request.IsAdmin.HasValue)
            {
                user.IsAdmin = request.IsAdmin.Value;
            }

            if (request.IsActive.HasValue)
            {
                if (!request.IsActive.Value)
                {
                    if (actingUserId.HasValue && actingUserId.Value == userId)
                    {
                        return TypedResults.BadRequest("Admins cannot lock their own account.");
                    }
                }

                user.IsActive = request.IsActive.Value;

                if (request.IsActive.Value)
                {
                    user.FailedLoginAttempts = 0;
                    user.LockoutEnd = null;
                }
            }

            var isPasswordChangeRequested = !string.IsNullOrWhiteSpace(request.Password);
            if (isPasswordChangeRequested)
            {
                if (string.IsNullOrWhiteSpace(request.AdminPasswordVerification))
                {
                    return TypedResults.BadRequest("Admin password verification is required before changing a user's password.");
                }

                if (!actingUserId.HasValue)
                {
                    return TypedResults.Unauthorized();
                }

                var requestingAdmin = await dbContext.Users
                    .FirstOrDefaultAsync(u => u.UserId == actingUserId.Value, ct);

                if (requestingAdmin is null)
                {
                    return TypedResults.Unauthorized();
                }

                var verificationResult = passwordHasher.VerifyHashedPassword(
                    requestingAdmin,
                    requestingAdmin.Password,
                    request.AdminPasswordVerification);

                if (verificationResult == PasswordVerificationResult.Failed)
                {
                    return TypedResults.Problem(
                        "Admin identity verification failed. Please enter your current password to change a user's password.",
                        statusCode: StatusCodes.Status403Forbidden);
                }

                user.Password = passwordHasher.HashPassword(user, request.Password!);
            }

            if (removedDepartmentIds.Length > 0)
            {
                await ResetRemovedDepartmentAccessRequestsAsync(
                    dbContext,
                    userId,
                    actingUserId,
                    removedDepartmentIds,
                    ct);
            }

            user.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync(ct);

            return TypedResults.Ok(user.ToResponse());
        }).RequireAuthorization("AdminOnly");
    }

    private static async Task ResetRemovedDepartmentAccessRequestsAsync(
        AppDbContext dbContext,
        Guid targetUserId,
        Guid? actingUserId,
        IReadOnlyCollection<int> removedDepartmentIds,
        CancellationToken ct)
    {
        if (removedDepartmentIds.Count == 0)
        {
            return;
        }

        var revokeNote = "Access reset because the user was removed from this department. Request access again if needed.";

        await RevokeScopedRequestsAsync(
            dbContext,
            actingUserId,
            "Subjects",
            SubjectPermissionResolver.ResolutionEntityType,
            SubjectPermissionResolver.ApproveEditOnlyAction,
            SubjectPermissionResolver.ApproveEditDeleteAction,
            SubjectPermissionResolver.RejectAction,
            SubjectPermissionResolver.RevokeAction,
            requestQuery: dbContext.ActivityLogs
                .AsNoTracking()
                .Where(a =>
                    a.Category == "Subjects" &&
                    a.Action == SubjectPermissionResolver.RequestAction &&
                    a.EntityType == SubjectPermissionResolver.RequestEntityType &&
                    a.UserId == targetUserId &&
                    a.EntityId.HasValue &&
                    a.Id <= int.MaxValue)
                .Join(
                    dbContext.Subjects.AsNoTracking(),
                    log => log.EntityId!.Value,
                    subject => subject.Id,
                    (log, subject) => new
                    {
                        RequestId = (int)log.Id,
                        DepartmentId = subject.Course.DepartmentId
                    })
                .Where(request => removedDepartmentIds.Contains(request.DepartmentId))
                .Select(request => new DepartmentScopedRequest(request.RequestId, request.DepartmentId)),
            revokeNote,
            ct);

        await RevokeScopedRequestsAsync(
            dbContext,
            actingUserId,
            "Topics",
            TopicPermissionResolver.ResolutionEntityType,
            TopicPermissionResolver.ApproveEditOnlyAction,
            TopicPermissionResolver.ApproveEditDeleteAction,
            TopicPermissionResolver.RejectAction,
            TopicPermissionResolver.RevokeAction,
            requestQuery: dbContext.ActivityLogs
                .AsNoTracking()
                .Where(a =>
                    a.Category == "Topics" &&
                    a.Action == TopicPermissionResolver.RequestAction &&
                    a.EntityType == TopicPermissionResolver.RequestEntityType &&
                    a.UserId == targetUserId &&
                    a.EntityId.HasValue &&
                    a.Id <= int.MaxValue)
                .Join(
                    dbContext.Topics.AsNoTracking(),
                    log => log.EntityId!.Value,
                    topic => topic.Id,
                    (log, topic) => new
                    {
                        RequestId = (int)log.Id,
                        DepartmentId = topic.Subject.Course.DepartmentId
                    })
                .Where(request => removedDepartmentIds.Contains(request.DepartmentId))
                .Select(request => new DepartmentScopedRequest(request.RequestId, request.DepartmentId)),
            revokeNote,
            ct);

        await RevokeScopedRequestsAsync(
            dbContext,
            actingUserId,
            "Questions",
            QuestionPermissionResolver.ResolutionEntityType,
            QuestionPermissionResolver.ApproveEditOnlyAction,
            QuestionPermissionResolver.ApproveEditDeleteAction,
            QuestionPermissionResolver.RejectAction,
            QuestionPermissionResolver.RevokeAction,
            requestQuery: dbContext.ActivityLogs
                .AsNoTracking()
                .Where(a =>
                    a.Category == "Questions" &&
                    a.Action == QuestionPermissionResolver.RequestAction &&
                    a.EntityType == QuestionPermissionResolver.RequestEntityType &&
                    a.UserId == targetUserId &&
                    a.EntityId.HasValue &&
                    a.Id <= int.MaxValue)
                .Join(
                    dbContext.Questions.AsNoTracking(),
                    log => log.EntityId!.Value,
                    question => question.Id,
                    (log, question) => new
                    {
                        RequestId = (int)log.Id,
                        DepartmentId = question.Topic.Subject.Course.DepartmentId
                    })
                .Where(request => removedDepartmentIds.Contains(request.DepartmentId))
                .Select(request => new DepartmentScopedRequest(request.RequestId, request.DepartmentId)),
            revokeNote,
            ct);
    }

    private static async Task RevokeScopedRequestsAsync(
        AppDbContext dbContext,
        Guid? actingUserId,
        string category,
        string resolutionEntityType,
        string approveEditOnlyAction,
        string approveEditDeleteAction,
        string rejectAction,
        string revokeAction,
        IQueryable<DepartmentScopedRequest> requestQuery,
        string revokeNote,
        CancellationToken ct)
    {
        var scopedRequests = await requestQuery.ToListAsync(ct);

        if (scopedRequests.Count == 0)
        {
            return;
        }

        var requestIds = scopedRequests
            .Select(request => request.RequestId)
            .Distinct()
            .ToList();

        var latestResolutionByRequestId = await dbContext.ActivityLogs
            .AsNoTracking()
            .Where(a =>
                a.EntityType == resolutionEntityType &&
                a.EntityId.HasValue &&
                requestIds.Contains(a.EntityId.Value) &&
                (a.Action == approveEditOnlyAction ||
                 a.Action == approveEditDeleteAction ||
                 a.Action == rejectAction ||
                 a.Action == revokeAction))
            .Select(a => new
            {
                RequestId = a.EntityId!.Value,
                a.Action,
                a.CreatedAt,
                a.Id
            })
            .ToListAsync(ct);

        var latestActionByRequestId = latestResolutionByRequestId
            .GroupBy(item => item.RequestId)
            .ToDictionary(
                group => group.Key,
                group => group.OrderByDescending(item => item.CreatedAt).ThenByDescending(item => item.Id).First().Action);

        var revokeLogs = scopedRequests
            .Where(request =>
            {
                if (!latestActionByRequestId.TryGetValue(request.RequestId, out var latestAction))
                {
                    return true;
                }

                return latestAction == approveEditOnlyAction || latestAction == approveEditDeleteAction;
            })
            .Select(request => new ActivityLog
            {
                DepartmentId = request.DepartmentId,
                UserId = actingUserId,
                Category = category,
                Action = revokeAction,
                EntityType = resolutionEntityType,
                EntityId = request.RequestId,
                Details = revokeNote,
                Severity = "Warning",
                CreatedAt = DateTime.UtcNow
            })
            .ToList();

        if (revokeLogs.Count == 0)
        {
            return;
        }

        dbContext.ActivityLogs.AddRange(revokeLogs);
    }

    private sealed record DepartmentScopedRequest(int RequestId, int DepartmentId);
}

