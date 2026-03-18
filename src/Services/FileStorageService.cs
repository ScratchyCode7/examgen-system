using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Databank.Services;

/// <summary>
/// Implementation of file storage service that saves files to wwwroot/uploads
/// </summary>
public sealed class FileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<FileStorageService> _logger;

    public FileStorageService(IWebHostEnvironment environment, ILogger<FileStorageService> logger)
    {
        _environment = environment;
        if (string.IsNullOrWhiteSpace(_environment.WebRootPath))
        {
            _environment.WebRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }

        _logger = logger;
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName, string folder)
    {
        try
        {
            var webRoot = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var sanitizedFileName = SanitizeBaseFileName(Path.GetFileNameWithoutExtension(fileName));
            var extension = NormalizeExtension(Path.GetExtension(fileName));
            var uniqueFileName = $"{sanitizedFileName}_{Guid.NewGuid():N}{extension}";

            // Create folder path
            var uploadsFolder = Path.Combine(webRoot, "uploads", folder ?? string.Empty);
            Directory.CreateDirectory(uploadsFolder);

            // Full file path
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            // Save file
            await using var fileStreamOut = new FileStream(filePath, FileMode.Create);
            await fileStream.CopyToAsync(fileStreamOut);

            // Return relative path
            var safeFolder = folder ?? string.Empty;
            var relativePath = Path.Combine("uploads", safeFolder, uniqueFileName).Replace("\\", "/");
            
            _logger.LogInformation("File saved successfully: {RelativePath}", relativePath);
            return relativePath;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save file: {FileName}", fileName);
            throw;
        }
    }

    public Task<bool> DeleteFileAsync(string relativePath)
    {
        try
        {
            var fullPath = GetAbsolutePath(relativePath);
            if (string.IsNullOrEmpty(fullPath))
            {
                return Task.FromResult(false);
            }

            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
                _logger.LogInformation("File deleted successfully: {RelativePath}", relativePath);
                return Task.FromResult(true);
            }

            _logger.LogWarning("File not found for deletion: {RelativePath}", relativePath);
            return Task.FromResult(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file: {RelativePath}", relativePath);
            return Task.FromResult(false);
        }
    }

    public Task<bool> FileExistsAsync(string relativePath)
    {
        try
        {
            var fullPath = GetAbsolutePath(relativePath);
            if (string.IsNullOrEmpty(fullPath))
            {
                return Task.FromResult(false);
            }

            return Task.FromResult(File.Exists(fullPath));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check file existence: {RelativePath}", relativePath);
            return Task.FromResult(false);
        }
    }

    private static string NormalizeExtension(string extension)
    {
        if (string.IsNullOrWhiteSpace(extension))
        {
            return string.Empty;
        }

        var cleaned = extension.Trim();
        return cleaned.StartsWith('.') ? cleaned.ToLowerInvariant() : $".{cleaned.ToLowerInvariant()}";
    }

    private static string SanitizeBaseFileName(string? fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return "upload";
        }

        var normalized = fileName.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);

        foreach (var c in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(c);
            if (category == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsLetterOrDigit(c))
            {
                builder.Append(char.ToLowerInvariant(c));
            }
            else if (c == '-' || c == '_')
            {
                builder.Append(c);
            }
            else
            {
                builder.Append('-');
            }
        }

        var sanitized = Regex.Replace(builder.ToString(), "-+", "-").Trim('-');
        return string.IsNullOrEmpty(sanitized) ? "upload" : sanitized;
    }

    private string GetAbsolutePath(string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath) || string.IsNullOrWhiteSpace(_environment.WebRootPath))
        {
            return string.Empty;
        }

        var normalized = relativePath
            .Replace("\\", "/")
            .TrimStart('/');

        var pathSegments = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var combinedPath = _environment.WebRootPath;
        foreach (var segment in pathSegments)
        {
            combinedPath = Path.Combine(combinedPath, segment);
        }

        return combinedPath;
    }
}
