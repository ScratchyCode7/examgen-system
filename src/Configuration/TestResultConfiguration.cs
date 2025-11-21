using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Databank.Configuration;

public sealed class TestResultConfiguration : IEntityTypeConfiguration<TestResult>
{
    public void Configure(EntityTypeBuilder<TestResult> builder)
    {
        builder.ToTable("TestResults");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id)
            .ValueGeneratedOnAdd();

        builder.Property(x => x.Score)
            .HasPrecision(5, 2);

        builder.Property(x => x.CompletedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(x => x.Duration)
            .HasConversion(new TimeSpanToTicksConverter());

        builder.HasOne(x => x.User)
            .WithMany(x => x.TestResults)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Test)
            .WithMany(x => x.TestResults)
            .HasForeignKey(x => x.TestId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

