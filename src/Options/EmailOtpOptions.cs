namespace Databank.Options;

public sealed class EmailOtpOptions
{
    public const string SectionName = "EmailOtp";

    public bool Enabled { get; set; }
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public string SmtpUsername { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public bool EnableSsl { get; set; } = true;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = "Databank Security";
    public int OtpLength { get; set; } = 6;
    public int OtpExpiryMinutes { get; set; } = 10;
    public int MaxOtpAttempts { get; set; } = 5;
}
