# Print Request Workflow System

## Overview

The Print Request Workflow System implements a controlled printing process for exam materials, following a McDonald's-style POS/Kitchen workflow model. Non-admin users (teachers) cannot directly print exams but can generate and view them, then submit print requests that admins process.

**Version:** 1.0  
**Implementation Date:** March 7, 2026

## Workflow Model

### Teacher Flow (POS Terminal)
1. **Generate Exam** - Create exam with questions from question bank
2. **Save Exam** - Save the generated exam to database
3. **Request Print** - Submit print request for Master Set (TOS, Exam Paper, Answer Key)
4. **Check Status** - Monitor request status (Pending → Ready for Pickup → Completed)

### Admin Flow (Kitchen)
1. **View Queue** - See all pending print requests across departments
2. **Review Request** - View master set preview with all materials
3. **Print Master Set** - Print one copy for Xerox duplication
4. **Update Status** - Mark as Ready for Pickup or Completed

## Architecture

### Backend Components

#### Entity: PrintRequest
**Location:** `src/Entities/PrintRequest.cs`

```csharp
public class PrintRequest
{
    public Guid PrintRequestId { get; set; }
    public int TestId { get; set; }  // FK to Tests
    public Guid RequestedByUserId { get; set; }  // FK to Users
    public int DepartmentId { get; set; }  // FK to Departments
    public string Status { get; set; }  // Pending, ReadyForPickup, Completed, Rejected
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public Guid? ProcessedByUserId { get; set; }
    public string? Notes { get; set; }
    public int CopiesRequested { get; set; }
}
```

**Key Features:**
- Composite foreign keys to Tests, Users, Departments
- Status enum with 4 states
- Audit trail (CreatedAt, ProcessedAt, ProcessedBy)
- Request metadata (Notes, CopiesRequested)

#### Database Configuration
**Location:** `src/Configuration/PrintRequestConfiguration.cs`

**Indexes:**
- Status (query performance for pending requests)
- DepartmentId (department-scoped filtering)
- RequestedByUserId (user request history)
- CreatedAt (chronological ordering)
- ProcessedByUserId (admin processing history)
- TestId (test lookup)

**Relationships:**
- Test: Cascade delete (if test deleted, requests deleted)
- Users: Restrict delete (preserve audit trail)
- Department: Restrict delete (maintain referential integrity)

#### Migration
**Location:** `src/Migrations/20260307133029_AddPrintRequestEntity.cs`

Creates PrintRequests table with all indexes and foreign key constraints.

### API Endpoints

#### 1. Submit Print Request
**Endpoint:** `POST /api/printrequests`  
**Authorization:** Authenticated users  
**Request Body:**
```json
{
  "testId": 123,
  "notes": "Please print 30 copies for Section A",
  "copiesRequested": 1
}
```
**Response:** PrintRequestDto with ID and status

**Business Logic:**
- Validates test exists and has DepartmentId
- Checks for duplicate pending requests (same user + test)
- Sets initial status to Pending
- Returns 409 Conflict if duplicate exists

---

#### 2. Get Pending Print Requests
**Endpoint:** `GET /api/printrequests/pending`  
**Authorization:** Admin only  
**Response:** Array of PrintRequestDto ordered by CreatedAt

**Business Logic:**
- Filters by Status == Pending
- Includes Test, RequestedBy, Department navigations
- Ordered chronologically (oldest first)

---

#### 3. Get My Print Requests
**Endpoint:** `GET /api/printrequests/my-requests`  
**Authorization:** Authenticated users  
**Response:** Array of user's PrintRequestDto

**Business Logic:**
- Filters by RequestedByUserId == current user
- Includes all statuses
- Ordered by CreatedAt descending (newest first)

---

#### 4. Get Department Print Requests
**Endpoint:** `GET /api/printrequests/department/{departmentId}`  
**Authorization:** Authenticated users  
**Response:** Array of department's PrintRequestDto

**Business Logic:**
- Filters by DepartmentId
- Department-scoped visibility
- Ordered by CreatedAt descending

---

#### 5. Update Print Request Status
**Endpoint:** `PUT /api/printrequests/{id}/status`  
**Authorization:** Admin only  
**Request Body:**
```json
{
  "status": "ReadyForPickup",
  "notes": "Master set printed and ready in admin office"
}
```
**Response:** Updated PrintRequestDto

**Business Logic:**
- Validates status enum value
- Sets ProcessedAt and ProcessedByUserId on status change
- Appends admin notes to existing notes

---

#### 6. Get Master Set
**Endpoint:** `GET /api/printrequests/{id}/masterset`  
**Authorization:** Admin only  
**Response:** Complete exam data for printing

```json
{
  "printRequest": { /* PrintRequestDto */ },
  "testInfo": {
    "testId": 123,
    "title": "Midterm Exam",
    "type": "Midterm",
    "totalPoints": 100,
    "subject": { /* SubjectDto */ },
    "course": { /* CourseDto */ },
    "department": { /* DepartmentDto */ }
  },
  "questions": [
    {
      "questionNumber": 1,
      "content": "What is...",
      "points": 2,
      "bloomLevel": "Remember",
      "difficulty": "Easy",
      "topic": { "topicId": 1, "title": "Introduction" },
      "options": [
        { "displayOrder": 1, "optionText": "Option A", "isCorrect": true }
      ]
    }
  ]
}
```

**Business Logic:**
- Deep includes: Test → Subject, Course, Department, TestQuestions → Question → Topic, Options
- Ordered by TestQuestion.QuestionNumber
- Options ordered by DisplayOrder
- Complete nested data for TOS, Exam Paper, Answer Key generation

### Frontend Components

#### AdminPrintQueue Component
**Location:** `client/src/components/AdminPrintQueue.jsx` (378 lines)  
**Styles:** `client/src/styles/AdminPrintQueue.css` (563 lines)

**Features:**
- Pending requests table with department filtering
- View & Print button for master set preview
- Modal with 4 sections:
  1. **Cover Page** - Request details, department info, admin notes
  2. **Table of Specifications (TOS)** - Question distribution by topic and Bloom level
  3. **Exam Paper** - Questions and options (correct answers hidden)
  4. **Answer Key** - Correct answers by question number
- Status update buttons (Ready for Pickup, Completed, Rejected)
- Dark mode support
- Print-optimized CSS (black & white, page breaks, high contrast)

**Print Optimization:**
```css
@media print {
  * { color: #000 !important; background: #fff !important; }
  .page-break { page-break-after: always; }
  .no-print { display: none !important; }
}
```

---

#### PrintAccessControl Component
**Location:** `client/src/components/PrintAccessControl.jsx`

**Purpose:** Dynamically adds/removes print prevention class based on user role

**Implementation:**
```jsx
useEffect(() => {
  if (!user?.isAdmin) {
    document.body.classList.add('no-print-access');
  } else {
    document.body.classList.remove('no-print-access');
  }
  return () => document.body.classList.remove('no-print-access');
}, [user]);
```

**CSS Rule (index.css):**
```css
@media print {
  body.no-print-access,
  body.no-print-access * {
    display: none !important;
  }
}
```

**Effect:** Blocks Ctrl+P/Cmd+P browser printing for non-admin users across entire application.

---

#### TestGeneration Updates
**Location:** `client/src/pages/TestGeneration.jsx`

**Changes:**
1. **Conditional Button Text:**
   ```jsx
   {user?.isAdmin ? 'Print Options' : 'Request Print'}
   ```

2. **Dual Modal Logic:**
   - Admins → showPrintModal (direct print access)
   - Non-admins → showPrintRequestModal (submit request)

3. **Request Modal:**
   - Copies input (1-5 range)
   - Notes textarea (optional)
   - Submit button → `handleSubmitPrintRequest()`

4. **Validation:**
   - Requires saved exam (`activeExamMeta?.id`)
   - Returns error: "Please save the exam before requesting to print"

---

#### Admin Dashboard Integration
**Location:** `client/src/pages/DashboardAdmin.jsx`

**Changes:**
- Added "Print Queue" navigation item with Printer icon
- Integrated AdminPrintQueue component
- Navigation route: `activeView === 'printqueue'`

---

#### API Service Methods
**Location:** `client/src/services/api.js`

**New Methods:**
```javascript
submitPrintRequest(testId, notes, copiesRequested)
getMyPrintRequests()
getPendingPrintRequests()
getPrintRequestsByDepartment(departmentId)
updatePrintRequestStatus(printRequestId, status, notes)
getMasterSet(printRequestId)
```

## Security Features

### 1. Endpoint Authorization
- `GetPendingPrintRequestsEndpoint` → RequireAuthorization("AdminOnly")
- `UpdatePrintRequestStatusEndpoint` → RequireAuthorization("AdminOnly")
- `GetMasterSetEndpoint` → RequireAuthorization("AdminOnly")
- `GetByDepartmentEndpoint` → RequireAuthorization("AdminOnly")

### 2. Print Prevention
- CSS @media print blocks all content for non-admins
- PrintAccessControl component enforces class dynamically
- Browser print dialog (Ctrl+P/Cmd+P) disabled for teachers

### 3. Data Scoping
- Teachers can only view their own requests (RequestedByUserId filter)
- Department-scoped requests maintain multi-department isolation
- Duplicate request prevention (same user + test + pending status)

### 4. Audit Trail
- CreatedAt timestamp on all requests
- ProcessedAt and ProcessedByUserId track admin actions
- Notes field accumulates request history

## Usage Instructions

### For Teachers

1. **Generate Exam:**
   - Navigate to Test Generation page
   - Select subject, questions, configure exam settings
   - Click "Generate Exam"

2. **Save Exam:**
   - Review generated exam
   - Click "Save Exam" button
   - Wait for success confirmation

3. **Request Print:**
   - Click "Request Print" button (replaces Print Options for non-admins)
   - Enter number of copies needed (1-5)
   - Add notes for admin (optional): "Section A, 30 students"
   - Click "Submit Request"

4. **Check Status:**
   - Navigate to "My Print Requests" page
   - View request status: Pending → Ready for Pickup → Completed
   - Check admin notes for pickup instructions

### For Admins

1. **View Print Queue:**
   - Navigate to Admin Dashboard
   - Click "Print Queue" in left navigation
   - See all pending requests sorted by date

2. **Process Request:**
   - Click "View & Print" on request row
   - Modal opens with master set preview

3. **Review Master Set:**
   - **Cover Page:** Request details, department, teacher name
   - **Table of Specifications:** Question distribution analysis
   - **Exam Paper:** Questions with options (no correct answers shown)
   - **Answer Key:** Correct answers by question number

4. **Print Master Set:**
   - Click "Print Master Set" button in modal
   - Browser print dialog opens
   - Print one copy for Xerox duplication
   - Master set includes all 3 documents (TOS, Exam, Answer Key)

5. **Update Status:**
   - Click "Mark as Ready for Pickup"
   - Add admin notes: "Printed and available in Room 101"
   - Request moves out of pending queue
   - Teacher receives status update

## Master Set Components

### 1. Cover Page
- Request ID and date
- Test title and type
- Department and course information
- Teacher name and date requested
- Admin notes
- Copies requested

### 2. Table of Specifications (TOS)
- Question distribution by topic
- Bloom's Taxonomy level breakdown
- Points allocation per topic
- Total points summary

### 3. Exam Paper
- Questions numbered sequentially
- Multiple choice options (A, B, C, D)
- Points per question
- Instructions for students
- **Note:** Correct answers NOT visible

### 4. Answer Key
- Question number → Correct answer mapping
- Compact format for quick grading
- Separated from exam paper for security

## Print Optimization

### CSS Features
- **Black & White Enforcement:** All colors converted to black text on white background
- **Page Breaks:** Automatic page breaks between TOS, Exam Paper, Answer Key
- **High Contrast:** Enhanced text visibility for photocopying
- **Element Hiding:** Buttons, navigation, headers hidden in print view
- **Font Optimization:** Serif fonts for better print readability

### Recommended Printer Settings
- **Paper:** Letter (8.5" x 11")
- **Color:** Black & White / Grayscale
- **Quality:** High / Best
- **Margins:** Normal (1 inch)
- **Pages per Sheet:** 1

## Database Schema

### PrintRequests Table
| Column              | Type          | Constraints           |
|---------------------|---------------|-----------------------|
| PrintRequestId      | uuid          | PRIMARY KEY           |
| TestId              | integer       | FK → Tests(Id)        |
| RequestedByUserId   | uuid          | FK → Users(Id)        |
| DepartmentId        | integer       | FK → Departments(Id)  |
| Status              | text          | NOT NULL              |
| CreatedAt           | timestamp     | NOT NULL              |
| ProcessedAt         | timestamp     | NULL                  |
| ProcessedByUserId   | uuid          | FK → Users(Id), NULL  |
| Notes               | text          | NULL                  |
| CopiesRequested     | integer       | NOT NULL              |

### Indexes
```sql
CREATE INDEX ix_printrequests_status ON printrequests (status);
CREATE INDEX ix_printrequests_departmentid ON printrequests (departmentid);
CREATE INDEX ix_printrequests_requestedbyuserid ON printrequests (requestedbyuserid);
CREATE INDEX ix_printrequests_createdat ON printrequests (createdat);
CREATE INDEX ix_printrequests_processedbyuserid ON printrequests (processedbyuserid);
CREATE INDEX ix_printrequests_testid ON printrequests (testid);
```

## Status Workflow

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Teacher Submits Request                            │
│           ↓                                         │
│      [Pending]                                      │
│           ↓                                         │
│  Admin Processes Request                            │
│           ↓                                         │
│  [ReadyForPickup] ← Admin Prints Master Set         │
│           ↓                                         │
│  Teacher Picks Up Xeroxed Copies                    │
│           ↓                                         │
│    [Completed]                                      │
│                                                     │
│  Alternative: [Rejected] ← Admin Denies Request     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Technical Notes

### TestId Type
- Tests table uses `int` primary key (NOT Guid)
- PrintRequest.TestId is `int` to match FK relationship
- Other entities (Users, PrintRequests) use `Guid` PKs

### Property Name Conventions
- Question.Content (NOT QuestionText)
- Topic.Title (NOT Name)
- Option.DisplayOrder (NOT OptionOrder)
- Question.Points (source of truth for points, NOT TestQuestion.Points)

### Duplicate Prevention
```csharp
var existingRequest = await dbContext.PrintRequests
    .Where(pr => pr.TestId == request.TestId 
              && pr.RequestedByUserId == userId 
              && pr.Status == "Pending")
    .FirstOrDefaultAsync();

if (existingRequest != null)
    return Results.Conflict("A pending print request already exists for this test.");
```

### Navigation Property Includes
```csharp
.Include(pr => pr.Test)
    .ThenInclude(t => t.Subject)
.Include(pr => pr.Test)
    .ThenInclude(t => t.Course)
.Include(pr => pr.Test)
    .ThenInclude(t => t.Department)
.Include(pr => pr.Test)
    .ThenInclude(t => t.TestQuestions)
        .ThenInclude(tq => tq.Question)
            .ThenInclude(q => q.Topic)
.Include(pr => pr.Test)
    .ThenInclude(t => t.TestQuestions)
        .ThenInclude(tq => tq.Question)
            .ThenInclude(q => q.Options)
```

## Future Enhancements

### 1. Notification System
- Real-time status updates via SignalR
- Email notifications when status changes
- Push notifications for mobile app

### 2. Print Analytics
- Requests per department dashboard
- Average processing time metrics
- Most requested exams report
- Admin workload statistics

### 3. Bulk Operations
- Batch print multiple requests
- Bulk status updates
- Export queue to CSV

### 4. Request Scheduling
- Schedule print requests for future dates
- Recurring print jobs
- Priority queuing system

### 5. Enhanced Notes
- Rich text editor for notes
- Attachment support (special instructions PDFs)
- Comment thread between teacher and admin

### 6. Print History
- Archive completed requests
- Date range filtering
- Search by teacher/department/test title

## Troubleshooting

### Issue: "Please save the exam before requesting to print"
**Cause:** Exam not saved to database  
**Solution:** Click "Save Exam" button before requesting print

### Issue: Duplicate request error
**Cause:** Pending request already exists for same test  
**Solution:** Check "My Print Requests" and wait for status update, or contact admin

### Issue: Print button opens empty page
**Cause:** Browser print CSS not loading  
**Solution:** Hard refresh (Ctrl+Shift+R), check browser compatibility (Chrome/Edge recommended)

### Issue: Admin doesn't see request in queue
**Cause:** Department mismatch or status filter  
**Solution:** Verify test has DepartmentId, check "All Departments" filter in admin queue

### Issue: Print output colors don't convert to black/white
**Cause:** Browser not applying @media print styles  
**Solution:** Use "Print to PDF" first, verify CSS loaded, check printer settings for grayscale

## Related Documentation

- [Multi-Department Access System](./multi-department-access-system.md)
- [Generated Exam Save Flow](./generated-exam-save-flow.md)
- Database Schema: See migrations folder
- API Reference: See `src/Features/PrintRequests/` folder

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review API endpoint logs (Admin Dashboard → Data Entry → Logs)
3. Verify database migration applied: `dotnet ef migrations list`
4. Check browser console for JavaScript errors

---

**Last Updated:** March 7, 2026  
**Author:** Development Team  
**System Version:** v3.0 - Print Request Workflow
