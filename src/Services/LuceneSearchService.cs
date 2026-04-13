using System.Diagnostics;
using System.Text.RegularExpressions;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Options;
using Databank.Features.Search;
using Lucene.Net.Analysis.Standard;
using Lucene.Net.Documents;
using Lucene.Net.Index;
using Lucene.Net.QueryParsers.Classic;
using Lucene.Net.Search;
using Lucene.Net.Search.Similarities;
using Lucene.Net.Store;
using LuceneVersion = Lucene.Net.Util.LuceneVersion;
using Microsoft.EntityFrameworkCore;

namespace Databank.Services;

public sealed class LuceneSearchService : ISearchService
{
        private const int MaxSearchHits = 500;

    private const LuceneVersion AppLuceneVersion = LuceneVersion.LUCENE_48;

    private const string FieldQuestionId = "questionId";
    private const string FieldQuestionText = "questionText";
    private const string FieldSubject = "subject";
    private const string FieldTopic = "topic";
    private const string FieldBloomLevel = "bloomLevel";
    private const string FieldQuestionType = "questionType";

    private const string StoredSubject = "subjectStored";
    private const string StoredTopic = "topicStored";

    private static readonly Regex HtmlTagRegex = new("<[^>]+>", RegexOptions.Compiled);

    private readonly AppDbContext _dbContext;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<LuceneSearchService> _logger;
    private readonly StandardAnalyzer _analyzer;
    private static readonly SemaphoreSlim IndexWriteLock = new(1, 1);
    private readonly string _indexPath;
    private static volatile bool _indexInitialized;

    public LuceneSearchService(
        AppDbContext dbContext,
        IWebHostEnvironment environment,
        ILogger<LuceneSearchService> logger)
    {
        _dbContext = dbContext;
        _environment = environment;
        _logger = logger;
        _analyzer = new StandardAnalyzer(AppLuceneVersion);
        _indexPath = Path.Combine(_environment.ContentRootPath, "search-index", "questions");
    }

    public async Task RebuildIndexAsync(CancellationToken ct = default)
    {
        var records = await _dbContext.Questions
            .AsNoTracking()
            .Where(q => q.IsActive)
            .Include(q => q.Topic)
                .ThenInclude(t => t.Subject)
            .ToListAsync(ct);

        await IndexWriteLock.WaitAsync(ct);
        try
        {
            System.IO.Directory.CreateDirectory(_indexPath);
            using var luceneDirectory = FSDirectory.Open(_indexPath);
            var writerConfig = new IndexWriterConfig(AppLuceneVersion, _analyzer)
            {
                OpenMode = OpenMode.CREATE,
                Similarity = new BM25Similarity()
            };

            using var writer = new IndexWriter(luceneDirectory, writerConfig);
            foreach (var question in records)
            {
                writer.AddDocument(BuildDocument(question));
            }

            writer.Flush(triggerMerge: false, applyAllDeletes: true);
            writer.Commit();
            _indexInitialized = true;
            _logger.LogInformation("Lucene search index rebuilt with {Count} questions.", records.Count);
        }
        finally
        {
            IndexWriteLock.Release();
        }
    }

    public async Task IndexQuestionAsync(int questionId, CancellationToken ct = default)
    {
        await EnsureIndexInitializedAsync(ct);

        var question = await _dbContext.Questions
            .AsNoTracking()
            .Where(q => q.Id == questionId)
            .Include(q => q.Topic)
                .ThenInclude(t => t.Subject)
            .FirstOrDefaultAsync(ct);

        if (question is null)
        {
            await RemoveQuestionAsync(questionId, ct);
            return;
        }

        await IndexWriteLock.WaitAsync(ct);
        try
        {
            using var luceneDirectory = FSDirectory.Open(_indexPath);
            var writerConfig = new IndexWriterConfig(AppLuceneVersion, _analyzer)
            {
                OpenMode = OpenMode.CREATE_OR_APPEND,
                Similarity = new BM25Similarity()
            };

            using var writer = new IndexWriter(luceneDirectory, writerConfig);
            writer.UpdateDocument(new Term(FieldQuestionId, questionId.ToString()), BuildDocument(question));
            writer.Flush(triggerMerge: false, applyAllDeletes: true);
            writer.Commit();
        }
        finally
        {
            IndexWriteLock.Release();
        }
    }

    public async Task RemoveQuestionAsync(int questionId, CancellationToken ct = default)
    {
        await EnsureIndexInitializedAsync(ct);

        await IndexWriteLock.WaitAsync(ct);
        try
        {
            using var luceneDirectory = FSDirectory.Open(_indexPath);
            var writerConfig = new IndexWriterConfig(AppLuceneVersion, _analyzer)
            {
                OpenMode = OpenMode.CREATE_OR_APPEND,
                Similarity = new BM25Similarity()
            };

            using var writer = new IndexWriter(luceneDirectory, writerConfig);
            writer.DeleteDocuments(new Term(FieldQuestionId, questionId.ToString()));
            writer.Flush(triggerMerge: false, applyAllDeletes: true);
            writer.Commit();
        }
        finally
        {
            IndexWriteLock.Release();
        }
    }

    public async Task<SearchResponse> SearchAsync(string query, SearchFilters filters, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new SearchResponse(new List<SearchResultItem>(), 0, 0, 0);
        }

        await EnsureIndexInitializedAsync(ct);

        var stopwatch = Stopwatch.StartNew();

        TopDocs topDocs;
        List<(int QuestionId, float Score)> rankedIds;

        using (var luceneDirectory = FSDirectory.Open(_indexPath))
        using (var reader = DirectoryReader.Open(luceneDirectory))
        {
            var searcher = new IndexSearcher(reader)
            {
                Similarity = new BM25Similarity()
            };

            var parser = new QueryParser(AppLuceneVersion, FieldQuestionText, _analyzer)
            {
                DefaultOperator = QueryParserBase.AND_OPERATOR
            };

            var escapedQuery = QueryParserBase.Escape(query.Trim());
            var parsedQuery = parser.Parse(escapedQuery);
            var boolQuery = new BooleanQuery
            {
                { parsedQuery, Occur.MUST }
            };

            AddFilter(boolQuery, FieldSubject, filters.Subject);
            AddFilter(boolQuery, FieldTopic, filters.Topic);
            AddFilter(boolQuery, FieldBloomLevel, filters.BloomLevel);
            AddFilter(boolQuery, FieldQuestionType, filters.QuestionType);

            topDocs = searcher.Search(boolQuery, MaxSearchHits);

            rankedIds = topDocs.ScoreDocs
                .Select(sd =>
                {
                    var doc = searcher.Doc(sd.Doc);
                    var idValue = doc.Get(FieldQuestionId);
                    return int.TryParse(idValue, out var id)
                        ? (QuestionId: id, Score: sd.Score)
                        : (QuestionId: 0, Score: 0f);
                })
                .Where(x => x.QuestionId > 0)
                .ToList();
        }

        var ids = rankedIds.Select(x => x.QuestionId).ToArray();
        var indexById = ids
            .Select((id, index) => new { id, index })
            .ToDictionary(x => x.id, x => x.index);
        var scoreById = rankedIds.ToDictionary(x => x.QuestionId, x => x.Score);

        var questionsQuery = _dbContext.Questions
            .AsNoTracking()
            .Where(q => ids.Contains(q.Id));

        if (filters.CourseId.HasValue)
        {
            questionsQuery = questionsQuery.Where(q => q.Topic.Subject.CourseId == filters.CourseId.Value);
        }

        if (filters.SubjectId.HasValue)
        {
            questionsQuery = questionsQuery.Where(q => q.Topic.SubjectId == filters.SubjectId.Value);
        }

        if (filters.TopicId.HasValue)
        {
            questionsQuery = questionsQuery.Where(q => q.TopicId == filters.TopicId.Value);
        }

        var questions = await questionsQuery
            .Include(q => q.Options)
            .Include(q => q.Topic)
                .ThenInclude(t => t.Subject)
            .ToListAsync(ct);

        var ordered = questions
            .OrderBy(q => indexById[q.Id])
            .Select(q => new SearchResultItem(
                q.Id,
                q.TopicId,
                q.Content,
                q.QuestionType,
                q.BloomLevel,
                q.Points,
                q.DisplayOrder,
                q.IsActive,
                q.Topic?.Subject?.Name ?? string.Empty,
                q.Topic?.Title ?? string.Empty,
                scoreById[q.Id],
                q.Options
                    ?.OrderBy(o => o.DisplayOrder)
                    .Select(o => new OptionResponse(o.Id, o.QuestionId, o.Content, o.IsCorrect, o.DisplayOrder))
                    .ToList()
            ))
            .ToList();

        stopwatch.Stop();

        var similarThreshold = ordered.Count > 0
            ? ordered.Average(r => r.Score)
            : 0;
        var similarCount = ordered.Count(r => r.Score >= similarThreshold && r.Score > 0);

        return new SearchResponse(
            ordered,
            ordered.Count,
            stopwatch.ElapsedMilliseconds,
            similarCount
        );
    }

    private async Task EnsureIndexInitializedAsync(CancellationToken ct)
    {
        if (_indexInitialized)
        {
            return;
        }

        await RebuildIndexAsync(ct);
    }

    private static void AddFilter(BooleanQuery boolQuery, string field, string? rawValue)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return;
        }

        var normalized = NormalizeFilterValue(rawValue);
        boolQuery.Add(new TermQuery(new Term(field, normalized)), Occur.MUST);
    }

    private static Document BuildDocument(Question question)
    {
        var normalizedSubject = NormalizeFilterValue(question.Topic?.Subject?.Name);
        var normalizedTopic = NormalizeFilterValue(question.Topic?.Title);
        var normalizedBloomLevel = NormalizeFilterValue(question.BloomLevel.ToString());
        var normalizedQuestionType = NormalizeFilterValue(question.QuestionType);
        var cleanQuestionText = StripHtml(question.Content);

        var doc = new Document
        {
            new StringField(FieldQuestionId, question.Id.ToString(), Field.Store.YES),
            new TextField(FieldQuestionText, cleanQuestionText, Field.Store.YES),
            new StringField(FieldSubject, normalizedSubject, Field.Store.YES),
            new StringField(FieldTopic, normalizedTopic, Field.Store.YES),
            new StringField(FieldBloomLevel, normalizedBloomLevel, Field.Store.YES),
            new StringField(FieldQuestionType, normalizedQuestionType, Field.Store.YES),
            new StoredField(StoredSubject, question.Topic?.Subject?.Name ?? string.Empty),
            new StoredField(StoredTopic, question.Topic?.Title ?? string.Empty)
        };

        return doc;
    }

    private static string StripHtml(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return string.Empty;
        }

        return HtmlTagRegex.Replace(content, " ");
    }

    private static string NormalizeFilterValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToLowerInvariant();
    }
}
