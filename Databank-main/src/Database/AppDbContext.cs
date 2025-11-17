using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Database;


public sealed class AppDbContext(DbContextOptions options) : DbContext(options)
{

    /// <summary>
    /// The AppDbContext Constructor takes a paramter of DbContextOptions and passes to the
    /// base class constructor. This parameter is use to configure the context, such as specifying
    /// the database provider and connection string.
    /// 
    /// The Method Database.EnsureCreated is being called to ensure that the database is 
    //  created if it doesn't already exist
    // 
    // The Database.EnsureCreated method must be use only during development and not in production
    /// </summary>
    /// <param name="options"></param>

    /// <summary>
    /// A DbSet represents the collection of all entities in the context, or that can be queried from the database, of a given type. 
    //  DbSet objects are created from a DbContext using the DbContext.Set method.
    /// </summary>
    /// 

    public required DbSet<User> Users { get; init; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}