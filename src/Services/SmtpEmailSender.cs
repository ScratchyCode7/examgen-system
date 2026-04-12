using System.Net;
using System.Net.Mail;
using System.Text;
using Databank.Options;
using Microsoft.Extensions.Options;

namespace Databank.Services;

public sealed class SmtpEmailSender(IOptions<EmailOtpOptions> options) : IEmailSender
{
    private readonly EmailOtpOptions _options = options.Value;

    public async Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.SmtpHost)
            || string.IsNullOrWhiteSpace(_options.FromEmail)
            || string.IsNullOrWhiteSpace(toEmail))
        {
            throw new InvalidOperationException("SMTP is not configured. Set EmailOtp SMTP and sender settings.");
        }

        using var message = new MailMessage
        {
            From = new MailAddress(_options.FromEmail, _options.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true,
            BodyEncoding = Encoding.UTF8,
            SubjectEncoding = Encoding.UTF8,
        };

        message.To.Add(new MailAddress(toEmail));

        using var smtpClient = new SmtpClient(_options.SmtpHost, _options.SmtpPort)
        {
            EnableSsl = _options.UseSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false,
            Credentials = new NetworkCredential(_options.SmtpUsername, _options.SmtpPassword),
        };

        ct.ThrowIfCancellationRequested();
        await smtpClient.SendMailAsync(message);
    }
}