using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Databank.Configuration;

public sealed class UserTopicConfiguration : IEntityTypeConfiguration<UserTopic>
{
    public void Configure(EntityTypeBuilder<UserTopic> builder)
    {
        builder.ToTable("UserTopics");

        builder.HasKey(ut => new { ut.UserId, ut.TopicId });

        builder.Property(ut => ut.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(ut => ut.UpdatedAt)
            .ValueGeneratedOnAddOrUpdate()
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.HasOne(ut => ut.User)
            .WithMany(u => u.UserTopics)
            .HasForeignKey(ut => ut.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ut => ut.Topic)
            .WithMany(t => t.UserTopics)
            .HasForeignKey(ut => ut.TopicId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
