using System.Net;
using System.Text;
using System.Text.RegularExpressions;

namespace Databank.Common;

public static partial class TextInputSanitizer
{
    private static readonly Regex BreakTagRegex = BreakTagRegexFactory();
    private static readonly Regex ClosingBlockTagRegex = ClosingBlockTagRegexFactory();
    private static readonly Regex AnyTagRegex = AnyTagRegexFactory();
    private static readonly Regex SpacesBeforeNewlineRegex = SpacesBeforeNewlineRegexFactory();
    private static readonly Regex ExcessiveNewlineRegex = ExcessiveNewlineRegexFactory();
    private static readonly Regex ScriptOrStyleBlockRegex = ScriptOrStyleBlockRegexFactory();
    private static readonly Regex EventHandlerAttributeRegex = EventHandlerAttributeRegexFactory();
    private static readonly Regex InlineStyleAttributeRegex = InlineStyleAttributeRegexFactory();
    private static readonly Regex ClassAttributeRegex = ClassAttributeRegexFactory();
    private static readonly Regex IdAttributeRegex = IdAttributeRegexFactory();
    private static readonly Regex FontTagRegex = FontTagRegexFactory();
    private static readonly Regex SpanTagRegex = SpanTagRegexFactory();

    public static string SanitizeRichTextHtml(string? value, bool trimEdges = true)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var sanitized = value
            .Normalize(NormalizationForm.FormKC)
            .Replace("\u00A0", " ")
            .Replace("\r\n", "\n")
            .Replace("\r", "\n");

        sanitized = ScriptOrStyleBlockRegex.Replace(sanitized, string.Empty);
        sanitized = EventHandlerAttributeRegex.Replace(sanitized, string.Empty);
        sanitized = InlineStyleAttributeRegex.Replace(sanitized, string.Empty);
        sanitized = ClassAttributeRegex.Replace(sanitized, string.Empty);
        sanitized = IdAttributeRegex.Replace(sanitized, string.Empty);
        sanitized = FontTagRegex.Replace(sanitized, string.Empty);
        sanitized = SpanTagRegex.Replace(sanitized, string.Empty);

        return trimEdges ? sanitized.Trim() : sanitized;
    }

    public static string NormalizeToPlainText(string? value, bool trimEdges = true)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var withLineBreaks = BreakTagRegex.Replace(value, "\n");
        withLineBreaks = ClosingBlockTagRegex.Replace(withLineBreaks, "\n");

        var noTags = AnyTagRegex.Replace(withLineBreaks, string.Empty);
        var decoded = WebUtility.HtmlDecode(noTags)
            .Normalize(NormalizationForm.FormKC)
            .Replace("\u00A0", " ")
            .Replace("\r\n", "\n")
            .Replace("\r", "\n");

        decoded = SpacesBeforeNewlineRegex.Replace(decoded, "\n");
        decoded = ExcessiveNewlineRegex.Replace(decoded, "\n\n");

        return trimEdges ? decoded.Trim() : decoded;
    }

    [GeneratedRegex("<br\\s*/?>", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex BreakTagRegexFactory();

    [GeneratedRegex("</(div|p|li|h1|h2|h3|h4|h5|h6|blockquote|tr|td|th)>", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex ClosingBlockTagRegexFactory();

    [GeneratedRegex("<[^>]+>", RegexOptions.Compiled)]
    private static partial Regex AnyTagRegexFactory();

    [GeneratedRegex("[ \\t]+\\n", RegexOptions.Compiled)]
    private static partial Regex SpacesBeforeNewlineRegexFactory();

    [GeneratedRegex("\\n{3,}", RegexOptions.Compiled)]
    private static partial Regex ExcessiveNewlineRegexFactory();

    [GeneratedRegex("<(script|style)[^>]*>[\\s\\S]*?</(script|style)>", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex ScriptOrStyleBlockRegexFactory();

    [GeneratedRegex("\\son\\w+\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex EventHandlerAttributeRegexFactory();

    [GeneratedRegex("\\sstyle\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex InlineStyleAttributeRegexFactory();

    [GeneratedRegex("\\sclass\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex ClassAttributeRegexFactory();

    [GeneratedRegex("\\sid\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex IdAttributeRegexFactory();

    [GeneratedRegex("</?font[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex FontTagRegexFactory();

    [GeneratedRegex("</?span[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex SpanTagRegexFactory();
}
