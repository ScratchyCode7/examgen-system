using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Subjects;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Subjects.EditRequests;

public sealed class SubjectEditRequestEndpoint : IEndpoint
{
    private const string RequestAction = SubjectPermissionResolver.RequestAction;
    private const string ApproveAction = SubjectPermissionResolver.ApproveEditOnlyAction;
    private const string ApproveDeleteAction = SubjectPermissionResolver.ApproveEditDeleteAction;
    private const string RejectAction = SubjectPermissionResolver.RejectAction;
    private const string RevokeAction = SubjectPermissionResolver.RevokeAction;
    private const string DismissAction = "EditRequestDismissed";
    private const string RequestEntityType = SubjectPermissionResolver.RequestEntityType;
    private const string ResolutionEntityType = SubjectPermissionResolver.ResolutionEntityType;

    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/subjects/{subjectId:int}/edit-requests", CreateAsync)
            .RequireAuthorization("AdminOnly");

        app.MapGet("/api/subjects/edit-requests", ListAsync)
            .RequireAuthorization("AdminOnly");

        app.MapPost("/api/subjects/edit-requests/{requestId:long}/resolve", ResolveAsync)
            .RequireAuthorization("AdminOnly");

        app.MapPost("/api/subjects/edit-requests/{requestId:long}/revoke", RevokeAsync)
            .RequireAuthorization("AdminOnly");

        app.MapPost("/api/subjects/edit-requests/{requestId:long}/dismiss", DismissAsync)
            .RequireAuthorization("AdminOnly");
    }

    private static async Task<IResult> CreateAsync(
        int subjectId,
        CreateSubjectEditRequest request,
        AppDbContext dbContext,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var isAdmin = httpContext.User.HasClaim("isAdmin", "true");
        if (!isAdmin)
        {
            return TypedResults.Problem(
                "Course access requests are disabled. Only administrators can modify encoded courses.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var requesterId = SubjectPermissionResolver.GetCurrentUserId(httpContext.User);
        if (!requesterId.HasValue)
        {
            return TypedResults.Problem("Unable to determine current user.", statusCode: StatusCodes.Status401Unauthorized);
        }

        var subject = await dbContext.Subjects
            .AsNoTracking()
            .Include(s => s.Course)
            .FirstOrDefaultAsync(s => s.Id == subjectId, ct);

        if (subject is null)
        {
            return TypedResults.NotFound(new { message = "Subject not found." });
        }

        var ownerId = await GetSubjectOwnerIdAsync(dbContext, subjectId, ct);
        if (!ownerId.HasValue)
        {
            return TypedResults.BadRequest(new { message = "Subject owner could not be determined for this course entry." });
        }

        if (ownerId.Value == requesterId.Value)
        {
            return TypedResults.BadRequest(new { message = "You already own this course entry. Edit request is not needed." });
        }

        var currentPermission = await SubjectPermissionResolver.ResolvePermissionsForUserAsync(
            dbContext,
            requesterId.Value,
            new[] { subjectId },
            ct);

        if (currentPermission.TryGetValue(subjectId, out var perms) && perms.CanEdit)
        {
            return TypedResults.Conflict(new { message = "You already have active access to this course entry." });
        }

        var requesterCreatedLogs = await dbContext.ActivityLogs
            .Where(a => a.Action == RequestAction && a.EntityType == RequestEntityType && a.EntityId == subjectId && a.UserId == requesterId.Value)
            .Select(a => new { a.Id })
            .ToListAsync(ct);

        var requesterResolutionIds = await dbContext.ActivityLogs
            .Where(a => a.EntityType == ResolutionEntityType && a.Action != string.Empty && a.EntityId.HasValue)
            .Select(a => a.EntityId!.Value)
            .ToHashSetAsync(ct);

        var hasPendingRequest = requesterCreatedLogs.Any(log => log.Id <= int.MaxValue && !requesterResolutionIds.Contains((int)log.Id));
        if (hasPendingRequest)
        {
            return TypedResults.Conflict(new { message = "You already have a pending edit request for this course entry." });
        }

        var message = (request.Message ?? string.Empty).Trim();
        if (message.Length > 1000)
        {
            return TypedResults.BadRequest(new { message = "Edit request message must be 1000 characters or fewer." });
        }

        var details = string.IsNullOrWhiteSpace(message)
            ? "Edit access requested"
            : $"Edit access requested: {message}";

        var editRequestLog = new ActivityLog
        {
            DepartmentId = subject.Course.DepartmentId,
            UserId = requesterId.Value,
            Category = "Subjects",
            Action = RequestAction,
            EntityType = RequestEntityType,
            EntityId = subjectId,
            Details = details,
            Severity = "Warning",
            CreatedAt = DateTime.UtcNow
        };

        dbContext.ActivityLogs.Add(editRequestLog);
        await dbContext.SaveChangesAsync(ct);

        return TypedResults.Ok(new
        {
            message = "Edit request submitted successfully.",
            requestId = editRequestLog.Id,
            subjectId
        });
    }

    private static async Task<IResult> ListAsync(
        string? scope,
        AppDbContext dbContext,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var currentUserId = SubjectPermissionResolver.GetCurrentUserId(httpContext.User);
        if (!currentUserId.HasValue)
        {
            return TypedResults.Problem("Unable to determine current user.", statusCode: StatusCodes.Status401Unauthorized);
        }

        var normalizedScope = string.IsNullOrWhiteSpace(scope) ? "inbox" : scope.Trim().ToLowerInvariant();
        if (normalizedScope is not ("inbox" or "sent" or "all"))
        {
            return TypedResults.BadRequest(new { message = "Scope must be one of: inbox, sent, all." });
        }

        var isAdmin = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(u => u.UserId == currentUserId.Value && u.IsAdmin, ct);

        var requestLogs = await dbContext.ActivityLogs
            .AsNoTracking()
            .Where(a => a.Category == "Subjects" && a.Action == RequestAction && a.EntityType == RequestEntityType && a.EntityId.HasValue && a.UserId.HasValue)
            .OrderByDescending(a => a.CreatedAt)
            .Take(500)
            .ToListAsync(ct);

        if (requestLogs.Count == 0)
        {
            return TypedResults.Ok(Array.Empty<SubjectEditRequestResponse>());
        }

        var subjectIds = requestLogs.Select(a => a.EntityId!.Value).Distinct().ToList();
        var ownerBySubject = await SubjectPermissionResolver.ResolveOwnerIdsAsync(dbContext, subjectIds, ct);

        IEnumerable<ActivityLog> scopedLogs = requestLogs;
        if (normalizedScope == "sent")
        {
            scopedLogs = requestLogs.Where(log => log.UserId == currentUserId.Value);
        }
        else if (normalizedScope == "inbox")
        {
            scopedLogs = requestLogs.Where(log =>
                ownerBySubject.TryGetValue(log.EntityId!.Value, out var ownerId) &&
                ownerId == currentUserId.Value &&
                log.UserId != currentUserId.Value);
        }
        else
        {
            scopedLogs = requestLogs.Where(log =>
                log.UserId == currentUserId.Value ||
                (ownerBySubject.TryGetValue(log.EntityId!.Value, out var ownerId) && ownerId == currentUserId.Value));
        }

        var requestList = scopedLogs.ToList();
        if (requestList.Count == 0)
        {
            return TypedResults.Ok(Array.Empty<SubjectEditRequestResponse>());
        }

        var requestIdsForDismissLookup = requestList
            .Where(log => log.Id <= int.MaxValue)
            .Select(log => (int)log.Id)
            .Distinct()
            .ToList();

        if (requestIdsForDismissLookup.Count > 0)
        {
            var dismissedRequestIds = await dbContext.ActivityLogs
                .AsNoTracking()
                .Where(a =>
                    a.Action == DismissAction &&
                    a.EntityType == ResolutionEntityType &&
                    a.EntityId.HasValue &&
                    requestIdsForDismissLookup.Contains(a.EntityId.Value) &&
                    a.UserId == currentUserId.Value)
                .Select(a => a.EntityId!.Value)
                .Distinct()
                .ToHashSetAsync(ct);

            requestList = requestList
                .Where(log => !(log.Id <= int.MaxValue && dismissedRequestIds.Contains((int)log.Id)))
                .ToList();
        }

        if (requestList.Count == 0)
        {
            return TypedResults.Ok(Array.Empty<SubjectEditRequestResponse>());
        }

        var requestIdMap = requestList
            .Where(log => log.Id <= int.MaxValue)
            .ToDictionary(log => (int)log.Id, log => log.Id);

        var resolutionLogs = await dbContext.ActivityLogs
            .AsNoTracking()
            .Where(a =>
                a.EntityType == ResolutionEntityType &&
                a.EntityId.HasValue &&
                requestIdMap.Keys.Contains(a.EntityId.Value) &&
                (a.Action == ApproveAction || a.Action == ApproveDeleteAction || a.Action == RejectAction || a.Action == RevokeAction))
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);

        var latestResolutionByRequestId = resolutionLogs
            .GroupBy(log => log.EntityId!.Value)
            .ToDictionary(group => group.Key, group => group.First());

        var userIds = requestList
            .Select(log => log.UserId!.Value)
            .Concat(requestList
                .Select(log => ownerBySubject.TryGetValue(log.EntityId!.Value, out var owner) ? owner : (Guid?)null)
                .Where(id => id.HasValue)
                .Select(id => id!.Value))
            .Distinct()
            .ToList();

        var users = await dbContext.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.UserId))
            .Select(u => new
            {
                u.UserId,
                Name = string.IsNullOrWhiteSpace(u.FirstName + " " + u.LastName)
                    ? u.Username
                    : (u.FirstName + " " + u.LastName).Trim()
            })
            .ToListAsync(ct);

        var userNameById = users.ToDictionary(u => u.UserId, u => u.Name);

        var response = requestList
            .Where(log => ownerBySubject.ContainsKey(log.EntityId!.Value) && ownerBySubject[log.EntityId!.Value].HasValue)
            .Select(log =>
            {
                var requestIdInt = log.Id <= int.MaxValue ? (int?)log.Id : null;
                latestResolutionByRequestId.TryGetValue(requestIdInt ?? -1, out var resolution);
                var ownerId = ownerBySubject[log.EntityId!.Value]!.Value;
                var requesterId = log.UserId!.Value;

                var status = resolution is null
                    ? "Pending"
                    : (resolution.Action == RevokeAction)
                        ? "Revoked"
                        : (resolution.Action == ApproveAction || resolution.Action == ApproveDeleteAction) ? "Approved" : "Rejected";

                var permissionLevel = resolution?.Action switch
                {
                    ApproveDeleteAction => "EditDelete",
                    ApproveAction => "EditOnly",
                    _ => "None"
                };

                var canRevoke = resolution is not null
                    && (resolution.Action == ApproveAction || resolution.Action == ApproveDeleteAction)
                    && (ownerId == currentUserId.Value || isAdmin);

                return new SubjectEditRequestResponse(
                    log.Id,
                    log.EntityId!.Value,
                    requesterId,
                    userNameById.GetValueOrDefault(requesterId, requesterId.ToString()),
                    ownerId,
                    userNameById.GetValueOrDefault(ownerId, ownerId.ToString()),
                    log.Details,
                    status,
                    log.CreatedAt,
                    resolution?.CreatedAt,
                    resolution?.Details,
                    requesterId == currentUserId.Value,
                    permissionLevel,
                    canRevoke);
            })
            .OrderByDescending(item => item.RequestedAt)
            .ToList();

        return TypedResults.Ok(response);
    }

    private static async Task<IResult> ResolveAsync(
        long requestId,
        ResolveSubjectEditRequest request,
        AppDbContext dbContext,
        HttpContext httpContext,
        CancellationToken ct)
    {
        if (requestId <= 0 || requestId > int.MaxValue)
        {
            return TypedResults.BadRequest(new { message = "Invalid request id." });
        }

        var ownerUserId = SubjectPermissionResolver.GetCurrentUserId(httpContext.User);
        if (!ownerUserId.HasValue)
        {
            return TypedResults.Problem("Unable to determine current user.", statusCode: StatusCodes.Status401Unauthorized);
        }

        var requestLog = await dbContext.ActivityLogs
            .FirstOrDefaultAsync(a =>
                a.Id == requestId &&
                a.Category == "Subjects" &&
                a.Action == RequestAction &&
                a.EntityType == RequestEntityType &&
                a.EntityId.HasValue,
                ct);

        if (requestLog is null)
        {
            return TypedResults.NotFound(new { message = "Edit request not found." });
        }

        var isAdminClaim = httpContext.User.HasClaim("isAdmin", "true");
        var isAdminDb = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(u => u.UserId == ownerUserId.Value && u.IsAdmin, ct);
        if (!isAdminClaim && !isAdminDb)
        {
            return TypedResults.Problem("Only administrators can resolve this edit request.", statusCode: StatusCodes.Status403Forbidden);
        }

        var latestResolution = await dbContext.ActivityLogs
            .Where(a =>
                a.EntityType == ResolutionEntityType &&
                a.EntityId == (int)requestId &&
                (a.Action == ApproveAction || a.Action == ApproveDeleteAction || a.Action == RejectAction || a.Action == RevokeAction))
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .FirstOrDefaultAsync(ct);

        var resolutionAction = request.Approve
            ? (request.CanDelete ? ApproveDeleteAction : ApproveAction)
            : RejectAction;

        if (!request.Approve && latestResolution is not null)
        {
            return TypedResults.Conflict(new { message = "Request is already handled. Use permission checkboxes to manage access." });
        }

        if (latestResolution?.Action == resolutionAction)
        {
            var unchangedMessage = resolutionAction switch
            {
                ApproveDeleteAction => "Permission is already set to edit and delete.",
                ApproveAction => "Permission is already set to edit-only.",
                RejectAction => "Request is already rejected.",
                _ => "No changes were made."
            };

            return TypedResults.Ok(new { message = unchangedMessage });
        }

        var note = (request.Note ?? string.Empty).Trim();
        if (note.Length > 1000)
        {
            return TypedResults.BadRequest(new { message = "Resolution note must be 1000 characters or fewer." });
        }

        var resolutionLog = new ActivityLog
        {
            DepartmentId = requestLog.DepartmentId,
            UserId = ownerUserId.Value,
            Category = "Subjects",
            Action = resolutionAction,
            EntityType = ResolutionEntityType,
            EntityId = (int)requestId,
            Details = string.IsNullOrWhiteSpace(note) ? null : note,
            Severity = "Info",
            CreatedAt = DateTime.UtcNow
        };

        dbContext.ActivityLogs.Add(resolutionLog);
        await dbContext.SaveChangesAsync(ct);

        var message = request.Approve
            ? (request.CanDelete ? "Edit and delete permission approved." : "Edit-only permission approved.")
            : "Edit request rejected.";

        return TypedResults.Ok(new { message });
    }

    private static async Task<IResult> RevokeAsync(
        long requestId,
        RevokeSubjectEditPermission request,
        AppDbContext dbContext,
        HttpContext httpContext,
        CancellationToken ct)
    {
        if (requestId <= 0 || requestId > int.MaxValue)
        {
            return TypedResults.BadRequest(new { message = "Invalid request id." });
        }

        var ownerUserId = SubjectPermissionResolver.GetCurrentUserId(httpContext.User);
        if (!ownerUserId.HasValue)
        {
            return TypedResults.Problem("Unable to determine current user.", statusCode: StatusCodes.Status401Unauthorized);
        }

        var requestLog = await dbContext.ActivityLogs
            .FirstOrDefaultAsync(a =>
                a.Id == requestId &&
                a.Category == "Subjects" &&
                a.Action == RequestAction &&
                a.EntityType == RequestEntityType &&
                a.EntityId.HasValue,
                ct);

        if (requestLog is null)
        {
            return TypedResults.NotFound(new { message = "Edit request not found." });
        }

        var subjectId = requestLog.EntityId!.Value;
        var subjectOwnerId = await GetSubjectOwnerIdAsync(dbContext, subjectId, ct);
        if (!subjectOwnerId.HasValue || subjectOwnerId.Value != ownerUserId.Value)
        {
            return TypedResults.Problem("Only the subject owner can revoke this permission.", statusCode: StatusCodes.Status403Forbidden);
        }

        var latestResolution = await dbContext.ActivityLogs
            .Where(a =>
                a.EntityType == ResolutionEntityType &&
                a.EntityId == (int)requestId &&
                (a.Action == ApproveAction || a.Action == ApproveDeleteAction || a.Action == RejectAction || a.Action == RevokeAction))
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .FirstOrDefaultAsync(ct);

        if (latestResolution is not null && latestResolution.Action == RevokeAction)
        {
            return TypedResults.Conflict(new { message = "Permission is already revoked for this request." });
        }

        var note = (request.Note ?? string.Empty).Trim();
        if (note.Length > 1000)
        {
            return TypedResults.BadRequest(new { message = "Revocation note must be 1000 characters or fewer." });
        }

        var revokeLog = new ActivityLog
        {
            DepartmentId = requestLog.DepartmentId,
            UserId = ownerUserId.Value,
            Category = "Subjects",
            Action = RevokeAction,
            EntityType = ResolutionEntityType,
            EntityId = (int)requestId,
            Details = string.IsNullOrWhiteSpace(note) ? null : note,
            Severity = "Warning",
            CreatedAt = DateTime.UtcNow
        };

        dbContext.ActivityLogs.Add(revokeLog);
        await dbContext.SaveChangesAsync(ct);

        return TypedResults.Ok(new { message = "Permission revoked." });
    }

    private static async Task<IResult> DismissAsync(
        long requestId,
        AppDbContext dbContext,
        HttpContext httpContext,
        CancellationToken ct)
    {
        if (requestId <= 0 || requestId > int.MaxValue)
        {
            return TypedResults.BadRequest(new { message = "Invalid request id." });
        }

        var currentUserId = SubjectPermissionResolver.GetCurrentUserId(httpContext.User);
        if (!currentUserId.HasValue)
        {
            return TypedResults.Problem("Unable to determine current user.", statusCode: StatusCodes.Status401Unauthorized);
        }

        var requestLog = await dbContext.ActivityLogs
            .FirstOrDefaultAsync(a =>
                a.Id == requestId &&
                a.Category == "Subjects" &&
                a.Action == RequestAction &&
                a.EntityType == RequestEntityType &&
                a.EntityId.HasValue &&
                a.UserId.HasValue,
                ct);

        if (requestLog is null)
        {
            return TypedResults.NotFound(new { message = "Edit request not found." });
        }

        var subjectId = requestLog.EntityId!.Value;
        var ownerId = await GetSubjectOwnerIdAsync(dbContext, subjectId, ct);
        var isRequester = requestLog.UserId!.Value == currentUserId.Value;
        var isOwner = ownerId.HasValue && ownerId.Value == currentUserId.Value;
        var isAdminClaim = httpContext.User.HasClaim("isAdmin", "true");
        var isAdminDb = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(u => u.UserId == currentUserId.Value && u.IsAdmin, ct);
        var isAdmin = isAdminClaim || isAdminDb;
        if (!isRequester && !isOwner && !isAdmin)
        {
            return TypedResults.Problem("Only the subject owner, requester, or administrator can dismiss this card.", statusCode: StatusCodes.Status403Forbidden);
        }

        var latestResolution = await dbContext.ActivityLogs
            .Where(a =>
                a.EntityType == ResolutionEntityType &&
                a.EntityId == (int)requestId &&
                (a.Action == ApproveAction || a.Action == ApproveDeleteAction || a.Action == RejectAction || a.Action == RevokeAction))
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .FirstOrDefaultAsync(ct);

        if (latestResolution is null || latestResolution.Action != RevokeAction)
        {
            dbContext.ActivityLogs.Add(new ActivityLog
            {
                DepartmentId = requestLog.DepartmentId,
                UserId = currentUserId.Value,
                Category = "Subjects",
                Action = RevokeAction,
                EntityType = ResolutionEntityType,
                EntityId = (int)requestId,
                Details = "Permission revoked because request card was closed.",
                Severity = "Warning",
                CreatedAt = DateTime.UtcNow
            });
        }

        var alreadyDismissed = await dbContext.ActivityLogs.AnyAsync(a =>
            a.Action == DismissAction &&
            a.EntityType == ResolutionEntityType &&
            a.EntityId == (int)requestId &&
            a.UserId == currentUserId.Value,
            ct);

        if (alreadyDismissed)
        {
            return TypedResults.Ok(new { message = "Card already dismissed." });
        }

        dbContext.ActivityLogs.Add(new ActivityLog
        {
            DepartmentId = requestLog.DepartmentId,
            UserId = currentUserId.Value,
            Category = "Subjects",
            Action = DismissAction,
            EntityType = ResolutionEntityType,
            EntityId = (int)requestId,
            Details = "Dismissed request card.",
            Severity = "Info",
            CreatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(ct);
        return TypedResults.Ok(new { message = "Card dismissed." });
    }

    private static async Task<Guid?> GetSubjectOwnerIdAsync(AppDbContext dbContext, int subjectId, CancellationToken ct)
    {
        var ownerBySubject = await SubjectPermissionResolver.ResolveOwnerIdsAsync(dbContext, new[] { subjectId }, ct);
        return ownerBySubject.TryGetValue(subjectId, out var ownerId) ? ownerId : null;
    }
}