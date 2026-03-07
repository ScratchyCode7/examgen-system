using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Databank.Configuration;

public sealed class TestQuestionConfiguration : IEntityTypeConfiguration<TestQuestion>
{
    public void Configure(EntityTypeBuilder<TestQuestion> builder)
    {
        builder.ToTable("TestQuestions");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id)
            .ValueGeneratedOnAdd();

        builder.Property(x => x.TestId)
            .IsRequired();

        builder.Property(x => x.QuestionId)
            .IsRequired();

        builder.Property(x => x.DisplayOrder)
            .HasDefaultValue(0);

        builder.Property(x => x.OptionSnapshotJson)
            .HasColumnType("jsonb")
            .HasColumnName("OptionSnapshotJson");

        // Relationships
        builder.HasOne(x => x.Test)
            .WithMany(x => x.TestQuestions)
            .HasForeignKey(x => x.TestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Question)
            .WithMany(x => x.TestQuestions)
            .HasForeignKey(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Composite index to prevent duplicates
        builder.HasIndex(x => new { x.TestId, x.QuestionId })
            .IsUnique();
    }
}
