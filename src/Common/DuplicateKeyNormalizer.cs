using System.Text;

namespace Databank.Common;

public static class DuplicateKeyNormalizer
{
    public static string NormalizeKey(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value
            .Normalize(NormalizationForm.FormKC)
            .Trim()
            .ToLowerInvariant();

        var builder = new StringBuilder(normalized.Length);
        var previousWasWhitespace = false;

        foreach (var ch in normalized)
        {
            if (char.IsWhiteSpace(ch))
            {
                if (!previousWasWhitespace)
                {
                    builder.Append(' ');
                    previousWasWhitespace = true;
                }

                continue;
            }

            builder.Append(ch);
            previousWasWhitespace = false;
        }

        return builder.ToString().Trim();
    }

    public static string NormalizeQuestionHtml(string? html)
    {
        var sanitizedHtml = TextInputSanitizer.SanitizeRichTextHtml(html);
        var plainText = TextInputSanitizer.NormalizeToPlainText(sanitizedHtml);
        return NormalizeKey(plainText);
    }
}
