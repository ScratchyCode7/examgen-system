using System.Text.RegularExpressions;
using Databank.Entities;

namespace Databank.Services;

/// <summary>  
/// Extracts image metadata from HTML content before sanitization
/// Used to preserve image sizing and alignment information
/// </summary>
public static class HtmlImageExtractor
{
    private static readonly Regex ImgTagRegex = new(
        @"<img\s+([^>]*?)/?\\s*>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled,
        TimeSpan.FromSeconds(5)
    );

    private static readonly Regex StyleWidthRegex = new(
        @"width\s*:\s*([\\d.]+)\s*%",
        RegexOptions.IgnoreCase | RegexOptions.Compiled,
        TimeSpan.FromSeconds(5)
    );

    private static readonly Regex DataAttributeRegex = new(
        @"data-(\w+)\s*=\s*[""']?([^""'\s>]+)[""']?",
        RegexOptions.IgnoreCase | RegexOptions.Compiled,
        TimeSpan.FromSeconds(5)
    );

    private static readonly Regex SrcAttributeRegex = new(
        @"src\s*=\s*[""']([^""']+)[""']",
        RegexOptions.IgnoreCase | RegexOptions.Compiled,
        TimeSpan.FromSeconds(5)
    );

    /// <summary>
    /// Extracts image metadata from HTML content
    /// Returns list of image data to be saved in QuestionImage table
    /// </summary>
    public static List<(string Src, int WidthPercentage, string Alignment)> ExtractImageMetadata(string htmlContent)
    {
        if (string.IsNullOrWhiteSpace(htmlContent))
        {
            return new();
        }

        var images = new List<(string, int, string)>();

        try
        {
            var matches = ImgTagRegex.Matches(htmlContent);
            foreach (Match match in matches)
            {
                if (!match.Success)
                    continue;

                var imgTag = match.Value;
                var src = ExtractSrc(imgTag);
                var width = ExtractWidth(imgTag);
                var alignment = ExtractAlignment(imgTag);

                if (!string.IsNullOrWhiteSpace(src))
                {
                    images.Add((src, width, alignment));
                }
            }
        }
        catch (Exception ex)
        {
            // Log but don't throw - image extraction is non-critical
            System.Diagnostics.Debug.WriteLine($"Failed to extract image metadata: {ex.Message}");
        }

        return images;
    }

    private static string ExtractSrc(string imgTag)
    {
        var match = SrcAttributeRegex.Match(imgTag);
        return match.Success ? match.Groups[1].Value : string.Empty;
    }

    private static int ExtractWidth(string imgTag)
    {
        // First try to extract from style="width: X%"
        const string stylePattern = @"style\s*=\s*[""']([^""']*)[""']";
        var styleMatch = Regex.Match(imgTag, stylePattern, RegexOptions.IgnoreCase);
        
        if (styleMatch.Success)
        {
            var styleContent = styleMatch.Groups[1].Value;
            var widthMatch = StyleWidthRegex.Match(styleContent);
            if (widthMatch.Success && double.TryParse(widthMatch.Groups[1].Value, out var width))
            {
                return Math.Max(10, Math.Min(100, (int)width));
            }
        }

        // Fall back to data-width attribute
        var dataMatches = DataAttributeRegex.Matches(imgTag);
        foreach (Match dataMatch in dataMatches)
        {
            if (dataMatch.Groups[1].Value.Equals("width", StringComparison.OrdinalIgnoreCase))
            {
                if (int.TryParse(dataMatch.Groups[2].Value, out var width))
                {
                    return Math.Max(10, Math.Min(100, width));
                }
            }
        }

        return 50; // Default
    }

    private static string ExtractAlignment(string imgTag)
    {
        var dataMatches = DataAttributeRegex.Matches(imgTag);
        foreach (Match dataMatch in dataMatches)
        {
            if (dataMatch.Groups[1].Value.Equals("alignment", StringComparison.OrdinalIgnoreCase))
            {
                var alignment = dataMatch.Groups[2].Value;
                return alignment == "Left" || alignment == "Right" ? alignment : "Center";
            }
        }

        return "Center"; // Default
    }
}
