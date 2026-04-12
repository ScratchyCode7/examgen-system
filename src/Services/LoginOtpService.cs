using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using Databank.Entities;
using Databank.Options;
using Microsoft.Extensions.Options;

namespace Databank.Services;

public sealed class LoginOtpService(IOptions<EmailOtpOptions> options, IEmailSender emailSender) : ILoginOtpService
{
    private sealed class OtpChallenge
    {
        public required string Token { get; init; }
        public required Guid UserId { get; init; }
        public required string Email { get; init; }
        public required string DisplayName { get; set; }
        public required string CodeHash { get; set; }
        public required DateTime ExpiresAt { get; set; }
        public required DateTime LastSentAt { get; set; }
        public int Attempts { get; set; }
    }

    private readonly EmailOtpOptions _options = options.Value;
    private readonly ConcurrentDictionary<string, OtpChallenge> _challenges = new();

    public async Task<LoginOtpChallengeResult> CreateChallengeAsync(User user, CancellationToken ct = default)
    {
        CleanupExpiredChallenges();

        var token = Guid.NewGuid().ToString("N");
        var now = DateTime.UtcNow;
        var expiresAt = now.AddMinutes(Math.Max(1, _options.ExpiresInMinutes));
        var code = GenerateNumericCode(Math.Max(4, _options.CodeLength));

        var challenge = new OtpChallenge
        {
            Token = token,
            UserId = user.UserId,
            Email = user.Email,
            DisplayName = string.Join(' ', new[] { user.FirstName, user.LastName }.Where(x => !string.IsNullOrWhiteSpace(x))).Trim(),
            CodeHash = ComputeCodeHash(token, code),
            ExpiresAt = expiresAt,
            LastSentAt = now,
            Attempts = 0,
        };

        if (string.IsNullOrWhiteSpace(challenge.DisplayName))
        {
            challenge.DisplayName = user.Username;
        }

        _challenges[token] = challenge;

        try
        {
            await SendOtpEmailAsync(challenge.Email, challenge.DisplayName, code, expiresAt, ct);
        }
        catch (Exception ex)
        {
            _challenges.TryRemove(token, out _);
            return new LoginOtpChallengeResult(false, $"Failed to send OTP email: {BuildExceptionMessage(ex)}", null, null, null);
        }

        return new LoginOtpChallengeResult(true, null, token, expiresAt, MaskEmail(challenge.Email));
    }

    public Task<LoginOtpVerifyResult> VerifyAsync(string challengeToken, string code, CancellationToken ct = default)
    {
        CleanupExpiredChallenges();

        if (string.IsNullOrWhiteSpace(challengeToken) || string.IsNullOrWhiteSpace(code))
        {
            return Task.FromResult(new LoginOtpVerifyResult(false, "Invalid OTP request.", null));
        }

        if (!_challenges.TryGetValue(challengeToken, out var challenge))
        {
            return Task.FromResult(new LoginOtpVerifyResult(false, "OTP session expired or invalid. Please log in again.", null));
        }

        if (challenge.ExpiresAt <= DateTime.UtcNow)
        {
            _challenges.TryRemove(challengeToken, out _);
            return Task.FromResult(new LoginOtpVerifyResult(false, "OTP has expired. Please log in again.", null));
        }

        challenge.Attempts += 1;
        if (challenge.Attempts > Math.Max(1, _options.MaxAttempts))
        {
            _challenges.TryRemove(challengeToken, out _);
            return Task.FromResult(new LoginOtpVerifyResult(false, "Maximum OTP attempts reached. Please log in again.", null));
        }

        var codeHash = ComputeCodeHash(challengeToken, code.Trim());
        if (!string.Equals(codeHash, challenge.CodeHash, StringComparison.Ordinal))
        {
            return Task.FromResult(new LoginOtpVerifyResult(false, "Invalid OTP code.", null));
        }

        _challenges.TryRemove(challengeToken, out _);
        return Task.FromResult(new LoginOtpVerifyResult(true, null, challenge.UserId));
    }

    public async Task<LoginOtpResendResult> ResendAsync(string challengeToken, CancellationToken ct = default)
    {
        CleanupExpiredChallenges();

        if (string.IsNullOrWhiteSpace(challengeToken) || !_challenges.TryGetValue(challengeToken, out var challenge))
        {
            return new LoginOtpResendResult(false, "OTP session expired or invalid. Please log in again.", null, 0);
        }

        if (challenge.ExpiresAt <= DateTime.UtcNow)
        {
            _challenges.TryRemove(challengeToken, out _);
            return new LoginOtpResendResult(false, "OTP has expired. Please log in again.", null, 0);
        }

        var cooldownSeconds = Math.Max(1, _options.ResendCooldownSeconds);
        var secondsSinceLastSent = (int)(DateTime.UtcNow - challenge.LastSentAt).TotalSeconds;
        var retryAfter = cooldownSeconds - secondsSinceLastSent;
        if (retryAfter > 0)
        {
            return new LoginOtpResendResult(false, $"Please wait {retryAfter} seconds before requesting another OTP.", challenge.ExpiresAt, retryAfter);
        }

        var code = GenerateNumericCode(Math.Max(4, _options.CodeLength));
        challenge.CodeHash = ComputeCodeHash(challengeToken, code);
        challenge.LastSentAt = DateTime.UtcNow;
        challenge.ExpiresAt = DateTime.UtcNow.AddMinutes(Math.Max(1, _options.ExpiresInMinutes));
        challenge.Attempts = 0;

        try
        {
            await SendOtpEmailAsync(challenge.Email, challenge.DisplayName, code, challenge.ExpiresAt, ct);
        }
        catch (Exception ex)
        {
            return new LoginOtpResendResult(false, $"Failed to resend OTP email: {BuildExceptionMessage(ex)}", challenge.ExpiresAt, 0);
        }

        return new LoginOtpResendResult(true, null, challenge.ExpiresAt, 0);
    }

    private static string MaskEmail(string email)
    {
        var parts = email.Split('@', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 2 || parts[0].Length == 0)
        {
            return "your registered email";
        }

        var localPart = parts[0];
        var maskedLocal = localPart.Length <= 2
            ? string.Concat(localPart[0], "*")
            : string.Concat(localPart[0], new string('*', Math.Max(1, localPart.Length - 2)), localPart[^1]);
        return $"{maskedLocal}@{parts[1]}";
    }

    private async Task SendOtpEmailAsync(string toEmail, string displayName, string code, DateTime expiresAt, CancellationToken ct)
    {
        var subject = string.IsNullOrWhiteSpace(_options.Subject)
            ? "Your Databank verification code"
            : _options.Subject;

        var html = $@"
<div style=""font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;"">
  <p>Hello {System.Net.WebUtility.HtmlEncode(displayName)},</p>
  <p>Your Databank login verification code is:</p>
  <p style=""font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 16px 0;"">{code}</p>
  <p>This code expires at <strong>{expiresAt:yyyy-MM-dd HH:mm:ss} UTC</strong>.</p>
  <p>If you did not attempt to log in, please contact your administrator immediately.</p>
</div>";

        await emailSender.SendAsync(toEmail, subject, html, ct);
    }

    private static string GenerateNumericCode(int length)
    {
        var bytes = RandomNumberGenerator.GetBytes(length);
        var sb = new StringBuilder(length);
        foreach (var b in bytes)
        {
            sb.Append((b % 10).ToString());
        }
        return sb.ToString();
    }

    private static string ComputeCodeHash(string challengeToken, string code)
    {
        var bytes = Encoding.UTF8.GetBytes($"{challengeToken}:{code}");
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash);
    }

    private static string BuildExceptionMessage(Exception exception)
    {
        var messages = new List<string>();
        var cursor = exception;

        while (cursor is not null)
        {
            var message = cursor.Message?.Trim();
            if (!string.IsNullOrWhiteSpace(message))
            {
                messages.Add(message);
            }

            cursor = cursor.InnerException;
        }

        return messages.Count > 0
            ? string.Join(" | ", messages.Distinct(StringComparer.OrdinalIgnoreCase))
            : "Unknown email delivery error.";
    }

    private void CleanupExpiredChallenges()
    {
        var now = DateTime.UtcNow;
        foreach (var pair in _challenges)
        {
            if (pair.Value.ExpiresAt <= now)
            {
                _challenges.TryRemove(pair.Key, out _);
            }
        }
    }
}