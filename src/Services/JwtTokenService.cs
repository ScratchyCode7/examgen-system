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

    public TokenResult CreateToken(User user)
    {
        var expiration = DateTime.UtcNow.AddMinutes(_options.ExpiresInMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
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

