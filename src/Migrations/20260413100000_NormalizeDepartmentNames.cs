using Databank.Database;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace src.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260413100000_NormalizeDepartmentNames")]
public sealed class NormalizeDepartmentNames : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
UPDATE ""Departments""
SET ""Name"" = CASE UPPER(""Code"")
    WHEN 'BED' THEN 'BASIC EDUCATION'
    WHEN 'SOA' THEN 'AVIATION'
    WHEN 'CAS' THEN 'ARTS & SCIENCES'
    WHEN 'CBA' THEN 'BUSINESS & ACCOUNTANCY'
    WHEN 'CCS' THEN 'COMPUTER STUDIES'
    WHEN 'CRIM' THEN 'CRIMINOLOGY'
    WHEN 'EDUC' THEN 'EDUCATION'
    WHEN 'COEA' THEN 'ENGINEERING & ARCHITECTURE'
    WHEN 'CIHM' THEN 'INTERNATIONAL HOSPITALITY MANAGEMENT'
    WHEN 'CME' THEN 'MARITIME'
    WHEN 'LJD' THEN 'LAW/JURIS DOCTOR'
    WHEN 'GRAD' THEN 'GRADUATE SCHOOL'
    ELSE ""Name""
END,
""UpdatedAt"" = CURRENT_TIMESTAMP
WHERE UPPER(""Code"") IN ('BED','SOA','CAS','CBA','CCS','CRIM','EDUC','COEA','CIHM','CME','LJD','GRAD');
");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
UPDATE ""Departments""
SET ""Name"" = CASE UPPER(""Code"")
    WHEN 'BED' THEN 'College of Basic Education'
    WHEN 'SOA' THEN 'School of Aviation'
    WHEN 'CAS' THEN 'College of Arts and Sciences'
    WHEN 'CBA' THEN 'College of Business Administration'
    WHEN 'CCS' THEN 'College of Computer Studies'
    WHEN 'CRIM' THEN 'College of Criminology'
    WHEN 'EDUC' THEN 'College of Education'
    WHEN 'COEA' THEN 'College of Engineering and Architecture'
    WHEN 'CIHM' THEN 'College of International Hospitality Management'
    WHEN 'CME' THEN 'College of Maritime Education'
    WHEN 'LJD' THEN 'College of Law'
    WHEN 'GRAD' THEN 'Graduate School'
    ELSE ""Name""
END,
""UpdatedAt"" = CURRENT_TIMESTAMP
WHERE UPPER(""Code"") IN ('BED','SOA','CAS','CBA','CCS','CRIM','EDUC','COEA','CIHM','CME','LJD','GRAD');
");
    }
}
