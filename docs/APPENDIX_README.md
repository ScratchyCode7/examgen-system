# Appendix: Important System Code

This appendix contains the important code for the system, focused on the thesis features you listed: strict 30/30/40 rule, Table of Specifications (TOS), image upload/rendering, BM25 search, print request workflow, role-based access control (RBAC), and action logging/audit trail.

## Scope
- Backend (.NET API) and frontend (React)
- Root folders: `src/` (backend) and `client/src/` (frontend)

## Backend: RBAC and Authentication (Full Code)

File: [src/Program.cs](src/Program.cs)

```csharp
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json.Serialization;
using Databank.Database;
using Databank.Entities;
using Databank.Extensions;
using Databank.Middleware;
using Databank.Options;
using Databank.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SessionOptions = Databank.Options.SessionOptions;

// Render and other Linux containers can have strict inotify limits.
// Disable host config reload-on-change before creating the builder to avoid FileSystemWatcher startup crashes.
if (!string.Equals(Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"), "Development", StringComparison.OrdinalIgnoreCase))
{
	Environment.SetEnvironmentVariable("DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE", "false");
}

var builder = WebApplication.CreateBuilder(args);

// Disable file watching on configuration to prevent inotify limit issues on container platforms like Render
if (!builder.Environment.IsDevelopment())
{
	foreach (var source in builder.Configuration.Sources.OfType<Microsoft.Extensions.Configuration.Json.JsonConfigurationSource>())
	{
		source.ReloadOnChange = false;
	}
	Console.WriteLine("✓ File change monitoring disabled for production environment");
}

builder.Services.AddDbContext<AppDbContext>(options =>
	options.UseNpgsql(builder.Configuration.GetConnectionString("PostgresConnection"))
);

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<SessionOptions>(builder.Configuration.GetSection(SessionOptions.SectionName));
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IUserSessionService, UserSessionService>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<ILoggingService, LoggingService>();
builder.Services.AddScoped<IDepartmentAccessService, DepartmentAccessService>();
builder.Services.AddScoped<IUserOwnershipTransferService, UserOwnershipTransferService>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<ISearchService, LuceneSearchService>();
builder.Services.AddHostedService<SearchIndexWarmupService>();
builder.Services.AddEndpoints(typeof(Program).Assembly);
builder.Services.AddControllers();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
	.AddJwtBearer(options =>
	{
		var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
		options.TokenValidationParameters = new TokenValidationParameters
		{
			ValidateIssuer = true,
			ValidateAudience = true,
			ValidateLifetime = true,
			ValidateIssuerSigningKey = true,
			ValidIssuer = jwtOptions.Issuer,
			ValidAudience = jwtOptions.Audience,
			IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey))
		};

		options.Events = new JwtBearerEvents
		{
			OnTokenValidated = async context =>
			{
				var principal = context.Principal;
				var userIdValue = principal?.FindFirstValue(JwtRegisteredClaimNames.Sub)
								  ?? principal?.FindFirstValue(ClaimTypes.NameIdentifier);
				var sessionIdValue = principal?.FindFirstValue(JwtRegisteredClaimNames.Sid)
									 ?? principal?.FindFirstValue("sid");

				if (!Guid.TryParse(userIdValue, out var userId) || !Guid.TryParse(sessionIdValue, out var sessionId))
				{
					context.Fail("Invalid session claims.");
					return;
				}

				var sessionService = context.HttpContext.RequestServices.GetRequiredService<IUserSessionService>();
				var isSessionValid = await sessionService.ValidateAndTouchAsync(
					userId,
					sessionId,
					context.HttpContext.RequestAborted);

				if (!isSessionValid)
				{
					context.Fail("Session is invalid or expired.");
				}
			}
		};
	});

builder.Services.AddAuthorization(options =>
{
	options.AddPolicy("AdminOnly", policy =>
		policy.RequireClaim("isAdmin", "true"));
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure JSON serialization to use camelCase
builder.Services.ConfigureHttpJsonOptions(options =>
{
	options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
	// Allow enums to be deserialized from both integer values and string names
	options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddCors(options =>
{
	options.AddPolicy("ReactFrontend", policy =>
	{
		var allowedOrigins = new List<string> 
		{ 
			"http://localhost:3000", 
			"http://127.0.0.1:3000",
			"http://localhost:5173", 
			"http://127.0.0.1:5173",
			"http://localhost:5174",
			"http://127.0.0.1:5174" 
		};
        
		// Add production frontend URL from environment variable
		var productionUrl = builder.Configuration["FRONTEND_URL"];
		if (!string.IsNullOrEmpty(productionUrl))
		{
			allowedOrigins.Add(productionUrl);
			Console.WriteLine($"✓ CORS: Added production frontend URL: {productionUrl}");
		}
        
		policy.WithOrigins(allowedOrigins.ToArray())
			  .AllowAnyMethod()
			  .AllowAnyHeader()
			  .AllowCredentials();
	});
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
	app.UseSwagger();
	app.UseSwaggerUI();
}

// Enable CORS for local frontends before other middleware short-circuits
app.UseCors("ReactFrontend");

// Serve static files (uploaded images)
app.UseStaticFiles();

// Apply migrations at startup so schema stays current
using (var scope = app.Services.CreateScope())
{
	var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
	dbContext.Database.Migrate();
	Console.WriteLine("✓ Checked for pending migrations on startup");
}

// Global exception handler
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => "Databank connected!");
app.MapControllers();
app.Endpoint();

app.Run();
```

File: [src/Services/JwtTokenService.cs](src/Services/JwtTokenService.cs)

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Databank.Entities;
using Databank.Options;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Databank.Services;

public sealed class JwtTokenService(IOptions<JwtOptions> jwtOptions) : ITokenService
{
	private readonly JwtOptions _options = jwtOptions.Value;

	public TokenResult CreateToken(User user, Guid sessionId)
	{
		var expiration = DateTime.UtcNow.AddMinutes(_options.ExpiresInMinutes);
		var claims = new List<Claim>
		{
			new(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
			new(JwtRegisteredClaimNames.Sid, sessionId.ToString()),
			new(JwtRegisteredClaimNames.UniqueName, user.Username),
			new(JwtRegisteredClaimNames.Email, user.Email),
			new("isAdmin", user.IsAdmin.ToString().ToLowerInvariant())
		};
        
		// Add department IDs as separate claims
		foreach (var userDept in user.UserDepartments)
		{
			claims.Add(new Claim("departmentId", userDept.DepartmentId.ToString()));
		}

		var signingCredentials = new SigningCredentials(
			new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey)),
			SecurityAlgorithms.HmacSha256);

		var token = new JwtSecurityToken(
			issuer: _options.Issuer,
			audience: _options.Audience,
			claims: claims,
			expires: expiration,
			signingCredentials: signingCredentials);

		var handler = new JwtSecurityTokenHandler();
		var encoded = handler.WriteToken(token);

		return new TokenResult(encoded, expiration);
	}
}
```

File: [src/Entities/UserDepartment.cs](src/Entities/UserDepartment.cs)

```csharp
namespace Databank.Entities;

/// <summary>
/// Join table enabling users to have access to multiple departments
/// with potential role/scope distinctions per department
/// </summary>
public sealed class UserDepartment
{
	public const string DeanRoleScope = "Dean";

	public Guid UserId { get; set; }
	public int DepartmentId { get; set; }
    
	/// <summary>
	/// Optional field for future role scoping per department (e.g., "Editor", "Viewer")
	/// Currently unused but available for enhancement
	/// </summary>
	public string? RoleScope { get; set; }
    
	public DateTime CreatedAt { get; set; }
	public DateTime UpdatedAt { get; set; }

	// Navigation
	public User User { get; set; } = null!;
	public Department Department { get; set; } = null!;

	public bool IsDean => string.Equals(RoleScope, DeanRoleScope, StringComparison.Ordinal);
}
```

## Backend: BM25 Search (Full Code)

File: [src/Services/LuceneSearchService.cs](src/Services/LuceneSearchService.cs)

```csharp
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
```

File: [src/Features/Search/SearchController.cs](src/Features/Search/SearchController.cs)

```csharp
using Databank.Database;
using Databank.Features.Questions;
using Databank.Features.Topics;
using Databank.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Search;

[ApiController]
[Authorize]
[Route("api/search")]
public sealed class SearchController : ControllerBase
{
	private readonly ISearchService _searchService;
	private readonly AppDbContext _dbContext;
	public SearchController(
		ISearchService searchService,
		AppDbContext dbContext)
	{
		_searchService = searchService;
		_dbContext = dbContext;
	}

	[HttpGet]
	public async Task<IActionResult> Search(
		[FromQuery] string q,
		[FromQuery] int? courseId,
		[FromQuery] int? subjectId,
		[FromQuery] int? topicId,
		[FromQuery] string? subject,
		[FromQuery] string? topic,
		[FromQuery] string? bloomLevel,
		[FromQuery] string? questionType,
		CancellationToken ct)
	{
		if (string.IsNullOrWhiteSpace(q))
		{
			return BadRequest(new { message = "Query parameter 'q' is required." });
		}

		var filters = new SearchFilters(courseId, subjectId, topicId, subject, topic, bloomLevel, questionType);
		var response = await _searchService.SearchAsync(q, filters, ct);

		var currentUserId = QuestionPermissionResolver.GetCurrentUserId(User);
		if (!currentUserId.HasValue || response.Results.Count == 0)
		{
			return Ok(response);
		}

		var questionIds = response.Results.Select(r => r.Id).Distinct().ToList();
		var topicByQuestionId = await _dbContext.Questions
			.AsNoTracking()
			.Where(q => questionIds.Contains(q.Id))
			.Select(q => new
			{
				q.Id,
				q.TopicId
			})
			.ToDictionaryAsync(x => x.Id, x => x.TopicId, ct);

		var topicIds = topicByQuestionId.Values.Distinct().ToList();
		if (topicIds.Count == 0)
		{
			return Ok(response with
			{
				Results = new List<SearchResultItem>(),
				TotalCount = 0,
				SimilarCount = 0
			});
		}

		var accessibleTopicIds = await TopicPermissionResolver.ResolveViewAccessForUserAsync(
			_dbContext,
			currentUserId.Value,
			topicIds,
			ct);

		if (accessibleTopicIds.Count == 0)
		{
			return Ok(response with
			{
				Results = new List<SearchResultItem>(),
				TotalCount = 0,
				SimilarCount = 0
			});
		}

		var topicScopedResults = response.Results
			.Where(item =>
				topicByQuestionId.TryGetValue(item.Id, out var topicId) &&
				accessibleTopicIds.Contains(topicId))
			.ToList();

		if (topicScopedResults.Count == 0)
		{
			return Ok(response with
			{
				Results = new List<SearchResultItem>(),
				TotalCount = 0,
				SimilarCount = 0
			});
		}

		var permissionsByQuestionId = await QuestionPermissionResolver.ResolvePermissionsForUserAsync(
			_dbContext,
			currentUserId.Value,
			topicScopedResults.Select(r => r.Id).ToList(),
			ct);

		var permissionAwareResults = topicScopedResults
			.Select(item =>
			{
				permissionsByQuestionId.TryGetValue(item.Id, out var permission);
				var canEdit = permission.CanEdit;
				var canDelete = permission.CanDelete;

				return item with
				{
					CanEdit = canEdit,
					CanDelete = canDelete
				};
			})
			.ToList();

		var similarThreshold = permissionAwareResults.Count > 0
			? permissionAwareResults.Average(r => r.Score)
			: 0;
		var similarCount = permissionAwareResults.Count(r => r.Score >= similarThreshold && r.Score > 0);

		return Ok(response with
		{
			Results = permissionAwareResults,
			TotalCount = permissionAwareResults.Count,
			SimilarCount = similarCount
		});
	}
}
```

## Backend: Image Upload and Rendering (Full Code)

File: [src/Entities/QuestionImage.cs](src/Entities/QuestionImage.cs)

```csharp
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
	/// Base64 data URL for the image (e.g., "data:image/png;base64,...")
	/// </summary>
	public string? ImageData { get; set; }
    
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
```

File: [src/Features/QuestionImages/Upload/UploadQuestionImageEndpoint.cs](src/Features/QuestionImages/Upload/UploadQuestionImageEndpoint.cs)

```csharp
using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.QuestionImages.Upload;

public sealed class UploadQuestionImageEndpoint : IEndpoint
{
	public void Endpoint(IEndpointRouteBuilder app)
	{
		app.MapPost("/api/questions/{questionId}/image", HandleAsync)
			.RequireAuthorization()
			.DisableAntiforgery()
			.WithTags("QuestionImages");
	}

	private async Task<IResult> HandleAsync(
		[FromRoute] int questionId,
		[FromForm] IFormFile file,
		[FromForm] int widthPercentage,
		[FromForm] string alignment,
		[FromServices] AppDbContext db,
		[FromServices] IFileStorageService fileStorage,
		[FromServices] ILoggingService loggingService,
		[FromServices] ILogger<UploadQuestionImageEndpoint> logger,
		HttpContext httpContext)
	{
		// Validate question exists
		var question = await db.Questions
			.Include(q => q.QuestionImage)
			.FirstOrDefaultAsync(q => q.Id == questionId);

		if (question == null)
		{
			return Results.NotFound(new { message = "Question not found" });
		}

		// Validate file
		if (file == null || file.Length == 0)
		{
			return Results.BadRequest(new { message = "No file uploaded" });
		}

		// Validate file type (only images)
		var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
		var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
		if (!allowedExtensions.Contains(fileExtension))
		{
			return Results.BadRequest(new { message = "Invalid file type. Only images are allowed." });
		}

		// Validate file size (max 5MB)
		if (file.Length > 5 * 1024 * 1024)
		{
			return Results.BadRequest(new { message = "File size exceeds 5MB limit" });
		}

		// Validate width percentage
		if (widthPercentage < 10 || widthPercentage > 100)
		{
			return Results.BadRequest(new { message = "Width percentage must be between 10 and 100" });
		}

		// Validate alignment
		var validAlignments = new[] { "Left", "Center", "Right" };
		if (!validAlignments.Contains(alignment))
		{
			return Results.BadRequest(new { message = "Alignment must be Left, Center, or Right" });
		}

		try
		{
			// Delete old image if exists
			if (question.QuestionImage != null)
			{
				await fileStorage.DeleteFileAsync(question.QuestionImage.ImagePath);
				db.QuestionImages.Remove(question.QuestionImage);
			}

			// Save new file
			await using var stream = file.OpenReadStream();
			var imagePath = await fileStorage.SaveFileAsync(stream, file.FileName, "questions");

			await using var dataStream = file.OpenReadStream();
			await using var memoryStream = new MemoryStream();
			await dataStream.CopyToAsync(memoryStream);
			var base64 = Convert.ToBase64String(memoryStream.ToArray());
			var contentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType;
			var imageData = $"data:{contentType};base64,{base64}";

			// Create new question image record
			var questionImage = new QuestionImage
			{
				QuestionId = questionId,
				ImagePath = imagePath,
				ImageData = imageData,
				WidthPercentage = widthPercentage,
				Alignment = alignment,
				CreatedAt = DateTime.UtcNow,
				UpdatedAt = DateTime.UtcNow
			};

			db.QuestionImages.Add(questionImage);
			await db.SaveChangesAsync();

			logger.LogInformation("Image uploaded for question {QuestionId}: {ImagePath}", questionId, imagePath);

			// Log activity
			var userId = httpContext.User.FindFirst("sub")?.Value ?? httpContext.User.FindFirst("userId")?.Value;
			await loggingService.LogActivityAsync(userId, "Questions", "Image Uploaded", "Question", questionId,
				$"Uploaded image: {file.FileName} (Width: {widthPercentage}%, Alignment: {alignment})");

			return Results.Ok(questionImage.ToResponse());
		}
		catch (Exception ex)
		{
			logger.LogError(ex, "Failed to upload image for question {QuestionId}", questionId);
			return Results.Problem("Failed to upload image. Please try again.");
		}
	}
}
```

File: [src/Features/QuestionImages/Get/GetQuestionImageEndpoint.cs](src/Features/QuestionImages/Get/GetQuestionImageEndpoint.cs)

```csharp
using Databank.Abstract;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.QuestionImages.Get;

public sealed class GetQuestionImageEndpoint : IEndpoint
{
	public void Endpoint(IEndpointRouteBuilder app)
	{
		app.MapGet("/api/questions/{questionId}/image", HandleAsync)
			.RequireAuthorization()
			.WithTags("QuestionImages");
	}

	private async Task<IResult> HandleAsync(
		int questionId,
		AppDbContext db)
	{
		var questionImage = await db.QuestionImages
			.FirstOrDefaultAsync(qi => qi.QuestionId == questionId);

		if (questionImage == null)
		{
			return Results.NotFound(new { message = "No image found for this question" });
		}

		return Results.Ok(questionImage.ToResponse());
	}
}
```

## Backend: Print Request Workflow (Full Code)

File: [src/Entities/PrintRequest.cs](src/Entities/PrintRequest.cs)

```csharp
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
	public bool IsDraftRequest { get; set; }
	public string? ExamSnapshotJson { get; set; }
}

public enum PrintRequestStatus
{
	Pending = 0,
	ReadyForPickup = 1,
	Completed = 2,
	Rejected = 3
}
```

File: [src/Configuration/PrintRequestConfiguration.cs](src/Configuration/PrintRequestConfiguration.cs)

```csharp
using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Databank.Configuration;

public sealed class PrintRequestConfiguration : IEntityTypeConfiguration<PrintRequest>
{
	public void Configure(EntityTypeBuilder<PrintRequest> builder)
	{
		builder.ToTable("PrintRequests");

		builder.HasKey(x => x.PrintRequestId);

		builder.Property(x => x.PrintRequestId)
			.HasDefaultValueSql("gen_random_uuid()")
			.ValueGeneratedOnAdd();

		builder.Property(x => x.Status)
			.HasConversion<string>()
			.HasMaxLength(50)
			.IsRequired();

		builder.Property(x => x.CreatedAt)
			.HasDefaultValueSql("CURRENT_TIMESTAMP");

		builder.Property(x => x.ProcessedAt)
			.IsRequired(false);

		builder.Property(x => x.Notes)
			.HasMaxLength(1000);

		builder.Property(x => x.CopiesRequested)
			.HasDefaultValue(1);

		builder.Property(x => x.IsDraftRequest)
			.HasDefaultValue(false);

		builder.Property(x => x.ExamSnapshotJson)
			.HasColumnType("text")
			.IsRequired(false);

		// Relationships
		builder.HasOne(x => x.Test)
			.WithMany()
			.HasForeignKey(x => x.TestId)
			.OnDelete(DeleteBehavior.Cascade);

		builder.HasOne(x => x.RequestedBy)
			.WithMany()
			.HasForeignKey(x => x.RequestedByUserId)
			.OnDelete(DeleteBehavior.Restrict);

		builder.HasOne(x => x.ProcessedBy)
			.WithMany()
			.HasForeignKey(x => x.ProcessedByUserId)
			.OnDelete(DeleteBehavior.Restrict)
			.IsRequired(false);

		builder.HasOne(x => x.Department)
			.WithMany()
			.HasForeignKey(x => x.DepartmentId)
			.OnDelete(DeleteBehavior.Restrict);

		// Indexes
		builder.HasIndex(x => x.Status);
		builder.HasIndex(x => x.DepartmentId);
		builder.HasIndex(x => x.RequestedByUserId);
		builder.HasIndex(x => x.CreatedAt);
	}
}
```

File: [src/Features/PrintRequests/Submit/SubmitPrintRequestEndpoint.cs](src/Features/PrintRequests/Submit/SubmitPrintRequestEndpoint.cs)

```csharp
using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Databank.Features.Tests;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace Databank.Features.PrintRequests.Submit;

public sealed class SubmitPrintRequestEndpoint : IEndpoint
{
	public void Endpoint(IEndpointRouteBuilder app)
	{
		app.MapPost("/api/printrequests", async (
				CreatePrintRequestRequest request,
				HttpContext httpContext,
				AppDbContext db,
				CancellationToken ct) =>
		{
			var userIdClaim = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
				?? httpContext.User.FindFirst("sub")?.Value
				?? httpContext.User.FindFirst("userId")?.Value;

			if (!Guid.TryParse(userIdClaim, out var userId))
			{
				return Results.BadRequest(new { error = "Unable to determine the current user. Please sign in again." });
			}

			if (request.CopiesRequested <= 0)
			{
				return Results.BadRequest(new { error = "Copies requested must be at least 1." });
			}

			Test? test;
			var isDraftRequest = request.IsDraft || request.ExamData is not null;

			if (request.ExamData is not null)
			{
				var examData = request.ExamData;

				if (examData.Questions is null || examData.Questions.Count == 0)
				{
					return Results.BadRequest(new { error = "Exam data must include at least one question." });
				}

				test = await UpsertDraftTestAsync(examData, userId, db, ct);
				if (test is null)
				{
					return Results.BadRequest(new { error = "Unable to build draft exam from provided data." });
				}
			}
			else
			{
				if (!request.TestId.HasValue)
				{
					return Results.BadRequest(new { error = "Either testId or examData must be provided." });
				}

				test = await db.Tests
					.Include(t => t.Subject)
					.Include(t => t.Course)
					.Include(t => t.Department)
					.Include(t => t.TestQuestions)
						.ThenInclude(tq => tq.Question)
							.ThenInclude(q => q.Options)
					.Include(t => t.TestQuestions)
						.ThenInclude(tq => tq.Question)
							.ThenInclude(q => q.QuestionImage)
					.FirstOrDefaultAsync(t => t.Id == request.TestId.Value, ct);

				if (test is null)
				{
					return Results.NotFound(new { error = "Test not found" });
				}
			}

			if (!test.DepartmentId.HasValue)
			{
				return Results.BadRequest(new { error = "Test must be associated with a department" });
			}

			var existingRequest = await db.PrintRequests
				.FirstOrDefaultAsync(pr =>
					pr.TestId == test.Id &&
					pr.RequestedByUserId == userId &&
					pr.Status == PrintRequestStatus.Pending,
					ct);

			if (existingRequest is not null)
			{
				existingRequest.Notes = request.Notes;
				existingRequest.CopiesRequested = request.CopiesRequested;
				existingRequest.IsDraftRequest = isDraftRequest;
				existingRequest.ExamSnapshotJson = BuildExamSnapshotJson(test);

				await db.SaveChangesAsync(ct);

				return Results.Ok(new
				{
					printRequestId = existingRequest.PrintRequestId,
					status = "Pending",
					testId = test.Id,
					wasUpdated = true,
					isDraft = existingRequest.IsDraftRequest
				});
			}

			var printRequest = new PrintRequest
			{
				PrintRequestId = Guid.NewGuid(),
				TestId = test.Id,
				RequestedByUserId = userId,
				DepartmentId = test.DepartmentId.Value,
				Status = PrintRequestStatus.Pending,
				CreatedAt = DateTime.UtcNow,
				Notes = request.Notes,
				CopiesRequested = request.CopiesRequested,
				IsDraftRequest = isDraftRequest,
				ExamSnapshotJson = BuildExamSnapshotJson(test)
			};

			db.PrintRequests.Add(printRequest);
			await db.SaveChangesAsync(ct);

			return Results.Created(
				$"/api/printrequests/{printRequest.PrintRequestId}",
				new
				{
					printRequestId = printRequest.PrintRequestId,
					status = "Pending",
					testId = test.Id,
					isDraft = printRequest.IsDraftRequest
				}
			);
		})
		.RequireAuthorization()
		.WithTags("PrintRequests");
	}

	private static async Task<Test?> UpsertDraftTestAsync(
		PrintRequestExamDraftDto examData,
		Guid userId,
		AppDbContext db,
		CancellationToken ct)
	{
		if (examData.DepartmentId <= 0 || examData.CourseId <= 0 || examData.SubjectId <= 0)
		{
			return null;
		}

		var orderedQuestions = examData.Questions
			.OrderBy(q => q.DisplayOrder)
			.ToList();

		var questionIds = orderedQuestions
			.Select(q => q.QuestionId)
			.Distinct()
			.ToList();

		var questions = await db.Questions
			.Include(q => q.Options)
			.Include(q => q.QuestionImage)
			.Include(q => q.Topic)
			.Where(q => questionIds.Contains(q.Id))
			.ToListAsync(ct);

		if (questions.Count != questionIds.Count)
		{
			return null;
		}

		var invalidQuestion = questions.FirstOrDefault(q => q.Topic.SubjectId != examData.SubjectId);
		if (invalidQuestion is not null)
		{
			return null;
		}

		var signature = TestSignatureHelper.BuildSignature(
			orderedQuestions.Select(q => (q.QuestionId, q.DisplayOrder)));

		var draftSetLabel = "Draft";
		var draftTest = await db.Tests
			.Include(t => t.TestQuestions)
			.FirstOrDefaultAsync(t =>
				t.CreatedByUserId == userId &&
				t.SubjectId == examData.SubjectId &&
				t.CourseId == examData.CourseId &&
				t.DepartmentId == examData.DepartmentId &&
				t.ExamType == examData.ExamType &&
				t.Semester == examData.Semester &&
				t.SchoolYear == examData.SchoolYear &&
				t.SetLabel == draftSetLabel,
				ct);

		if (draftTest is null)
		{
			draftTest = new Test
			{
				SubjectId = examData.SubjectId,
				CourseId = examData.CourseId,
				DepartmentId = examData.DepartmentId,
				CreatedByUserId = userId,
				Title = string.IsNullOrWhiteSpace(examData.Title) ? "Draft Exam" : examData.Title.Trim(),
				Description = examData.Description,
				DurationMinutes = examData.DurationMinutes > 0 ? examData.DurationMinutes : 60,
				TotalQuestions = orderedQuestions.Count,
				TotalPoints = examData.TotalPoints > 0 ? examData.TotalPoints : orderedQuestions.Count,
				ExamType = string.IsNullOrWhiteSpace(examData.ExamType) ? "Custom" : examData.ExamType,
				Semester = examData.Semester ?? string.Empty,
				SchoolYear = examData.SchoolYear ?? string.Empty,
				IsExamLeftAligned = examData.IsExamLeftAligned,
				IsQuestionSeparatorEnabled = examData.IsQuestionSeparatorEnabled,
				SetLabel = draftSetLabel,
				QuestionSignature = signature,
				SpecificationSnapshot = examData.SpecificationSnapshot,
				GenerationNotes = examData.GenerationNotes,
				IsDraft = true,
				IsPublished = false,
				AvailableFrom = DateTime.UtcNow,
				CreatedAt = DateTime.UtcNow,
				UpdatedAt = DateTime.UtcNow
			};

			await db.Tests.AddAsync(draftTest, ct);
			await db.SaveChangesAsync(ct);
		}
		else
		{
			draftTest.Title = string.IsNullOrWhiteSpace(examData.Title) ? draftTest.Title : examData.Title.Trim();
			draftTest.Description = examData.Description;
			draftTest.DurationMinutes = examData.DurationMinutes > 0 ? examData.DurationMinutes : draftTest.DurationMinutes;
			draftTest.TotalQuestions = orderedQuestions.Count;
			draftTest.TotalPoints = examData.TotalPoints > 0 ? examData.TotalPoints : orderedQuestions.Count;
			draftTest.ExamType = string.IsNullOrWhiteSpace(examData.ExamType) ? draftTest.ExamType : examData.ExamType;
			draftTest.Semester = examData.Semester ?? string.Empty;
			draftTest.SchoolYear = examData.SchoolYear ?? string.Empty;
			draftTest.IsExamLeftAligned = examData.IsExamLeftAligned;
			draftTest.IsQuestionSeparatorEnabled = examData.IsQuestionSeparatorEnabled;
			draftTest.QuestionSignature = signature;
			draftTest.SpecificationSnapshot = examData.SpecificationSnapshot;
			draftTest.GenerationNotes = examData.GenerationNotes;
			draftTest.IsDraft = true;
			draftTest.UpdatedAt = DateTime.UtcNow;

			if (draftTest.TestQuestions.Count > 0)
			{
				db.TestQuestions.RemoveRange(draftTest.TestQuestions);
				await db.SaveChangesAsync(ct);
			}
		}

		var questionLookup = questions.ToDictionary(q => q.Id);
		var testQuestions = new List<TestQuestion>(orderedQuestions.Count);
		foreach (var q in orderedQuestions)
		{
			if (!questionLookup.TryGetValue(q.QuestionId, out var questionEntity))
			{
				return null;
			}

			var optionSnapshot = BuildOptionSnapshot(questionEntity, q);
			testQuestions.Add(new TestQuestion
			{
				TestId = draftTest.Id,
				QuestionId = q.QuestionId,
				DisplayOrder = q.DisplayOrder,
				OptionSnapshotJson = optionSnapshot
			});
		}

		await db.TestQuestions.AddRangeAsync(testQuestions, ct);
		await db.SaveChangesAsync(ct);

		return await db.Tests
			.Include(t => t.Subject)
			.Include(t => t.Course)
			.Include(t => t.Department)
			.Include(t => t.TestQuestions)
				.ThenInclude(tq => tq.Question)
					.ThenInclude(q => q.Options)
			.Include(t => t.TestQuestions)
				.ThenInclude(tq => tq.Question)
					.ThenInclude(q => q.QuestionImage)
			.FirstOrDefaultAsync(t => t.Id == draftTest.Id, ct);
	}

	private static string BuildOptionSnapshot(Question question, PrintRequestExamQuestionDto dto)
	{
		var options = question.Options?.OrderBy(o => o.DisplayOrder).ToList() ?? new List<Option>();
		if (options.Count == 0)
		{
			return "[]";
		}

		if (dto.Options is null || dto.Options.Count == 0)
		{
			return JsonSerializer.Serialize(options.Select(o => new OptionSnapshotDto(o.Id, o.DisplayOrder, o.IsCorrect)));
		}

		var lookup = options.ToDictionary(o => o.Id);
		var ordered = new List<OptionSnapshotDto>();

		foreach (var optionDto in dto.Options.OrderBy(o => o.DisplayOrder))
		{
			if (lookup.TryGetValue(optionDto.OptionId, out var sourceOption))
			{
				var isCorrect = optionDto.IsCorrect ?? sourceOption.IsCorrect;
				ordered.Add(new OptionSnapshotDto(optionDto.OptionId, optionDto.DisplayOrder, isCorrect));
			}
		}

		if (ordered.Count == 0)
		{
			return JsonSerializer.Serialize(options.Select(o => new OptionSnapshotDto(o.Id, o.DisplayOrder, o.IsCorrect)));
		}

		return JsonSerializer.Serialize(ordered);
	}

	private static string BuildExamSnapshotJson(Test test)
	{
		var snapshot = new
		{
			testInfo = new
			{
				id = test.Id,
				title = test.Title,
				description = test.Description,
				subject = test.Subject?.Name,
				course = test.Course?.Name,
				department = test.Department?.Name,
				examType = test.ExamType,
				semester = test.Semester,
				schoolYear = test.SchoolYear,
				setLabel = test.SetLabel,
				durationMinutes = test.DurationMinutes,
				totalQuestions = test.TotalQuestions,
				totalPoints = test.TotalPoints,
				isExamLeftAligned = test.IsExamLeftAligned,
				isQuestionSeparatorEnabled = test.IsQuestionSeparatorEnabled,
				specificationSnapshot = test.SpecificationSnapshot,
				generationNotes = test.GenerationNotes
			},
			questions = test.TestQuestions
				.OrderBy(tq => tq.DisplayOrder)
				.Select(tq => new
				{
					displayOrder = tq.DisplayOrder,
					questionId = tq.QuestionId,
					questionText = tq.Question.Content,
					topic = tq.Question.Topic?.Title,
					bloomLevel = tq.Question.BloomLevel,
					questionType = tq.Question.QuestionType,
					points = tq.Question.Points,
					image = tq.Question.QuestionImage == null
						? null
						: new
						{
							imagePath = tq.Question.QuestionImage.ImagePath,
							imageData = tq.Question.QuestionImage.ImageData,
							widthPercentage = tq.Question.QuestionImage.WidthPercentage,
							alignment = tq.Question.QuestionImage.Alignment
						},
					options = OrderOptionsBySnapshot(tq)
						.Select((o, idx) => new
						{
							optionId = o.Option.Id,
							optionText = o.Option.Content,
							isCorrect = o.IsCorrect,
							displayOrder = idx
						})
						.ToList()
				})
				.ToList()
		};

		return JsonSerializer.Serialize(snapshot);
	}

	private static IReadOnlyList<OptionSnapshotView> OrderOptionsBySnapshot(TestQuestion testQuestion)
	{
		var options = testQuestion.Question.Options?.ToList() ?? new List<Option>();
		if (options.Count == 0)
		{
			return new List<OptionSnapshotView>();
		}

		if (string.IsNullOrWhiteSpace(testQuestion.OptionSnapshotJson))
		{
			return options
				.OrderBy(o => o.DisplayOrder)
				.Select(o => new OptionSnapshotView(o, o.IsCorrect))
				.ToList();
		}

		try
		{
			var snapshot = JsonSerializer.Deserialize<List<OptionSnapshotDto>>(testQuestion.OptionSnapshotJson);
			if (snapshot is null || snapshot.Count == 0)
			{
				return options
					.OrderBy(o => o.DisplayOrder)
					.Select(o => new OptionSnapshotView(o, o.IsCorrect))
					.ToList();
			}

			var lookup = options.ToDictionary(o => o.Id);
			var ordered = new List<OptionSnapshotView>(options.Count);

			foreach (var entry in snapshot.OrderBy(s => s.DisplayOrder))
			{
				if (lookup.TryGetValue(entry.OptionId, out var option))
				{
					ordered.Add(new OptionSnapshotView(option, entry.IsCorrect ?? option.IsCorrect));
				}
			}

			if (ordered.Count < options.Count)
			{
				var orderedIds = ordered.Select(o => o.Option.Id).ToHashSet();
				var remaining = options
					.Where(o => !orderedIds.Contains(o.Id))
					.OrderBy(o => o.DisplayOrder);
				ordered.AddRange(remaining.Select(o => new OptionSnapshotView(o, o.IsCorrect)));
			}

			return ordered;
		}
		catch (JsonException)
		{
			return options
				.OrderBy(o => o.DisplayOrder)
				.Select(o => new OptionSnapshotView(o, o.IsCorrect))
				.ToList();
		}
	}

	private sealed record OptionSnapshotDto(int OptionId, int DisplayOrder, bool? IsCorrect = null);
	private sealed record OptionSnapshotView(Option Option, bool IsCorrect);
}
```

File: [src/Features/PrintRequests/GetPending/GetPendingPrintRequestsEndpoint.cs](src/Features/PrintRequests/GetPending/GetPendingPrintRequestsEndpoint.cs)

```csharp
using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.PrintRequests.GetPending;

public sealed class GetPendingPrintRequestsEndpoint : IEndpoint
{
	public void Endpoint(IEndpointRouteBuilder app)
	{
		app.MapGet("/api/printrequests/pending", async (
				AppDbContext db,
				CancellationToken ct) =>
		{
			var requests = await db.PrintRequests
				.Include(pr => pr.Test)
				.Include(pr => pr.RequestedBy)
				.Include(pr => pr.Department)
				.Where(pr => pr.Status == PrintRequestStatus.Pending)
				.OrderBy(pr => pr.CreatedAt)
				.Select(pr => new PrintRequestResponse(
					pr.PrintRequestId,
					pr.TestId,
					pr.Test.Title,
					pr.DepartmentId,
					pr.Department.Name,
					pr.RequestedByUserId,
					pr.RequestedBy.FirstName + " " + pr.RequestedBy.LastName,
					pr.Status.ToString(),
					pr.CreatedAt,
					pr.ProcessedAt,
					pr.ProcessedByUserId,
					null,
					pr.Notes,
					pr.CopiesRequested,
					pr.IsDraftRequest
				))
				.ToListAsync(ct);

			return Results.Ok(requests);
		})
		.RequireAuthorization("AdminOnly")
		.WithTags("PrintRequests");
	}
}
```

File: [src/Features/PrintRequests/UpdateStatus/UpdatePrintRequestStatusEndpoint.cs](src/Features/PrintRequests/UpdateStatus/UpdatePrintRequestStatusEndpoint.cs)

```csharp
using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Databank.Features.PrintRequests.UpdateStatus;

public sealed class UpdatePrintRequestStatusEndpoint : IEndpoint
{
	public void Endpoint(IEndpointRouteBuilder app)
	{
		app.MapPut("/api/printrequests/{id:guid}/status", async (
				Guid id,
				UpdateStatusRequest request,
				HttpContext httpContext,
				AppDbContext db,
				CancellationToken ct) =>
		{
			var userIdValue = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
				?? httpContext.User.FindFirst("sub")?.Value
				?? httpContext.User.FindFirst("userId")?.Value;

			if (!Guid.TryParse(userIdValue, out var actingUserId))
			{
				return Results.Unauthorized();
			}

			var isAdmin = httpContext.User.HasClaim("isAdmin", "true");

			var printRequest = await db.PrintRequests
				.FirstOrDefaultAsync(pr => pr.PrintRequestId == id, ct);

			if (printRequest is null)
			{
				return Results.NotFound(new { error = "Print request not found" });
			}

			// Parse and validate status
			if (!Enum.TryParse<PrintRequestStatus>(request.Status, out var newStatus))
			{
				return Results.BadRequest(new { error = "Invalid status. Valid values: Pending, ReadyForPickup, Completed, Rejected" });
			}

			if (!isAdmin)
			{
				if (printRequest.RequestedByUserId != actingUserId)
				{
					return Results.Forbid();
				}

				if (newStatus != PrintRequestStatus.Completed)
				{
					return Results.BadRequest(new { error = "Only completed status can be confirmed by the request owner." });
				}

				if (printRequest.Status != PrintRequestStatus.ReadyForPickup && printRequest.Status != PrintRequestStatus.Completed)
				{
					return Results.BadRequest(new { error = "This request is not ready for pickup yet." });
				}
			}
			else
			{
				printRequest.ProcessedByUserId = actingUserId;
			}

			printRequest.Status = newStatus;
			printRequest.ProcessedAt = DateTime.UtcNow;

			if (isAdmin && !string.IsNullOrWhiteSpace(request.Notes))
			{
				printRequest.Notes = request.Notes;
			}

			await db.SaveChangesAsync(ct);

			return Results.Ok(new 
			{ 
				printRequestId = printRequest.PrintRequestId,
				status = printRequest.Status.ToString(),
				processedAt = printRequest.ProcessedAt
			});
		})
		.RequireAuthorization()
		.WithTags("PrintRequests");
	}
}
```

## Backend: Action Logging / Audit Trail (Full Code)

File: [src/Entities/ActivityLog.cs](src/Entities/ActivityLog.cs)

```csharp
namespace Databank.Entities;

/// <summary>
/// Stores audit trail events generated across the system
/// Records system actions for accountability and auditing purposes
/// </summary>
public sealed class ActivityLog
{
	public long Id { get; set; }
	public int DepartmentId { get; set; }
	public Guid? UserId { get; set; }
	public string Category { get; set; } = "System";  // e.g., "Question", "Topic", "ExamGeneration"
	public string Action { get; set; } = string.Empty;  // e.g., "Created", "Updated", "Deleted"
	public string EntityType { get; set; } = string.Empty;  // e.g., "Question", "Test", "Topic"
	public int? EntityId { get; set; }
	public string? Details { get; set; }
	public string Severity { get; set; } = "Info";  // Info, Warning, Error, Critical
	public DateTime CreatedAt { get; set; }

	// Navigation
	public Department Department { get; set; } = null!;
	public User? User { get; set; }
}
```

File: [src/Features/ActivityLogs/Create/CreateActivityLogEndpoint.cs](src/Features/ActivityLogs/Create/CreateActivityLogEndpoint.cs)

```csharp
using System.Security.Claims;
using Databank.Abstract;
using Databank.Services;

namespace Databank.Features.ActivityLogs.Create;

public sealed class CreateActivityLogEndpoint : IEndpoint
{
	public void Endpoint(IEndpointRouteBuilder app)
	{
		app.MapPost("/api/activity-logs", async Task<IResult> (
				CreateActivityLogRequest request,
				ILoggingService loggingService,
				HttpContext httpContext,
				CancellationToken ct) =>
		{
			if (string.IsNullOrWhiteSpace(request.Category) || string.IsNullOrWhiteSpace(request.Action))
			{
				return TypedResults.BadRequest("Category and action are required.");
			}

			var userIdClaim = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
				?? httpContext.User.FindFirst("sub")?.Value
				?? httpContext.User.FindFirst("userId")?.Value;

			var category = request.Category.Trim();
			var action = request.Action.Trim();
			var details = string.IsNullOrWhiteSpace(request.Details) ? null : request.Details.Trim();
			var hasEntityContext = !string.IsNullOrWhiteSpace(request.EntityType) || request.EntityId.HasValue;

			if (hasEntityContext)
			{
				await loggingService.LogActivityAsync(
					userIdClaim,
					category,
					action,
					string.IsNullOrWhiteSpace(request.EntityType) ? "Activity" : request.EntityType.Trim(),
					request.EntityId,
					details);
			}
			else
			{
				await loggingService.LogActivityAsync(userIdClaim, category, action, details);
			}

			return TypedResults.Ok(new { success = true });
		}).RequireAuthorization();
	}
}

public sealed class CreateActivityLogRequest
{
	public string Category { get; set; } = string.Empty;
	public string Action { get; set; } = string.Empty;
	public string? EntityType { get; set; }
	public int? EntityId { get; set; }
	public string? Details { get; set; }
}
```

File: [src/Features/ActivityLogs/List/ListActivityLogsEndpoint.cs](src/Features/ActivityLogs/List/ListActivityLogsEndpoint.cs)

```csharp
using Databank.Abstract;
using Databank.Common;
using Databank.Database;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.ActivityLogs.List;

public sealed class ListActivityLogsEndpoint : IEndpoint
{
	public void Endpoint(IEndpointRouteBuilder app)
	{
		app.MapGet("/api/activity-logs", async Task<IResult> (
				int page,
				int pageSize,
				Guid? userId,
				int? departmentId,
				string? category,
				string? action,
				string? entityType,
				string? severity,
				DateTime? startDate,
				DateTime? endDate,
				AppDbContext dbContext,
				CancellationToken ct) =>
		{
			page = page > 0 ? page : 1;
			pageSize = pageSize > 0 ? pageSize : 20;

			var query = dbContext.ActivityLogs
				.Include(a => a.Department)
				.Include(a => a.User)
				.AsQueryable();

			// Apply filters
			if (userId.HasValue)
				query = query.Where(a => a.UserId == userId.Value);

			if (departmentId.HasValue)
				query = query.Where(a => a.DepartmentId == departmentId.Value);

			if (!string.IsNullOrWhiteSpace(category))
				query = query.Where(a => a.Category == category);

			if (!string.IsNullOrWhiteSpace(action))
				query = query.Where(a => a.Action == action);

			if (!string.IsNullOrWhiteSpace(entityType))
				query = query.Where(a => a.EntityType == entityType);

			if (!string.IsNullOrWhiteSpace(severity))
				query = query.Where(a => a.Severity == severity);

			if (startDate.HasValue)
				query = query.Where(a => a.CreatedAt >= startDate.Value);

			if (endDate.HasValue)
				query = query.Where(a => a.CreatedAt <= endDate.Value);

			// Get total count
			var totalCount = await query.CountAsync(ct);

			// Apply pagination
			var logs = await query
				.OrderByDescending(a => a.CreatedAt)
				.Skip((page - 1) * pageSize)
				.Take(pageSize)
				.Select(a => new ActivityLogDto
				{
					Id = a.Id,
					DepartmentId = a.DepartmentId,
					DepartmentName = a.Department.Name,
					UserId = a.UserId,
					UserName = a.User != null ? a.User.FirstName + " " + a.User.LastName : null,
					Category = a.Category,
					Action = a.Action,
					EntityType = a.EntityType,
					EntityId = a.EntityId,
					Details = a.Details,
					Severity = a.Severity,
					CreatedAt = a.CreatedAt
				})
				.ToListAsync(ct);

			var response = new PagedResponse<ActivityLogDto>
			{
				Items = logs,
				PageNumber = page,
				PageSize = pageSize,
				TotalCount = totalCount
			};

			return TypedResults.Ok(response);
		}).RequireAuthorization("AdminOnly");
	}
}
```

## Frontend: Strict 30/30/40 Rule and TOS (Key Excerpts)

File: [client/src/pages/TestGeneration.jsx](client/src/pages/TestGeneration.jsx)

```javascript
  // Calculate cognitive level distribution
  const calculateDistribution = React.useCallback(() => {
	const totalItems = parseInt(totalExamItems) || 0;
	if (totalItems <= 0) return { low: 0, middle: 0, high: 0 };

	const low = Math.floor(totalItems * 0.30);
	const middle = Math.floor(totalItems * 0.30);
	const high = totalItems - low - middle; // Ensure sum equals totalItems

	return { low, middle, high };
  }, [totalExamItems]);

  // Calculate specification in real-time as user enters data
  const calculateSpecification = React.useCallback(() => {
	const completedRows = topicRows.filter(row => row.topic && row.hours);
	if (completedRows.length === 0 || !totalExamItems) {
	  return null;
	}

	const totalItems = parseInt(totalExamItems);
	const totalHours = calculateTotalHours();
	if (totalHours === 0) return null;

	// Track all placements to ensure uniqueness
	const usedPlacements = new Set();

	// Generate all unique placements upfront
	const generateUniquePlacements = (count, total, used) => {
	  const placements = [];
	  while (placements.length < Math.min(count, total)) {
		const random = Math.floor(Math.random() * total) + 1;
		if (!used.has(random)) {
		  placements.push(random);
		  used.add(random);
		}
	  }
	  return placements.sort((a, b) => a - b);
	};

	// Calculate items per topic and select questions
	const specData = completedRows.map(row => {
	  const topicId = parseInt(row.topicId) || parseInt(row.topic);
	  const topicHours = parseFloat(row.hours);
	  const percentage = (topicHours / totalHours) * 100;
	  const itemsForTopic = Math.round(totalItems * (percentage / 100));

	  // Calculate distribution for this topic (30-30-40) or use user-edited values
	  const autoLowCount = Math.floor(itemsForTopic * 0.30);
	  const autoMiddleCount = Math.floor(itemsForTopic * 0.30);
	  const autoHighCount = itemsForTopic - autoLowCount - autoMiddleCount;

	  const lowCount = userEditedLowCount !== null ? userEditedLowCount : autoLowCount;
	  const middleCount = userEditedMiddleCount !== null ? userEditedMiddleCount : autoMiddleCount;
	  const highCount = userEditedHighCount !== null ? userEditedHighCount : autoHighCount;

	  // Generate random placements for this topic
	  const placementsLow = generateUniquePlacements(selectedLow.length, totalItems, usedPlacements);
	  const placementsMiddle = generateUniquePlacements(selectedMiddle.length, totalItems, usedPlacements);
	  const placementsHigh = generateUniquePlacements(selectedHigh.length, totalItems, usedPlacements);

	  return {
		topicId,
		topicName: row.topicName || `Topic ${topicId}`,
		topic: row.topic,
		hours: row.hours,
		percentage: percentage.toFixed(1),
		overrideKey,
		cognitive: {
		  low: { 
			count: lowCount, 
			placements: placementsLow,
			questions: selectedLow.map((q, idx) => ({
			  ...q,
			  placement: placementsLow[idx]
			}))
		  },
		  middle: { 
			count: middleCount, 
			placements: placementsMiddle,
			questions: selectedMiddle.map((q, idx) => ({
			  ...q,
			  placement: placementsMiddle[idx]
			}))
		  },
		  high: { 
			count: highCount, 
			placements: placementsHigh,
			questions: selectedHigh.map((q, idx) => ({
			  ...q,
			  placement: placementsHigh[idx]
			}))
		  }
		},
		total: lowCount + middleCount + highCount
	  };
	});

	const totals = {
	  low: specData.reduce((sum, spec) => sum + spec.cognitive.low.count, 0),
	  middle: specData.reduce((sum, spec) => sum + spec.cognitive.middle.count, 0),
	  high: specData.reduce((sum, spec) => sum + spec.cognitive.high.count, 0)
	};
	totals.grand = totals.low + totals.middle + totals.high;

	return { specs: specData, totals, totalItems, insufficientWarning, excessWarning };
  }, [topicRows, totalExamItems, questionsByTopic, specOverrides, calculateTotalHours]);
```

File: [client/src/components/AdminPrintQueue.jsx](client/src/components/AdminPrintQueue.jsx)

```javascript
  const printTableOfSpecifications = async () => {
	if (!masterSetData?.testInfo?.specificationSnapshot) {
	  setError('No Table of Specifications available for this exam');
	  return;
	}

	let parsedSpec;
	try {
	  parsedSpec = JSON.parse(masterSetData.testInfo.specificationSnapshot);
	} catch (err) {
	  setError('Failed to parse specification data');
	  return;
	}

	const totals = parsedSpec.totals || { low: 0, middle: 0, high: 0, grand: 0 };
	const filename = buildFilename('TOS');

	const tableRows = parsedSpec.specs.map((spec) => `
	  <tr>
		<td class="text-left"><strong>${spec.topicName}</strong></td>
		<td>${spec.hours || '—'}</td>
		<td>${spec.cognitive?.low?.count || 0}</td>
		<td class="text-left">${(spec.cognitive?.low?.placements || []).join(', ')}</td>
		<td>${spec.cognitive?.middle?.count || 0}</td>
		<td class="text-left">${(spec.cognitive?.middle?.placements || []).join(', ')}</td>
		<td>${spec.cognitive?.high?.count || 0}</td>
		<td class="text-left">${(spec.cognitive?.high?.placements || []).join(', ')}</td>
		<td><strong>${spec.total || 0}</strong></td>
		<td><strong>${spec.percentage || 0}%</strong></td>
	  </tr>
	`).join('');

	const html = `
	  <html>
		<head>
		  <title>Table of Specification</title>
		  <style>
			@page {
			  size: Legal portrait;
			  margin: 0.5in;
			}
			* { color: #000; }
			body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
			.header { text-align: center; margin-bottom: 30px; }
			.header h1 { font-size: 18px; margin: 5px 0; font-weight: bold; color: #000; }
			.header p { margin: 3px 0; color: #000; }
			.filename { font-weight: bold; margin: 10px 0; font-size: 13px; color: #000; }
			h2 { text-align: center; margin: 20px 0; color: #000; font-size: 16px; }
			table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
			table, th, td { border: 1px solid #000; }
			th { 
			  background-color: #fff; 
			  color: #000;
			  padding: 12px 6px; 
			  text-align: center; 
			  font-weight: bold; 
			  border: 1px solid #000;
			  font-size: 12px;
			}
			td { 
			  border: 1px solid #000; 
			  padding: 10px 6px; 
			  text-align: center;
			  color: #000;
			  font-size: 12px;
			}
			td.text-left { text-align: left; }
			.total-row { font-weight: bold; background-color: #fff; }
			@media print {
			  body { margin: 0; padding: 10px; }
			  table { page-break-inside: avoid; }
			}
		  </style>
		</head>
		<body>
		  <div class="header">
			<h1>University of Perpetual Help System Laguna</h1>
			<p>Test Data Bank System</p>
			<p>Biñan Campus</p>
			<div class="filename">${filename}</div>
			<p><strong style="color: #000;">${masterSetData.testInfo.course || 'Program'}</strong></p>
		  </div>
          
		  <h2>Table of Specification</h2>
          
		  <table border="1" cellpadding="5" cellspacing="0">
			<thead>
			  <tr>
				<th rowspan="2" style="width: 100px;">Topics</th>
				<th rowspan="2" style="width: 60px;">Hours</th>
				<th colspan="2" style="width: 140px;">Remembering & Understanding (30%)</th>
				<th colspan="2" style="width: 140px;">Applying & Analyzing (30%)</th>
				<th colspan="2" style="width: 140px;">Evaluating & Creating (40%)</th>
				<th rowspan="2" style="width: 70px;">Total Items</th>
				<th rowspan="2" style="width: 70px;">Percentage</th>
			  </tr>
			  <tr>
				<th style="width: 70px;">No. Questions</th>
				<th style="width: 70px;">Placement</th>
				<th style="width: 70px;">No. Questions</th>
				<th style="width: 70px;">Placement</th>
				<th style="width: 70px;">No. Questions</th>
				<th style="width: 70px;">Placement</th>
			  </tr>
			</thead>
			<tbody>
			  ${tableRows}
			  <tr class="total-row">
				<td colspan="2"><strong>TOTAL</strong></td>
				<td><strong>${totals.low || 0}</strong></td>
				<td><strong>All</strong></td>
				<td><strong>${totals.middle || 0}</strong></td>
				<td><strong>All</strong></td>
				<td><strong>${totals.high || 0}</strong></td>
				<td><strong>All</strong></td>
				<td><strong>${totals.grand || 0}</strong></td>
				<td><strong>100%</strong></td>
			  </tr>
			</tbody>
		  </table>
		</body>
	  </html>
	`;

	openPrintWindow(html);
  };
```

## Frontend: BM25 Search UI (Full Code)

File: [client/src/components/BM25QuestionSearch.jsx](client/src/components/BM25QuestionSearch.jsx)

```javascript
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Edit2, Trash2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { apiService } from '../services/api';

const stripHtml = (value) => (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const BM25QuestionSearch = ({
  isDarkMode,
  onEditQuestion,
  onRequestEdit,
  onDeleteQuestion,
  onSearchStateChange,
  resultsMountId,
  courseId,
  subjectId,
  topicId,
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState({ results: [], totalCount: 0, executionTime: 0, similarCount: 0 });
  const [page, setPage] = useState(1);

  const pageSize = 10;

  useEffect(() => {
	const timer = setTimeout(() => {
	  setDebouncedQuery(query.trim());
	}, 400);

	return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
	onSearchStateChange?.(Boolean(debouncedQuery));
  }, [debouncedQuery, onSearchStateChange]);

  useEffect(() => {
	let isDisposed = false;

	const runSearch = async () => {
	  if (!debouncedQuery) {
		setResponse({ results: [], totalCount: 0, executionTime: 0, similarCount: 0 });
		setError('');
		return;
	  }

	  try {
		setIsLoading(true);
		setError('');

		const result = await apiService.searchQuestions({
		  q: debouncedQuery,
		  courseId,
		  subjectId,
		  topicId,
		});

		if (!isDisposed) {
		  setResponse({
			results: Array.isArray(result?.results) ? result.results : [],
			totalCount: Number(result?.totalCount || 0),
			executionTime: Number(result?.executionTime || 0),
			similarCount: Number(result?.similarCount || 0),
		  });
		  setPage(1);
		}
	  } catch (err) {
		if (!isDisposed) {
		  setError('Failed to run ranked search. Please try again.');
		  setResponse({ results: [], totalCount: 0, executionTime: 0, similarCount: 0 });
		}
	  } finally {
		if (!isDisposed) {
		  setIsLoading(false);
		}
	  }
	};

	void runSearch();

	return () => {
	  isDisposed = true;
	};
  }, [debouncedQuery, courseId, subjectId, topicId]);

  const totalPages = Math.max(1, Math.ceil(response.results.length / pageSize));

  const pagedResults = useMemo(() => {
	const start = (page - 1) * pageSize;
	return response.results.slice(start, start + pageSize);
  }, [page, response.results]);

  const resultsContent = !debouncedQuery ? null : isLoading ? (
	<div className="bm25-empty-state">Searching...</div>
  ) : error ? (
	<div className="bm25-empty-state bm25-error">{error}</div>
  ) : (
	<>
	  <div className="bm25-result-summary">
		<span>About {response.totalCount} results ({response.executionTime} ms)</span>
		<span>{response.similarCount} highly similar questions</span>
	  </div>

	  {response.results.length === 0 ? (
		<div className="bm25-empty-state">No results found</div>
	  ) : (
		<>
		  <div className="bm25-result-list">
			{pagedResults.map((item, index) => {
			  const canEdit = item?.canEdit === true;
			  const canDelete = item?.canDelete === true;
			  const canRequestEdit = !canEdit && typeof onRequestEdit === 'function';

			  return (
			  <article key={item.id} className="bm25-result-item">
				<div className="bm25-result-heading">
				  <strong>#{(page - 1) * pageSize + index + 1}</strong>
				  <span>Score: {Number(item.score || 0).toFixed(3)}</span>
				</div>
				<p className="bm25-result-text">{stripHtml(item.content)}</p>
				<div className="bm25-result-meta">
				  <span>{item.subject || 'N/A'}</span>
				  <span>{item.topic || 'N/A'}</span>
				  <span>{item.bloomLevel}</span>
				  <span>{item.questionType}</span>
				</div>
				<div className="actions-cell">
				  {canEdit && (
					<button
					  type="button"
					  className="action-edit"
					  onClick={() => onEditQuestion?.(item)}
					  aria-label="Edit question"
					  title="Edit question"
					>
					  <Edit2 size={16} />
					</button>
				  )}
				  {canRequestEdit && (
					<button
					  type="button"
					  className="action-request"
					  onClick={() => onRequestEdit?.(item)}
					  aria-label="Request edit permission"
					  title="Request edit permission"
					>
					  <FileText size={16} />
					</button>
				  )}
				  {canDelete && (
					<button
					  type="button"
					  className="action-delete"
					  onClick={() => onDeleteQuestion?.(item.id)}
					  aria-label="Delete question"
					  title="Delete question"
					>
					  <Trash2 size={16} />
					</button>
				  )}
				</div>
			  </article>
			);})}
		  </div>

		  <div className="bm25-pagination">
			<button
			  type="button"
			  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
			  disabled={page <= 1}
			  aria-label="Previous page"
			  title="Previous page"
			>
			  <ChevronLeft size={16} />
			</button>
			<span>Page {page} of {totalPages}</span>
			<button
			  type="button"
			  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
			  disabled={page >= totalPages}
			  aria-label="Next page"
			  title="Next page"
			>
			  <ChevronRight size={16} />
			</button>
		  </div>
		</>
	  )}
	</>
  );

  const resultsMountNode = (typeof document !== 'undefined' && resultsMountId)
	? document.getElementById(resultsMountId)
	: null;

  return (
	<>
	  <div className={`bm25-search-panel ${isDarkMode ? 'dark' : ''}`}>
		<div className={`search-bar ${isDarkMode ? 'dark' : ''}`}>
		  <Search size={18} className="search-icon" />
		  <input
			type="text"
			value={query}
			onChange={(event) => setQuery(event.target.value)}
			placeholder="Search..."
		  />
		</div>
	  </div>
	  {resultsMountNode ? createPortal(resultsContent, resultsMountNode) : resultsContent}
	</>
  );
};

export default BM25QuestionSearch;
```

## Frontend: Image Rendering (Key Excerpts)

File: [client/src/pages/TestGeneration.jsx](client/src/pages/TestGeneration.jsx)

```javascript
  const resolveQuestionImageUrl = React.useCallback((imagePath) => {
	if (!imagePath) return '';
	const normalizedPath = String(imagePath).replace(/\\/g, '/').replace(/^\/?api\//i, '/');
	if (/^data:/i.test(normalizedPath)) return normalizedPath;
	if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;

	const normalizedBase = API_BASE_URL.replace(/\/$/, '');
	const mediaBase = normalizedBase.replace(/\/api$/i, '');
	const relativePath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;

	try {
	  return new URL(relativePath, `${mediaBase}/`).toString();
	} catch {
	  return `${mediaBase}/${relativePath}`;
	}
  }, []);

  const normalizeImagePresentationInHtml = React.useCallback((rawContent, imageMeta = null) => {
	const html = rawContent === undefined || rawContent === null ? '' : String(rawContent);
	if (!html) return '';

	const tempDiv = document.createElement('div');
	tempDiv.innerHTML = html;
	const images = tempDiv.querySelectorAll('img');
	if (images.length === 0) return html;

	const fallbackWidthRaw = Number(imageMeta?.widthPercentage ?? imageMeta?.WidthPercentage);
	const fallbackWidth = Number.isFinite(fallbackWidthRaw)
	  ? Math.max(10, Math.min(100, fallbackWidthRaw))
	  : 50;
	const fallbackAlignmentRaw = String(imageMeta?.alignment ?? imageMeta?.Alignment ?? 'Center');
	const fallbackAlignment = ['Left', 'Center', 'Right'].includes(fallbackAlignmentRaw)
	  ? fallbackAlignmentRaw
	  : 'Center';

	images.forEach((img) => {
	  const styleWidthMatch = /^([\d.]+)%$/.exec((img.style.width || '').trim());
	  const datasetWidth = Number(img.dataset?.width);
	  const styleWidth = styleWidthMatch ? Number(styleWidthMatch[1]) : NaN;
	  const width = Number.isFinite(datasetWidth)
		? datasetWidth
		: (Number.isFinite(styleWidth) ? styleWidth : fallbackWidth);
	  const clampedWidth = Math.max(10, Math.min(100, width));

	  const datasetAlignment = img.dataset?.alignment;
	  const alignmentCandidate = datasetAlignment || fallbackAlignment;
	  const alignment = ['Left', 'Center', 'Right'].includes(alignmentCandidate) ? alignmentCandidate : 'Center';

	  const marginByAlignment = alignment === 'Left'
		? { marginLeft: '0', marginRight: 'auto' }
		: alignment === 'Right'
		  ? { marginLeft: 'auto', marginRight: '0' }
		  : { marginLeft: 'auto', marginRight: 'auto' };

	  img.style.maxWidth = '100%';
	  img.style.width = `${clampedWidth}%`;
	  img.style.height = 'auto';
	  img.style.display = 'block';
	  img.style.marginTop = '8px';
	  img.style.marginBottom = '8px';
	  img.style.marginLeft = marginByAlignment.marginLeft;
	  img.style.marginRight = marginByAlignment.marginRight;
	  img.dataset.width = String(clampedWidth);
	  img.dataset.alignment = alignment;
	});

	return tempDiv.innerHTML;
  }, []);
```

## Excluded from Appendix (Build Artifacts)
- src/bin/ - Build outputs
- src/obj/ - Build intermediates
- src/search-index/ - Generated search index data
- src/src/ - Nested build artifacts or tooling output
