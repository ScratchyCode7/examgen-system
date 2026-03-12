using Databank.Abstract;
using Databank.Database;
using Databank.Entities;
using Microsoft.EntityFrameworkCore;

namespace Databank.Features.Admin;

public sealed class SeedDepartmentsAndCoursesEndpoint : IEndpoint
{
    public void Endpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/admin/seed-departments-courses", async Task<IResult> (
                AppDbContext dbContext,
                CancellationToken ct) =>
        {
            var response = new SeedDepartmentsAndCoursesResponse
            {
                DepartmentsCreated = new List<string>(),
                DepartmentsSkipped = new List<string>(),
                CoursesCreated = new Dictionary<string, List<string>>(),
                CoursesSkipped = new Dictionary<string, List<string>>()
            };

        // Department definitions with their courses
        var departmentDefinitions = new Dictionary<string, (string Name, string Description, List<string> Courses)>
        {
            // Existing departments - only add courses
            ["CCS"] = ("College of Computer Studies", "Computer Science and IT programs", new List<string>
            {
                "BS Computer Science (BSCS)",
                "BS Information Technology (BSIT)",
                "BS Information Technology – Cybersecurity",
                "BS Entertainment and Multimedia Computing (BSEMC)"
            }),
            ["CBA"] = ("College of Business Administration", "Business and Management programs", new List<string>
            {
                "BS Business Administration – Marketing Management",
                "BS Business Administration – Financial Management",
                "BS Business Administration – Human Resource Management",
                "BS Entrepreneurship"
            }),
            ["CAS"] = ("College of Arts and Sciences", "Liberal Arts and Sciences programs", new List<string>
            {
                "BA Communication",
                "BS Psychology",
                "AB Political Science"
            }),
            
            // New departments to create
            ["CIHM"] = ("College of International Hospitality Management", "Hospitality and Tourism programs", new List<string>
            {
                "BS Hospitality Management",
                "BS Tourism Management",
                "BS Nutrition and Dietetics"
            }),
            ["CME"] = ("College of Maritime Education", "Maritime and Marine programs", new List<string>
            {
                "BS Marine Transportation",
                "BS Marine Engineering"
            }),
            ["COEA"] = ("College of Engineering and Architecture", "Engineering and Architecture programs", new List<string>
            {
                "BS Civil Engineering",
                "BS Computer Engineering",
                "BS Industrial Engineering",
                "BS Architecture"
            }),
            ["CRIM"] = ("College of Criminology", "Criminology programs", new List<string>
            {
                "BS Criminology"
            }),
            ["EDUC"] = ("College of Education", "Education programs", new List<string>
            {
                "Bachelor of Elementary Education",
                "Bachelor of Secondary Education"
            }),
            ["GRAD"] = ("Graduate School", "Graduate programs", new List<string>
            {
                "Master of Arts in Education",
                "Master in Business Administration",
                "Master in Public Administration",
                "Master of Science in Criminology",
                "Master of Science in Nursing"
            }),
            ["LJD"] = ("College of Law", "Law programs", new List<string>
            {
                "Juris Doctor"
            }),
            ["SOA"] = ("School of Aviation", "Aviation programs", new List<string>
            {
                "BS Aviation Major in Flying",
                "BS Aviation Major in Aviation Management"
            })
        };

            foreach (var (code, (name, description, courseNames)) in departmentDefinitions)
            {
                // Check if department exists
                var department = await dbContext.Departments
                    .Include(d => d.Courses)
                    .FirstOrDefaultAsync(d => d.Code == code, ct);

                if (department == null)
                {
                    // Create new department
                    department = new Department
                    {
                        Code = code,
                        Name = name,
                        Description = description,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    dbContext.Departments.Add(department);
                    await dbContext.SaveChangesAsync(ct);
                    
                    response.DepartmentsCreated.Add($"{code} - {name}");
                }
                else
                {
                    response.DepartmentsSkipped.Add($"{code} - {name} (already exists)");
                }

                // Initialize dictionaries
                if (!response.CoursesCreated.ContainsKey(code))
                    response.CoursesCreated[code] = new List<string>();
                if (!response.CoursesSkipped.ContainsKey(code))
                    response.CoursesSkipped[code] = new List<string>();

                // Seed courses for this department
                foreach (var courseName in courseNames)
                {
                    // Check if course already exists in this department
                    var existingCourse = await dbContext.Courses
                        .FirstOrDefaultAsync(c => c.Name == courseName && c.DepartmentId == department.Id, ct);

                    if (existingCourse == null)
                    {
                        // Create new course
                        var course = new Course
                        {
                            Name = courseName,
                            Code = GenerateCourseCode(courseName),
                            Description = courseName,
                            DepartmentId = department.Id,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        dbContext.Courses.Add(course);
                        await dbContext.SaveChangesAsync(ct);
                        
                        response.CoursesCreated[code].Add(courseName);
                    }
                    else
                    {
                        response.CoursesSkipped[code].Add(courseName);
                    }
                }
            }

            response.Summary = $"Departments Created: {response.DepartmentsCreated.Count}, " +
                              $"Departments Skipped: {response.DepartmentsSkipped.Count}, " +
                              $"Total Courses Created: {response.CoursesCreated.Values.Sum(list => list.Count)}, " +
                              $"Total Courses Skipped: {response.CoursesSkipped.Values.Sum(list => list.Count)}";

            return TypedResults.Ok(response);
        }).RequireAuthorization("AdminOnly");
    }

    private static string GenerateCourseCode(string courseName)
    {
        // Simple course code generation: Take first letters of major words
        var words = courseName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var code = string.Join("", words
            .Where(w => w.Length > 2 && !new[] { "of", "in", "and", "the", "–", "-", "Major" }.Contains(w))
            .Select(w => w[0]));
        
        return code.ToUpper();
    }
}

public class SeedDepartmentsAndCoursesResponse
{
    public List<string> DepartmentsCreated { get; set; } = new();
    public List<string> DepartmentsSkipped { get; set; } = new();
    public Dictionary<string, List<string>> CoursesCreated { get; set; } = new();
    public Dictionary<string, List<string>> CoursesSkipped { get; set; } = new();
    public string Summary { get; set; } = string.Empty;
}
