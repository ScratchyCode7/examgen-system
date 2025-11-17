using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Database;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; init; } = null!;
    public DbSet<Question> Questions { get; init; } = null!;
    public DbSet<Category> Categories { get; init; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Apply configurations if you have them
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
