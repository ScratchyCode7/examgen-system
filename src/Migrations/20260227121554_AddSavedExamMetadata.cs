using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace src.Migrations
{
    /// <inheritdoc />
    public partial class AddSavedExamMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CourseId",
                table: "Tests",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DepartmentId",
                table: "Tests",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExamType",
                table: "Tests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "QuestionSignature",
                table: "Tests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SchoolYear",
                table: "Tests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Semester",
                table: "Tests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SetLabel",
                table: "Tests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SpecificationSnapshot",
                table: "Tests",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tests_CourseId",
                table: "Tests",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_Tests_DepartmentId",
                table: "Tests",
                column: "DepartmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tests_Courses_CourseId",
                table: "Tests",
                column: "CourseId",
                principalTable: "Courses",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Tests_Departments_DepartmentId",
                table: "Tests",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tests_Courses_CourseId",
                table: "Tests");

            migrationBuilder.DropForeignKey(
                name: "FK_Tests_Departments_DepartmentId",
                table: "Tests");

            migrationBuilder.DropIndex(
                name: "IX_Tests_CourseId",
                table: "Tests");

            migrationBuilder.DropIndex(
                name: "IX_Tests_DepartmentId",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "CourseId",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "ExamType",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "QuestionSignature",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "SchoolYear",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "Semester",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "SetLabel",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "SpecificationSnapshot",
                table: "Tests");
        }
    }
}
