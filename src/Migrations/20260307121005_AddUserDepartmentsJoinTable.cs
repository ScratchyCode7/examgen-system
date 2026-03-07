using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace src.Migrations
{
    /// <inheritdoc />
    public partial class AddUserDepartmentsJoinTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "DepartmentId",
                table: "Users",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.CreateTable(
                name: "UserDepartments",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    DepartmentId = table.Column<int>(type: "integer", nullable: false),
                    RoleScope = table.Column<string>(type: "character varying(50)", unicode: false, maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserDepartments", x => new { x.UserId, x.DepartmentId });
                    table.ForeignKey(
                        name: "FK_UserDepartments_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserDepartments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserDepartments_DepartmentId",
                table: "UserDepartments",
                column: "DepartmentId");

            // Backfill: Migrate existing User.DepartmentId to UserDepartments
            migrationBuilder.Sql(@"
                INSERT INTO ""UserDepartments"" (""UserId"", ""DepartmentId"", ""CreatedAt"", ""UpdatedAt"")
                SELECT 
                    ""UserId"", 
                    ""DepartmentId"",
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                FROM ""Users""
                WHERE ""DepartmentId"" IS NOT NULL;
            ");

            // Optional: Drop the old FK constraint if you want to remove DepartmentId later
            // For now we keep it nullable to maintain backward compatibility during transition
            // Uncomment these lines when ready to fully migrate:
            // migrationBuilder.DropForeignKey(
            //     name: "FK_Users_Departments_DepartmentId",
            //     table: "Users");
            // 
            // migrationBuilder.DropColumn(
            //     name: "DepartmentId",
            //     table: "Users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Rollback: Restore DepartmentId from UserDepartments if needed
            // Take the first department for each user (if they have multiple)
            migrationBuilder.Sql(@"
                UPDATE ""Users""
                SET ""DepartmentId"" = ud.""DepartmentId""
                FROM (
                    SELECT DISTINCT ON (""UserId"") ""UserId"", ""DepartmentId""
                    FROM ""UserDepartments""
                    ORDER BY ""UserId"", ""DepartmentId""
                ) ud
                WHERE ""Users"".""UserId"" = ud.""UserId""
                AND ""Users"".""DepartmentId"" IS NULL;
            ");

            migrationBuilder.DropTable(
                name: "UserDepartments");

            migrationBuilder.AlterColumn<int>(
                name: "DepartmentId",
                table: "Users",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
