using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Databank.Configuration;

public sealed class OptionConfiguration : IEntityTypeConfiguration<Option>
{
    public void Configure(EntityTypeBuilder<Option> builder)
    {
        builder.ToTable("Options");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id)
            .ValueGeneratedOnAdd();

        builder.Property(x => x.QuestionId)
            .IsRequired();

        builder.Property(x => x.Content)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(x => x.IsCorrect)
            .HasDefaultValue(false);

        builder.Property(x => x.DisplayOrder)
            .HasDefaultValue(0);

        builder.HasOne(x => x.Question)
            .WithMany(x => x.Options)
            .HasForeignKey(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

