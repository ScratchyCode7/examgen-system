namespace Databank.Entities;

/// <summary>
/// Represents an image asset attached to a question
/// Stored as inline-block with configurable width and alignment
/// Designed to work within print layout constraints
/// </summary>
public sealed class QuestionImage
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    
    /// <summary>
    /// Relative path to the image file (e.g., "uploads/questions/img_123.png")
    /// </summary>
    public string ImagePath { get; set; } = null!;
    
    /// <summary>
    /// Width as percentage of container (10-100)
    /// </summary>
    public int WidthPercentage { get; set; } = 50;
    
    /// <summary>
    /// Image alignment: "Left", "Center", or "Right"
    /// </summary>
    public string Alignment { get; set; } = "Center";
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public Question Question { get; set; } = null!;
}
