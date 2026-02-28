using System.Text;

namespace Databank.Features.Tests;

internal static class TestSignatureHelper
{
    public static string BuildSignature(IEnumerable<(int questionId, int displayOrder)> questions)
    {
        var ordered = questions
            .OrderBy(q => q.displayOrder)
            .ThenBy(q => q.questionId)
            .ToList();

        var builder = new StringBuilder();
        for (int i = 0; i < ordered.Count; i++)
        {
            if (i > 0)
            {
                builder.Append('|');
            }

            builder.Append(ordered[i].displayOrder);
            builder.Append(':');
            builder.Append(ordered[i].questionId);
        }

        return builder.ToString();
    }
}
