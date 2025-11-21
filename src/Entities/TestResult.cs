namespace Databank.Entities;

public sealed class TestResult
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public int TestId { get; set; }
    public double Score { get; set; }
    public DateTime CompletedAt { get; set; }
    public int CorrectAnswers { get; set; }
    public int TotalQuestions { get; set; }
    public TimeSpan Duration { get; set; }

    public User User { get; set; } = null!;
    public Test Test { get; set; } = null!;
}
