namespace Databank.Services;

public interface IUserSessionService
{
    Task<Guid?> StartSessionIfAvailableAsync(Guid userId, bool terminateExistingSessions = false, CancellationToken ct = default);
    Task<bool> ValidateAndTouchAsync(Guid userId, Guid sessionId, CancellationToken ct = default);
    Task InvalidateSessionAsync(Guid userId, Guid sessionId, CancellationToken ct = default);
}