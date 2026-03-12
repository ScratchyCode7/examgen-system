using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Databank.Configuration;

public sealed class QuestionImageConfiguration : IEntityTypeConfiguration<QuestionImage>
{
    public void Configure(EntityTypeBuilder<QuestionImage> builder)
    {
        builder.ToTable("QuestionImages");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id)
            .ValueGeneratedOnAdd();

        builder.Property(x => x.QuestionId)
            .IsRequired();

        builder.Property(x => x.ImagePath)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(x => x.WidthPercentage)
            .IsRequired()
            .HasDefaultValue(50);

        builder.Property(x => x.Alignment)
            .IsRequired()
            .HasMaxLength(20)
            .HasDefaultValue("Center");

        builder.Property(x => x.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(x => x.UpdatedAt)
            .ValueGeneratedOnAddOrUpdate()
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        // Relationships
        builder.HasOne(x => x.Question)
            .WithOne(x => x.QuestionImage)
            .HasForeignKey<QuestionImage>(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Index for faster lookups
        builder.HasIndex(x => x.QuestionId);
    }
}
