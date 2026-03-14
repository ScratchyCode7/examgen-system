using System.Linq;
using System.Text.Json;
using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Tests;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Tests.GetById;

public sealed class GetTestEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tests/{id:int}", async Task<IResult> (int id, AppDbContext dbContext, CancellationToken ct) =>
        {
            var test = await dbContext.Tests
                .Include(t => t.TestQuestions)
                    .ThenInclude(tq => tq.Question)
                        .ThenInclude(q => q.Options)
                .Include(t => t.TestQuestions)
                    .ThenInclude(tq => tq.Question)
                        .ThenInclude(q => q.QuestionImage)
                .Include(t => t.Subject)
                .FirstOrDefaultAsync(t => t.Id == id, ct);

            if (test is null)
                return TypedResults.NotFound();

            var questionResponses = test.TestQuestions
                .OrderBy(tq => tq.DisplayOrder)
                .Select(tq =>
                {
                    var orderedOptions = OrderOptionsBySnapshot(tq);
                    QuestionImageResponse? image = null;
                    if (tq.Question.QuestionImage != null)
                    {
                        image = new QuestionImageResponse(
                            tq.Question.QuestionImage.Id,
                            tq.Question.QuestionImage.ImagePath,
                            tq.Question.QuestionImage.WidthPercentage,
                            tq.Question.QuestionImage.Alignment);
                    }

                    return new QuestionResponse(
                        tq.Question.Id,
                        tq.Question.Content,
                        (int)tq.Question.BloomLevel,
                        tq.DisplayOrder,
                        orderedOptions
                            .Select((o, idx) => new OptionResponse(o.Id, o.Content, o.IsCorrect, idx))
                            .ToList(),
                        image);
                })
                .ToList();

            var response = test.ToResponse(questionResponses);
            return TypedResults.Ok(response);
        }).RequireAuthorization();
    }

    private static IReadOnlyList<Option> OrderOptionsBySnapshot(TestQuestion testQuestion)
    {
        var options = testQuestion.Question.Options?.ToList() ?? new List<Option>();
        if (options.Count == 0)
        {
            return options;
        }

        if (string.IsNullOrWhiteSpace(testQuestion.OptionSnapshotJson))
        {
            return options.OrderBy(o => o.DisplayOrder).ToList();
        }

        try
        {
            var snapshot = JsonSerializer.Deserialize<List<OptionSnapshotDto>>(testQuestion.OptionSnapshotJson);
            if (snapshot is null || snapshot.Count == 0)
            {
                return options.OrderBy(o => o.DisplayOrder).ToList();
            }

            var lookup = options.ToDictionary(o => o.Id);
            var ordered = new List<Option>(options.Count);

            foreach (var entry in snapshot.OrderBy(s => s.DisplayOrder))
            {
                if (lookup.TryGetValue(entry.OptionId, out var option))
                {
                    ordered.Add(option);
                }
            }

            if (ordered.Count < options.Count)
            {
                var orderedIds = ordered.Select(o => o.Id).ToHashSet();
                var remaining = options
                    .Where(o => !orderedIds.Contains(o.Id))
                    .OrderBy(o => o.DisplayOrder);
                ordered.AddRange(remaining);
            }

            return ordered;
        }
        catch (JsonException)
        {
            return options.OrderBy(o => o.DisplayOrder).ToList();
        }
    }

    private sealed record OptionSnapshotDto(int OptionId, int DisplayOrder);
}

