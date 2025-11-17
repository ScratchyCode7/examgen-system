using System.Reflection;

using Databank.Database;
using Databank.Extensions;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Register endpoints
builder.Services.AddEndpoints(Assembly.GetExecutingAssembly());

// Register DbContext for PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("PostgresConnection"));
});

var app = builder.Build();

// Map endpoints
app.Endpoint();

app.Run();
