using Databank.Database;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace src.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260413113000_UpdateDepartmentNamesToOfficialTitles")]
public sealed class UpdateDepartmentNamesToOfficialTitles : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
UPDATE ""Departments""
SET ""Name"" = CASE UPPER(""Code"")
    WHEN 'CCS' THEN 'College of Computer Studies'
    WHEN 'CAS' THEN 'College of Arts and Sciences'
    WHEN 'CBA' THEN 'College of Business & Accountancy'
    WHEN 'EDUC' THEN 'College of Teacher Education'
    WHEN 'COEA' THEN 'College of Engineering, Architecture & Aviation'
    WHEN 'CIHM' THEN 'College of International Hospitality Management'
    WHEN 'CME' THEN 'College of Maritime Education'
    WHEN 'LJD' THEN 'Law/Juris Doctor'
    WHEN 'SOA' THEN 'School of Aviation'
    ELSE ""Name""
END,
""UpdatedAt"" = CURRENT_TIMESTAMP
WHERE UPPER(""Code"") IN ('CCS','CAS','CBA','EDUC','COEA','CIHM','CME','LJD','SOA');
");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
UPDATE ""Departments""
SET ""Name"" = CASE UPPER(""Code"")
    WHEN 'CCS' THEN 'COMPUTER STUDIES'
    WHEN 'CAS' THEN 'ARTS & SCIENCES'
    WHEN 'CBA' THEN 'BUSINESS & ACCOUNTANCY'
    WHEN 'EDUC' THEN 'EDUCATION'
    WHEN 'COEA' THEN 'ENGINEERING & ARCHITECTURE'
    WHEN 'CIHM' THEN 'INTERNATIONAL HOSPITALITY MANAGEMENT'
    WHEN 'CME' THEN 'MARITIME'
    WHEN 'LJD' THEN 'LAW/JURIS DOCTOR'
    WHEN 'SOA' THEN 'AVIATION'
    ELSE ""Name""
END,
""UpdatedAt"" = CURRENT_TIMESTAMP
WHERE UPPER(""Code"") IN ('CCS','CAS','CBA','EDUC','COEA','CIHM','CME','LJD','SOA');
");
    }
}
