using Databank.Entities;

namespace Databank.Services;

public interface ITokenService
{
    TokenResult CreateToken(User user);
}

public sealed record TokenResult(string AccessToken, DateTime ExpiresAt);

