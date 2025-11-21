using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Databank.Configuration;

public sealed class TestConfiguration : IEntityTypeConfiguration<Test>
{
    public void Configure(EntityTypeBuilder<Test> builder)
    {
        builder.ToTable("Tests");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id)
            .ValueGeneratedOnAdd();

        builder.Property(x => x.SubjectId)
            .IsRequired();

        builder.Property(x => x.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.Description)
            .HasMaxLength(1000);

        builder.Property(x => x.DurationMinutes)
            .HasDefaultValue(60);

        builder.Property(x => x.IsPublished)
            .HasDefaultValue(false);

        builder.Property(x => x.AvailableFrom)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(x => x.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(x => x.UpdatedAt)
            .ValueGeneratedOnAddOrUpdate()
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.HasOne(x => x.Subject)
            .WithMany(x => x.Tests)
            .HasForeignKey(x => x.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

