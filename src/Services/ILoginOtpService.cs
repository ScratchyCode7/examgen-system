using Databank.Entities;

namespace Databank.Services;

public sealed record LoginOtpChallengeResult(bool Success, string? ErrorMessage, string? ChallengeToken, DateTime? ExpiresAt, string? DeliveryHint);
public sealed record LoginOtpVerifyResult(bool Success, string? ErrorMessage, Guid? UserId);
public sealed record LoginOtpResendResult(bool Success, string? ErrorMessage, DateTime? ExpiresAt, int RetryAfterSeconds);

public interface ILoginOtpService
{
    Task<LoginOtpChallengeResult> CreateChallengeAsync(User user, CancellationToken ct = default);
    Task<LoginOtpVerifyResult> VerifyAsync(string challengeToken, string code, CancellationToken ct = default);
    Task<LoginOtpResendResult> ResendAsync(string challengeToken, CancellationToken ct = default);
}