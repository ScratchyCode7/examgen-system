using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Admin;

public sealed class SeedFcl100QuestionsEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/admin/seed-fcl100-questions", async Task<IResult> (
                AppDbContext dbContext) =>
        {
            var result = await Fcl100QuestionSeeder.SeedFCL100QuestionsAsync(dbContext);
            return TypedResults.Ok(result);
        }).RequireAuthorization("AdminOnly");
    }
}

public static class Fcl100QuestionSeeder
{
    private static readonly (BloomLevel Level, int Count)[] BloomDistribution =
    [
        (BloomLevel.Remember, 15),
        (BloomLevel.Understand, 15),
        (BloomLevel.Apply, 15),
        (BloomLevel.Analyze, 15),
        (BloomLevel.Evaluate, 20),
        (BloomLevel.Create, 20)
    ];

    private static readonly string[] TopicTitles =
    [
        "The Perpetualite: The Identity and Dignity",
        "Filipino Christian Values and Moral Responsibility",
        "Integral Human Formation: Head, Heart, and Hand"
    ];

    private static readonly (string Concept, string Meaning)[] Concepts =
    [
        ("human dignity", "every person has worth because each one is created by God"),
        ("service", "using one\'s gifts to help others, especially those in need"),
        ("stewardship", "responsibly caring for resources, time, and creation"),
        ("solidarity", "standing with others and sharing their burdens"),
        ("compassion", "responding to suffering with concrete care"),
        ("truthfulness", "speaking and living honestly"),
        ("justice", "giving each person what is due to them"),
        ("responsibility", "accepting accountability for one\'s choices"),
        ("integrity", "consistency between values, words, and actions"),
        ("respect", "treating all persons with courtesy and fairness"),
        ("discipline", "choosing what is right even when difficult"),
        ("community", "building relationships that promote the common good"),
        ("moral discernment", "judging choices in light of faith and reason"),
        ("peace-building", "resolving conflict through dialogue and fairness"),
        ("gratitude", "recognizing blessings and responding with generosity"),
        ("faith", "trusting God and living according to Gospel values"),
        ("hope", "remaining steadfast while working for what is good"),
        ("charity", "loving others through concrete acts of care"),
        ("leadership", "guiding others through service and moral example"),
        ("conscience", "the inner call to choose what is good and avoid evil")
    ];

    private static readonly string[] SchoolContexts =
    [
        "a group project",
        "a classroom discussion",
        "a campus outreach activity",
        "student council planning",
        "a peer mentoring session",
        "a conflict among classmates",
        "an online class forum",
        "community immersion week",
        "a service-learning event",
        "an exam preparation period"
    ];

    public static async Task<SeedFcl100QuestionsResult> SeedFCL100QuestionsAsync(AppDbContext context)
    {
        var result = new SeedFcl100QuestionsResult();

        var subject = await context.Subjects
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Code == "FCL100" || s.Name.Contains("Perpetualite"));

        if (subject is null)
        {
            result.Summary = "FCL100 subject not found. Seed aborted.";
            return result;
        }

        var topics = await context.Topics
            .Where(t => t.SubjectId == subject.Id && TopicTitles.Contains(t.Title))
            .ToListAsync();

        if (topics.Count < 3)
        {
            result.Summary = "Expected 3 FCL100 topics were not found. Seed aborted.";
            return result;
        }

        var topicIds = topics.Select(t => t.Id).ToList();
        var random = new Random();

        var seedItems = BuildSeedItems(topicIds, random);
        result.PlannedQuestions = seedItems.Count;

        var existingKeys = await context.Questions
            .Where(q => topicIds.Contains(q.TopicId))
            .Select(q => q.TopicId + "|" + q.Content)
            .ToListAsync();

        var existing = new HashSet<string>(existingKeys);

        foreach (var item in seedItems)
        {
            var key = item.TopicId + "|" + item.QuestionText;
            if (existing.Contains(key))
            {
                result.SkippedAsDuplicate++;
                continue;
            }

            var question = new Question
            {
                TopicId = item.TopicId,
                Content = item.QuestionText,
                QuestionType = "MultipleChoice",
                BloomLevel = item.BloomLevel,
                Points = 1,
                DisplayOrder = 0,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Options = BuildOptions(item)
            };

            await context.Questions.AddAsync(question);
            result.Inserted++;
            result.InsertedByBloom[item.BloomLevel.ToString()] = result.InsertedByBloom.GetValueOrDefault(item.BloomLevel.ToString()) + 1;
            existing.Add(key);
        }

        if (result.Inserted > 0)
        {
            await context.SaveChangesAsync();
        }

        result.Summary = $"Planned: {result.PlannedQuestions}, Inserted: {result.Inserted}, Skipped duplicates: {result.SkippedAsDuplicate}";
        return result;
    }

    private static List<SeedQuestionItem> BuildSeedItems(IReadOnlyList<int> topicIds, Random random)
    {
        var items = new List<SeedQuestionItem>(100);
        var runningIndex = 1;

        foreach (var (level, count) in BloomDistribution)
        {
            for (var i = 0; i < count; i++)
            {
                var concept = Concepts[(runningIndex - 1) % Concepts.Length];
                var context = SchoolContexts[(runningIndex - 1) % SchoolContexts.Length];
                var topicId = topicIds[random.Next(topicIds.Count)];

                items.Add(BuildByBloom(level, runningIndex, concept, context, topicId));
                runningIndex++;
            }
        }

        return items;
    }

    private static SeedQuestionItem BuildByBloom(
        BloomLevel bloomLevel,
        int index,
        (string Concept, string Meaning) concept,
        string schoolContext,
        int topicId)
    {
        return bloomLevel switch
        {
            BloomLevel.Remember => new SeedQuestionItem(
                $"[{index}] In FCL100, what best describes {concept.Concept}?",
                $"{concept.Meaning}",
                "prioritizing personal gain over others",
                "following rules only when convenient",
                "avoiding responsibility for decisions",
                "A",
                BloomLevel.Remember,
                topicId),

            BloomLevel.Understand => new SeedQuestionItem(
                $"[{index}] During {schoolContext}, which statement shows correct understanding of {concept.Concept}?",
                $"It means {concept.Meaning}.",
                "It means success is measured only by grades.",
                "It means values are private and should not affect behavior.",
                "It means leadership is about control over people.",
                "A",
                BloomLevel.Understand,
                topicId),

            BloomLevel.Apply => new SeedQuestionItem(
                $"[{index}] In {schoolContext}, a student wants to practice {concept.Concept}. What is the best action?",
                "Ignore the issue to avoid conflict.",
                "Take a concrete step that protects people and promotes the common good.",
                "Wait for others to act first before doing anything.",
                "Post about values online without changing behavior.",
                "B",
                BloomLevel.Apply,
                topicId),

            BloomLevel.Analyze => new SeedQuestionItem(
                $"[{index}] Which situation in {schoolContext} best demonstrates {concept.Concept} in practice?",
                "A student claims values are important but refuses to help classmates.",
                "A student balances truth, care, and responsibility before making a decision.",
                "A student blames others immediately without checking facts.",
                "A student follows peers even when actions are unjust.",
                "B",
                BloomLevel.Analyze,
                topicId),

            BloomLevel.Evaluate => new SeedQuestionItem(
                $"[{index}] Which judgment best aligns with Filipino Christian values when deciding under pressure in {schoolContext}?",
                "Choose what is easiest even if others are harmed.",
                "Choose what is popular even if it is unfair.",
                "Choose what respects dignity, justice, and moral responsibility.",
                "Choose what avoids accountability.",
                "C",
                BloomLevel.Evaluate,
                topicId),

            BloomLevel.Create => new SeedQuestionItem(
                $"[{index}] You are asked to design a class initiative for {schoolContext}. Which plan best reflects integral formation (head, heart, and hand)?",
                "A plan focused only on memorization and test scores.",
                "A plan with inspiring talks but no concrete service.",
                "A plan with activities but no reflection on values.",
                "A plan combining critical reflection, empathy-building, and sustained service action.",
                "D",
                BloomLevel.Create,
                topicId),

            _ => throw new ArgumentOutOfRangeException(nameof(bloomLevel), bloomLevel, null)
        };
    }

    private static List<Option> BuildOptions(SeedQuestionItem item)
    {
        return
        [
            new Option { Content = item.OptionA, IsCorrect = item.CorrectAnswer == "A", DisplayOrder = 1 },
            new Option { Content = item.OptionB, IsCorrect = item.CorrectAnswer == "B", DisplayOrder = 2 },
            new Option { Content = item.OptionC, IsCorrect = item.CorrectAnswer == "C", DisplayOrder = 3 },
            new Option { Content = item.OptionD, IsCorrect = item.CorrectAnswer == "D", DisplayOrder = 4 }
        ];
    }
}

public sealed record SeedQuestionItem(
    string QuestionText,
    string OptionA,
    string OptionB,
    string OptionC,
    string OptionD,
    string CorrectAnswer,
    BloomLevel BloomLevel,
    int TopicId);

public sealed class SeedFcl100QuestionsResult
{
    public int PlannedQuestions { get; set; }
    public int Inserted { get; set; }
    public int SkippedAsDuplicate { get; set; }
    public Dictionary<string, int> InsertedByBloom { get; set; } = new();
    public string Summary { get; set; } = string.Empty;
}
