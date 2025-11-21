using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Databank.Configuration;

public sealed class QuestionConfiguration : IEntityTypeConfiguration<Question>
{
    public void Configure(EntityTypeBuilder<Question> builder)
    {
        builder.ToTable("Questions");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id)
            .ValueGeneratedOnAdd();

        builder.Property(x => x.TestId)
            .IsRequired();

        builder.Property(x => x.Content)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(x => x.Type)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Points)
            .HasDefaultValue(1);

        builder.Property(x => x.DisplayOrder)
            .HasDefaultValue(0);

        builder.HasOne(x => x.Test)
            .WithMany(x => x.Questions)
            .HasForeignKey(x => x.TestId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

