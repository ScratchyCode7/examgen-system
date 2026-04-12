namespace Databank.Entities;

/// <summary>
/// Represents a trusted device for a user, allowing login without OTP for known devices
/// </summary>
public sealed class UserTrustedDevice
{
    public Guid UserTrustedDeviceId { get; set; }
    public Guid UserId { get; set; }
    public string DeviceFingerprint { get; set; } = string.Empty;
    public DateTime TrustedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}