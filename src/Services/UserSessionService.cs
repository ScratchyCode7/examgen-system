using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SessionOptions = Databank.Options.SessionOptions;

namespace Databank.Services;

public sealed class UserSessionService(AppDbContext dbContext, IOptions<SessionOptions> sessionOptions) : IUserSessionService
{
    private readonly SessionOptions _sessionOptions = sessionOptions.Value;

    public async Task<Guid?> StartSessionIfAvailableAsync(Guid userId, bool terminateExistingSessions = false, CancellationToken ct = default)
    {
        var utcNow = DateTime.UtcNow;
        var inactivityTimeout = TimeSpan.FromMinutes(_sessionOptions.InactivityTimeoutMinutes);

        var activeSessions = await dbContext.UserSessions
            .Where(x => x.UserId == userId && x.Status == SessionStatus.Active)
            .ToListAsync(ct);

        var hasValidActiveSession = false;

        foreach (var session in activeSessions)
        {
            if ((utcNow - session.LastActivity) > inactivityTimeout)
            {
                session.Status = SessionStatus.Inactive;
                session.LastActivity = utcNow;
                continue;
            }

            hasValidActiveSession = true;
        }

        if (hasValidActiveSession)
        {
            if (!terminateExistingSessions)
            {
                await dbContext.SaveChangesAsync(ct);
                return null;
            }

            foreach (var session in activeSessions.Where(x => x.Status == SessionStatus.Active))
            {
                session.Status = SessionStatus.Inactive;
                session.LastActivity = utcNow;
            }
        }

        var newSessionId = Guid.NewGuid();
        dbContext.UserSessions.Add(new UserSession
        {
            UserId = userId,
            SessionId = newSessionId,
            Status = SessionStatus.Active,
            LastActivity = utcNow,
            CreatedAt = utcNow
        });

        await dbContext.SaveChangesAsync(ct);
        return newSessionId;
    }

    public async Task<bool> ValidateAndTouchAsync(Guid userId, Guid sessionId, CancellationToken ct = default)
    {
        var session = await dbContext.UserSessions
            .SingleOrDefaultAsync(
                x => x.UserId == userId && x.SessionId == sessionId && x.Status == SessionStatus.Active,
                ct);

        if (session is null)
        {
            return false;
        }

        var utcNow = DateTime.UtcNow;
        var inactivityTimeout = TimeSpan.FromMinutes(_sessionOptions.InactivityTimeoutMinutes);

        if ((utcNow - session.LastActivity) > inactivityTimeout)
        {
            session.Status = SessionStatus.Inactive;
            session.LastActivity = utcNow;
            await dbContext.SaveChangesAsync(ct);
            return false;
        }

        session.LastActivity = utcNow;
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task InvalidateSessionAsync(Guid userId, Guid sessionId, CancellationToken ct = default)
    {
        var session = await dbContext.UserSessions
            .SingleOrDefaultAsync(
                x => x.UserId == userId && x.SessionId == sessionId && x.Status == SessionStatus.Active,
                ct);

        if (session is null)
        {
            return;
        }

        session.Status = SessionStatus.Inactive;
        session.LastActivity = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(ct);
    }
}