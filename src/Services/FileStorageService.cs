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
        _logger = logger;
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName, string folder)
    {
        try
        {
            // Sanitize filename
            var sanitizedFileName = Path.GetFileNameWithoutExtension(fileName);
            var extension = Path.GetExtension(fileName);
            var uniqueFileName = $"{sanitizedFileName}_{Guid.NewGuid():N}{extension}";

            // Create folder path
            var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", folder);
            Directory.CreateDirectory(uploadsFolder);

            // Full file path
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            // Save file
            await using var fileStreamOut = new FileStream(filePath, FileMode.Create);
            await fileStream.CopyToAsync(fileStreamOut);

            // Return relative path
            var relativePath = Path.Combine("uploads", folder, uniqueFileName).Replace("\\", "/");
            
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
            var fullPath = Path.Combine(_environment.WebRootPath, relativePath.Replace("/", "\\"));
            
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
            var fullPath = Path.Combine(_environment.WebRootPath, relativePath.Replace("/", "\\"));
            return Task.FromResult(File.Exists(fullPath));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check file existence: {RelativePath}", relativePath);
            return Task.FromResult(false);
        }
    }
}
