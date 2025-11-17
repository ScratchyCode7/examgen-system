// Why configuration is needed? 
// It's simply because before creating a migration for our database we need to tell the database 
// the data that must be created on the database

using Databank.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Databank.Configuration;


public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        //
        builder.HasKey(x => x.UserId);


        builder.Property(x => x.UserId)
        .HasDefaultValueSql("gen_random_uuid()")
        .ValueGeneratedOnAdd();

        builder.Property(n => n.Username)
        .IsRequired()
        .HasMaxLength(20);

        builder.Property(n => n.Password)
        .IsRequired()
        .HasMaxLength(250);

        builder.Property(n => n.FirstName)
        .IsRequired()
        .HasMaxLength(100);

        builder.Property(n => n.LastName)
        .IsRequired()
        .HasMaxLength(100);

        builder.Property(n => n.Department)
        .IsRequired();

        builder.Property(d => d.CreatedAt)
        .HasDefaultValueSql("current_date");

        builder.Property(d => d.UpdatedAt)
        .ValueGeneratedOnAddOrUpdate()
        .HasDefaultValueSql("current_date");
    }
}