using System.Net;
using System.Text.Json;
using Databank.Services;

namespace Databank.Middleware;

public sealed class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;
    private readonly ILoggingService? _loggingService;

    public GlobalExceptionHandlerMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionHandlerMiddleware> logger,
        ILoggingService? loggingService = null)
    {
        _next = next;
        _logger = logger;
        _loggingService = loggingService;
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

        // Log to ActivityLog if service is available
        if (_loggingService != null)
        {
            var userId = context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            await _loggingService.LogErrorAsync(
                userId,
                "System",
                $"Exception: {exception.GetType().Name}",
                exception.Message,
                "Error"
            );
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

