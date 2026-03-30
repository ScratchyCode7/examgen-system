using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace src.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionCreatedByUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "Questions",
                type: "uuid",
                nullable: true);

                        migrationBuilder.Sql(@"
                                UPDATE ""Questions"" q
                                SET ""CreatedByUserId"" = owner.""UserId""
                                FROM (
                                        SELECT DISTINCT ON (al.""EntityId"")
                                                al.""EntityId"",
                                                al.""UserId""
                                        FROM ""ActivityLogs"" al
                                        WHERE al.""EntityType"" = 'Question'
                                            AND al.""UserId"" IS NOT NULL
                                            AND al.""EntityId"" IS NOT NULL
                                            AND al.""Action"" IN ('Created', 'Imported', 'Seeded')
                                        ORDER BY al.""EntityId"", al.""CreatedAt"" ASC
                                ) owner
                                WHERE q.""Id"" = owner.""EntityId""
                                    AND q.""CreatedByUserId"" IS NULL;
                        ");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_CreatedByUserId",
                table: "Questions",
                column: "CreatedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Questions_CreatedByUserId",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Questions");
        }
    }
}
