using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Database;

public sealed class AppDbContext(DbContextOptions options) : DbContext(options)
{
    /// <summary>
    /// The AppDbContext Constructor takes a parameter of DbContextOptions and passes it to the
    /// base class constructor. This parameter is used to configure the context, such as specifying
    /// the database provider and connection string.
    /// </summary>

    public required DbSet<Department> Departments { get; init; }
    public required DbSet<Course> Courses { get; init; }
    public required DbSet<User> Users { get; init; }
    public required DbSet<UserDepartment> UserDepartments { get; init; }
    public required DbSet<Subject> Subjects { get; init; }
    public required DbSet<Topic> Topics { get; init; }
    public required DbSet<Question> Questions { get; init; }
    public required DbSet<Option> Options { get; init; }
    public required DbSet<Test> Tests { get; init; }
    public required DbSet<TestQuestion> TestQuestions { get; init; }
    public required DbSet<ActivityLog> ActivityLogs { get; init; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}