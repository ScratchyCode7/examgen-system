namespace Databank.Entities;

/// <summary>
/// Represents an OTP challenge for login from a new device
/// </summary>
public sealed class LoginOtpChallenge
{
    public Guid LoginOtpChallengeId { get; set; }
    public Guid UserId { get; set; }
    public string CodeHash { get; set; } = string.Empty;
    public string DeviceFingerprint { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public int AttemptsRemaining { get; set; } = 3;
    public DateTime CreatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}