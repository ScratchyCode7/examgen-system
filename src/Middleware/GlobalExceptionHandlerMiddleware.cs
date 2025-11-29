using System.Net;
using System.Text.Json;
using Databank.Services;

namespace Databank.Middleware;

public sealed class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public GlobalExceptionHandlerMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionHandlerMiddleware> logger,
        IServiceScopeFactory serviceScopeFactory)
    {
        _next = next;
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred: {Message}", ex.Message);
            
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        
        var response = exception switch
        {
            KeyNotFoundException => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.NotFound,
                Message = "Resource not found.",
                Error = "NotFound"
            },
            ArgumentException or ArgumentNullException => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.BadRequest,
                Message = exception.Message,
                Error = "BadRequest"
            },
            UnauthorizedAccessException => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.Unauthorized,
                Message = "Unauthorized access.",
                Error = "Unauthorized"
            },
            _ => new ErrorResponse
            {
                StatusCode = (int)HttpStatusCode.InternalServerError,
                Message = "An error occurred while processing your request.",
                Error = "InternalServerError"
            }
        };

        context.Response.StatusCode = response.StatusCode;

        // Log to ActivityLog using a scope
        try
        {
            using var scope = _serviceScopeFactory.CreateScope();
            var loggingService = scope.ServiceProvider.GetService<ILoggingService>();
            if (loggingService != null)
            {
                var userId = context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                await loggingService.LogErrorAsync(
                    userId,
                    "System",
                    $"Exception: {exception.GetType().Name}",
                    exception.Message,
                    "Error"
                );
            }
        }
        catch (Exception logEx)
        {
            _logger.LogWarning(logEx, "Failed to log exception to ActivityLog");
        }

        var jsonResponse = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(jsonResponse);
    }

    private sealed record ErrorResponse
    {
        public required int StatusCode { get; init; }
        public required string Message { get; init; }
        public required string Error { get; init; }
    }
}

