using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace src.Migrations
{
    /// <inheritdoc />
    public partial class UnenrollUsersFromAviationDepartment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                @"
DELETE FROM ""UserDepartments""
WHERE ""DepartmentId"" IN (
    SELECT ""Id""
    FROM ""Departments""
    WHERE UPPER(""Code"") = 'SOA'
);

UPDATE ""Users""
SET ""DepartmentId"" = NULL
WHERE ""DepartmentId"" IN (
    SELECT ""Id""
    FROM ""Departments""
    WHERE UPPER(""Code"") = 'SOA'
);
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No reliable down migration: original user-to-department assignments are intentionally removed.
        }
    }
}
