namespace Databank.Services;

/// <summary>
/// Service for handling file uploads and storage
/// </summary>
public interface IFileStorageService
{
    /// <summary>
    /// Save an uploaded file to the static folder
    /// </summary>
    /// <param name="fileStream">The file content stream</param>
    /// <param name="fileName">Original filename</param>
    /// <param name="folder">Subfolder name (e.g., "questions")</param>
    /// <returns>Relative path to the saved file</returns>
    Task<string> SaveFileAsync(Stream fileStream, string fileName, string folder);

    /// <summary>
    /// Delete a file from storage
    /// </summary>
    /// <param name="relativePath">Relative path to the file</param>
    /// <returns>True if deleted successfully</returns>
    Task<bool> DeleteFileAsync(string relativePath);

    /// <summary>
    /// Check if a file exists
    /// </summary>
    /// <param name="relativePath">Relative path to the file</param>
    /// <returns>True if file exists</returns>
    Task<bool> FileExistsAsync(string relativePath);
}
