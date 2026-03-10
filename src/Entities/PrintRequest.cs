namespace Databank.Entities;

public class PrintRequest
{
    public Guid PrintRequestId { get; set; }
    
    public int TestId { get; set; }
    public Test Test { get; set; } = null!;
    
    public Guid RequestedByUserId { get; set; }
    public User RequestedBy { get; set; } = null!;
    
    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;
    
    public PrintRequestStatus Status { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    
    public Guid? ProcessedByUserId { get; set; }
    public User? ProcessedBy { get; set; }
    
    public string? Notes { get; set; }
    public int CopiesRequested { get; set; } = 1;
}

public enum PrintRequestStatus
{
    Pending = 0,
    ReadyForPickup = 1,
    Completed = 2,
    Rejected = 3
}
