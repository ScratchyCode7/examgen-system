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
