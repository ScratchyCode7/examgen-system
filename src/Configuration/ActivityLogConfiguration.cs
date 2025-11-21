using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Databank.Configuration;

public sealed class ActivityLogConfiguration : IEntityTypeConfiguration<ActivityLog>
{
    public void Configure(EntityTypeBuilder<ActivityLog> builder)
    {
        builder.ToTable("ActivityLogs");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id)
            .ValueGeneratedOnAdd();

        builder.Property(x => x.Category)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Action)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.Severity)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(x => x.Details)
            .HasMaxLength(2000);

        builder.Property(x => x.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.HasOne(x => x.User)
            .WithMany(x => x.ActivityLogs)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

