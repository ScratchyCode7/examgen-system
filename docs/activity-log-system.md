# Activity Log System

## Overview

The Activity Log system provides comprehensive audit tracking for the Databank application. It automatically logs user actions across key operations, providing administrators with visibility into system usage and changes.

## Features

- **Automatic Logging**: Key user actions are automatically captured
- **Rich Filtering**: Search logs by user, department, category, action, date range, and severity
- **CSV Export**: Download filtered activity logs for archival and analysis
- **Performance Optimized**: Asynchronous logging with database indexes for fast queries
- **Admin-Only Access**: Only administrators can view and export activity logs

## Logged Actions

The system logs the following types of activities:

### Questions
- **Created**: When a new question is created
- **Updated**: When a question is modified
- **Deleted**: When a question is removed (admin-only)
- **Image Uploaded**: When an image is attached to a question

### Tests/Exams
- **Generated**: When a new test is generated from the question bank
- **Saved**: When a generated exam is saved with specific parameters

### Future Enhancements
Additional logging can be easily added for:
- User account changes
- Department/Course/Subject/Topic management
- Print request submissions
- Login/logout events

## Architecture

### Backend Components

#### 1. ActivityLog Entity
Location: `src/Entities/ActivityLog.cs`

Properties:
- `Id`: Unique identifier
- `DepartmentId`: Department context for the action
- `UserId`: User who performed the action (nullable for system actions)
- `Category`: High-level grouping (e.g., "Questions", "Tests", "Users")
- `Action`: Specific action taken (e.g., "Created", "Updated", "Deleted")
- `EntityType`: Type of entity affected (e.g., "Question", "Test")
- `EntityId`: ID of the specific entity affected
- `Details`: Additional context (truncated preview of changes)
- `Severity`: Log level ("Info", "Warning", "Error")
- `CreatedAt`: Timestamp of the action

#### 2. LoggingService
Location: `src/Services/LoggingService.cs`

The `ILoggingService` interface provides methods for logging:

```csharp
// Log with entity tracking
Task LogActivityAsync(string? userId, string category, string action, 
    string entityType, int? entityId, string? details = null);

// Log without entity tracking
Task LogActivityAsync(string? userId, string category, string action, 
    string? details = null);

// Severity-specific logging
Task LogInfoAsync(string? userId, string category, string action, 
    string? details = null);
Task LogWarningAsync(string? userId, string category, string action, 
    string? details = null);
Task LogErrorAsync(string? userId, string category, string action, 
    string? details = null, string severity = "Error");
```

**Key Features**:
- Automatic department resolution from UserDepartments join table
- Graceful handling of multi-department users (uses first department)
- Asynchronous saves for performance
- No exceptions thrown on logging failures (fails silently to prevent disruption)

#### 3. API Endpoints

##### List Activity Logs
- **Endpoint**: `GET /api/activity-logs`
- **Authorization**: Admin only
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `pageSize`: Results per page (default: 20)
  - `userId`: Filter by user GUID
  - `departmentId`: Filter by department ID
  - `category`: Filter by category
  - `action`: Filter by action
  - `entityType`: Filter by entity type
  - `severity`: Filter by severity
  - `startDate`: Filter by date range start
  - `endDate`: Filter by date range end

**Response**:
```json
{
  "items": [
    {
      "id": 123,
      "departmentId": 1,
      "departmentName": "College of Computer Studies",
      "userId": "guid-here",
      "userName": "John Doe",
      "category": "Questions",
      "action": "Created",
      "entityType": "Question",
      "entityId": 456,
      "details": "Created question: What is the capital of France?...",
      "severity": "Info",
      "createdAt": "2025-03-11T10:30:00Z"
    }
  ],
  "pageNumber": 1,
  "pageSize": 20,
  "totalCount": 150,
  "totalPages": 8,
  "hasNext": true,
  "hasPrevious": false
}
```

##### Export Activity Logs
- **Endpoint**: `GET /api/activity-logs/export`
- **Authorization**: Admin only
- **Query Parameters**: Same as List endpoint
- **Response**: CSV file download

**CSV Format**:
```
ID,Timestamp,Department,User,Category,Action,Entity Type,Entity ID,Details,Severity
123,2025-03-11 10:30:00,College of Computer Studies,John Doe,Questions,Created,Question,456,"Created question: What...",Info
```

### Frontend Components

#### ActivityLogs Page
Location: `client/src/pages/ActivityLogs.jsx`

**Features**:
- Paginated table view of activity logs
- Filter panel with:
  - Date range picker (start/end)
  - Category dropdown
  - Action dropdown
  - Severity dropdown
- Real-time filtering with "Apply Filters" button
- CSV export with current filters applied
- Refresh button to reload data
- Responsive design with dark mode support

**Access**: Admin menu → Activity Logs

#### Styling
Location: `client/src/styles/ActivityLogs.css`

Includes:
- Table styling with hover effects
- Severity badges (Info: blue, Warning: orange, Error: red)
- Filter form layout
- Pagination controls
- Dark mode variables

## Integration Guide

### Adding Logging to a New Endpoint

1. **Inject ILoggingService**:
```csharp
app.MapPost("/api/example", async Task<IResult> (
    ExampleRequest request,
    AppDbContext dbContext,
    ILoggingService loggingService,
    HttpContext httpContext,
    CancellationToken ct) =>
{
    // Your endpoint logic here
});
```

2. **Get User ID from JWT Claims**:
```csharp
var userId = httpContext.User.FindFirst("sub")?.Value 
    ?? httpContext.User.FindFirst("userId")?.Value;
```

3. **Log the Activity**:
```csharp
await loggingService.LogActivityAsync(
    userId, 
    "Category",        // e.g., "Questions", "Tests", "Users"
    "Action",          // e.g., "Created", "Updated", "Deleted"
    "EntityType",      // e.g., "Question", "Test", "User"
    entityId,          // The ID of the entity
    "Details"          // Optional: brief description
);
```

### Example Implementation

```csharp
// Create Question Endpoint
var question = new Question { /* ... */ };
await dbContext.Questions.AddAsync(question, ct);
await dbContext.SaveChangesAsync(ct);

// Log the action
var userId = httpContext.User.FindFirst("sub")?.Value;
await loggingService.LogActivityAsync(
    userId, 
    "Questions", 
    "Created", 
    "Question", 
    question.Id,
    $"Created question: {question.Content.Substring(0, Math.Min(50, question.Content.Length))}..."
);

return TypedResults.Created($"/api/questions/{question.Id}", question);
```

## Performance Considerations

### Asynchronous Design
- All logging operations are async to avoid blocking main request processing
- Uses `await dbContext.SaveChangesAsync()` for non-blocking database writes

### Database Indexes
The ActivityLog table has indexes on:
- `UserId`: Fast filtering by user
- `CreatedAt`: Efficient date range queries
- `Action`: Quick action-based searches
- `Category`: Fast category filtering

These indexes are automatically created during migrations.

### Error Handling
- Logging failures are caught and logged to console but don't throw exceptions
- Main application flow continues even if logging fails
- Prevents FK violation errors if user has no department association

## Security

### Authorization
- All activity log endpoints require admin authentication
- Uses `RequireAuthorization("AdminOnly")` policy
- JWT token validation required

### Data Privacy
- User IDs are GUIDs (not exposed to non-admins)
- Details field limited to 3000 characters
- No sensitive data (passwords, tokens) logged
- Department context ensures multi-tenant isolation

## Monitoring and Maintenance

### Recommended Practices

1. **Regular Exports**
   - Export logs monthly and archive to reduce database size
   - Use CSV exports for long-term storage
   - Consider automated scheduled exports

2. **Retention Policy**
   - Keep 30-90 days in database for fast access
   - Archive older logs to file storage
   - Set up cleanup jobs to prevent table bloat

3. **Monitoring**
   - Track log volume over time
   - Alert on high error severity counts
   - Monitor disk usage of ActivityLogs table

4. **Archival Strategy**
   - Weekly exports for active periods
   - Monthly exports for regular tracking
   - Store in secure cloud storage or network drive
   - Maintain 1-2 year archive for compliance

## Future Enhancements

### Potential Features
- [ ] Background job for automatic monthly exports
- [ ] Retention policy with auto-cleanup
- [ ] Email alerts on critical errors
- [ ] Dashboard with log statistics
- [ ] Advanced search with full-text indexing
- [ ] Log aggregation and analytics
- [ ] Real-time log streaming for monitoring

### Extensibility
The system is designed for easy extension:
- Add new categories by updating the Categories enum/list
- Add new actions by defining them in logging calls
- Extend entity types as new features are added
- Custom severity levels can be added

## Troubleshooting

### Logs Not Appearing
1. Check user has department association in UserDepartments table
2. Verify LoggingService is properly registered in `Program.cs`
3. Check database permissions for ActivityLogs table
4. Review console output for logging exceptions

### Slow Performance
1. Verify indexes exist: `\d ActivityLogs` in PostgreSQL
2. Check database query execution plans
3. Reduce retention window if table is too large
4. Consider partitioning for very large datasets

### Export Not Working
1. Verify user has admin role
2. Check Content-Type header in response
3. Review CORS settings if frontend blocked
4. Test endpoint directly with Postman

## Contact

For questions or issues with the activity log system, contact the development team or refer to the main README.md for project information.
