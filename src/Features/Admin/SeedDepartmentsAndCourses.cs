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

        // Department definitions with their courses (Name, Code)
        var departmentDefinitions = new Dictionary<string, (string Name, string Description, List<(string Name, string Code)> Courses)>
        {
            // Existing departments - only add courses
            ["CCS"] = ("College of Computer Studies", "Computer Science and IT programs", new List<(string, string)>
            {
                ("BS Computer Science", "BSCS"),
                ("BS Information Technology", "BSIT"),
                ("BS Information Technology – Cybersecurity", "BSIT-CS"),
                ("BS Entertainment and Multimedia Computing", "BSEMC")
            }),
            ["CBA"] = ("College of Business Administration", "Business and Management programs", new List<(string, string)>
            {
                ("BS Business Administration – Marketing Management", "BSBA-MM"),
                ("BS Business Administration – Financial Management", "BSBA-FM"),
                ("BS Business Administration – Human Resource Management", "BSBA-HRM"),
                ("BS Entrepreneurship", "BSENTREP")
            }),
            ["CAS"] = ("College of Arts and Sciences", "Liberal Arts and Sciences programs", new List<(string, string)>
            {
                ("BA Communication", "BACOMM"),
                ("BS Psychology", "BSPSY"),
                ("AB Political Science", "ABPOLSCI")
            }),
            
            // New departments to create
            ["CIHM"] = ("College of International Hospitality Management", "Hospitality and Tourism programs", new List<(string, string)>
            {
                ("BS Hospitality Management", "BSHM"),
                ("BS Tourism Management", "BSTM"),
                ("BS Nutrition and Dietetics", "BSND")
            }),
            ["CME"] = ("College of Maritime Education", "Maritime and Marine programs", new List<(string, string)>
            {
                ("BS Marine Transportation", "BSMT"),
                ("BS Marine Engineering", "BSMARE")
            }),
            ["COEA"] = ("College of Engineering and Architecture", "Engineering and Architecture programs", new List<(string, string)>
            {
                ("BS Civil Engineering", "BSCE"),
                ("BS Computer Engineering", "BSCPE"),
                ("BS Industrial Engineering", "BSIE"),
                ("BS Architecture", "BSARCH")
            }),
            ["CRIM"] = ("College of Criminology", "Criminology programs", new List<(string, string)>
            {
                ("BS Criminology", "BSCRIM")
            }),
            ["EDUC"] = ("College of Education", "Education programs", new List<(string, string)>
            {
                ("Bachelor of Elementary Education", "BEED"),
                ("Bachelor of Secondary Education", "BSED")
            }),
            ["GRAD"] = ("Graduate School", "Graduate programs", new List<(string, string)>
            {
                ("Master of Arts in Education", "MAED"),
                ("Master in Business Administration", "MBA"),
                ("Master in Public Administration", "MPA"),
                ("Master of Science in Criminology", "MSCRIM"),
                ("Master of Science in Nursing", "MSN")
            }),
            ["LJD"] = ("College of Law", "Law programs", new List<(string, string)>
            {
                ("Juris Doctor", "JD")
            }),
            ["SOA"] = ("School of Aviation", "Aviation programs", new List<(string, string)>
            {
                ("BS Aviation Major in Flying", "BSAV-FLY"),
                ("BS Aviation Major in Aviation Management", "BSAV-MGT")
            })
        };

            foreach (var (code, (name, description, courses)) in departmentDefinitions)
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
                foreach (var (courseName, courseCode) in courses)
                {
                    // Check if course already exists in this department by name
                    var existingCourse = await dbContext.Courses
                        .FirstOrDefaultAsync(c => c.Name == courseName && c.DepartmentId == department.Id, ct);

                    if (existingCourse == null)
                    {
                        // Create new course
                        var course = new Course
                        {
                            Name = courseName,
                            Code = courseCode,
                            Description = courseName,
                            DepartmentId = department.Id,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        dbContext.Courses.Add(course);
                        await dbContext.SaveChangesAsync(ct);
                        
                        response.CoursesCreated[code].Add($"{courseName} ({courseCode})");
                    }
                    else if (existingCourse.Code != courseCode)
                    {
                        // Update course code if it's wrong
                        existingCourse.Code = courseCode;
                        existingCourse.UpdatedAt = DateTime.UtcNow;
                        await dbContext.SaveChangesAsync(ct);
                        
                        response.CoursesCreated[code].Add($"{courseName} ({courseCode}) - code updated");
                    }
                    else
                    {
                        response.CoursesSkipped[code].Add($"{courseName} ({courseCode})");
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
}

public class SeedDepartmentsAndCoursesResponse
{
    public List<string> DepartmentsCreated { get; set; } = new();
    public List<string> DepartmentsSkipped { get; set; } = new();
    public Dictionary<string, List<string>> CoursesCreated { get; set; } = new();
    public Dictionary<string, List<string>> CoursesSkipped { get; set; } = new();
    public string Summary { get; set; } = string.Empty;
}
