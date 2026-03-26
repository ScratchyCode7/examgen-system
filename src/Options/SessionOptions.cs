namespace Databank.Options;

public sealed class SessionOptions
{
    public const string SectionName = "Session";

    public int InactivityTimeoutMinutes { get; set; } = 30;
}