# Print System Documentation

## Overview

The **Print Request System** enables teachers to submit controlled print requests for exam materials, while admins process and manage these requests in a queue-based workflow. This system follows a **POS/Kitchen model** where teachers initiate requests (like POS terminals) and admins fulfill them (like kitchen staff).

**Key Principle:** Teachers cannot directly print exams; they must submit print requests that admins review and process.

---

## User Workflows

### 👨‍🏫 Teacher Workflow

1. **Generate Exam** → Create exam using Test Generation page
2. **Save Exam** → Store exam in database
3. **Submit Print Request** → Request master set (TOS, Exam Paper, Answer Key)
4. **Track Status** → Monitor request progress (Pending → Ready for Pickup → Completed)

#### Print Request Dialog
- **Location:** Test Generation page, "Print" button
- **Fields:**
  - Notes (optional) - e.g., "Please print 30 copies for Section A"
  - Copies Requested - defaults to 1 (master set)
  - Print Option - "Specification" (TOS) or "Exam" (questions + answers)

#### My Requests View
- **Location:** Dashboard or dedicated requests page
- **Shows:** All print requests submitted by current user
- **Statuses:** Pending, ReadyForPickup, Completed, Rejected
- **Actions:** View details, resubmit, download if ready

---

### 👨‍💼 Admin Workflow

1. **View Print Queue** → See all pending requests across department(s)
2. **Review Request** → Open master set preview with:
   - Table of Specifications (TOS)
   - Exam paper with questions
   - Answer key
3. **Print Master Set** → Print single copy to physical printer
4. **Update Status** → Mark as "ReadyForPickup" or "Completed"
5. **Add Notes** → Optional notes for teacher (e.g., printed location)

#### Print Requests Queue
- **Location:** Test Generation page, "Print Requests" tab (admins only)
- **Filters:** 
  - Status: Pending, Ready for Pickup, Completed, All
  - Department: Current department or all (depends on permissions)
- **Sort:** By created date (newest first)
- **Actions:**
  - Click to preview master set
  - Update status
  - Add admin notes

---

## Architecture

### Data Model

#### PrintRequest Entity
```csharp
public class PrintRequest
{
    public Guid PrintRequestId { get; set; }           // Unique identifier
    
    public int TestId { get; set; }                     // Reference to exam
    public Test Test { get; set; }                      // Navigation
    
    public Guid RequestedByUserId { get; set; }         // Who requested it
    public User RequestedBy { get; set; }               // Navigation
    
    public int DepartmentId { get; set; }               // Associated department
    public Department Department { get; set; }          // Navigation
    
    public PrintRequestStatus Status { get; set; }      // Pending, ReadyForPickup, Completed, Rejected
    public DateTime CreatedAt { get; set; }             // Request submission time
    public DateTime? ProcessedAt { get; set; }          // When admin processed it
    public Guid? ProcessedByUserId { get; set; }        // Which admin processed it
    
    public string? Notes { get; set; }                  // Teacher request notes + admin response
    public int CopiesRequested { get; set; }            // Number of master sets requested
    public bool IsDraftRequest { get; set; }            // Is this a draft exam print?
    public string? ExamSnapshotJson { get; set; }       // Snapshot of exam at request time
}

public enum PrintRequestStatus
{
    Pending = 0,                  // Waiting for admin action
    ReadyForPickup = 1,           // Admin printed, ready for teacher pickup
    Completed = 2,                // Teacher picked up materials
    Rejected = 3                  // Admin rejected request with notes
}
```

#### Database Configuration
**Location:** `src/Configuration/PrintRequestConfiguration.cs`

**Indexes (for performance):**
- Status (query pending requests)
- DepartmentId (department-scoped filtering)
- RequestedByUserId (user request history)
- CreatedAt (chronological ordering)
- ProcessedByUserId (admin audit trail)
- TestId (test lookup)

**Foreign Key Relationships:**
| Relationship | Behavior | Reason |
|---|---|---|
| Test (TestId) | Cascade Delete | If test deleted, requests should be removed |
| User (RequestedByUserId) | Restrict Delete | Preserve audit trail of who requested |
| User (ProcessedByUserId) | Restrict Delete | Preserve audit trail of who processed |
| Department (DepartmentId) | Restrict Delete | Maintain referential integrity |

---

## Frontend Implementation

### Components

#### Print Request Modal
**Location:** `client/src/pages/TestGeneration.jsx`

```jsx
{/* Print Request Dialog */}
<PrintRequestModal
  isOpen={showPrintRequestModal}
  onClose={() => setShowPrintRequestModal(false)}
  onSubmit={handleSubmitPrintRequest}
  examTitle={currentExamTitle}
  printOption={printOption}
/>
```

**Fields:**
- Exam title (read-only)
- Print option selector (specification/exam)
- Notes textarea
- Copies input
- Submit button (triggers API call)

#### Request Queue View (Admin)
**Location:** `client/src/pages/TestGeneration.jsx` → Print Requests Tab

```jsx
// Admin view of pending requests
{viewMode === 'printrequests' && isAdmin && (
  <PrintRequestsQueue
    requests={printRequests}
    onSelect={loadPrintRequest}
    onStatusChange={handleStatusUpdate}
  />
)}
```

#### Master Set Preview
**Location:** `client/src/components/MasterSetPreview.jsx` (or inline in TestGeneration)

Shows three sections:
1. **Table of Specifications** - Topic breakdown with Bloom's levels
2. **Exam Paper** - All questions with choices
3. **Answer Key** - Correct answers listed

---

### API Integration

#### Frontend API Service
**Location:** `client/src/services/api.js`

```javascript
apiService.submitPrintRequest(testOrPayload, notes, copiesRequested)
apiService.getMyPrintRequests()
apiService.getPendingPrintRequests()  // Admin only
apiService.getPrintRequestsByDepartment(departmentId)
apiService.updatePrintRequestStatus(printRequestId, status, notes)
apiService.getMasterSet(printRequestId)
```

---

## Backend API Endpoints

### 1. Submit Print Request
**Endpoint:** `POST /api/printrequests`  
**Auth:** Authenticated users  
**Access:** All users  

**Request Body:**
```json
{
  "testId": 123,                    // Optional: saved exam ID
  "examData": {                     // Optional: draft exam data
    "departmentId": 1,
    "courseId": 5,
    "subjectId": 10,
    "questions": [...],
    "specifications": {...}
  },
  "notes": "Print 30 copies for Section A",
  "copiesRequested": 1,
  "isDraft": false                  // true if examData provided
}
```

**Response (201 Created):**
```json
{
  "printRequestId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "Pending",
  "testId": 123,
  "wasUpdated": false,              // true if duplicate request was updated
  "isDraft": false
}
```

**Business Logic:**
- Validates user identity from JWT claims
- Accepts either saved test ID or draft exam data
- Checks for duplicate pending request (same user + test)
- If duplicate exists: updates notes, copies, snapshot and returns 200
- If new: creates record with Pending status and returns 201
- Captures exam snapshot (JSON) for historical record

**Error Cases:**
| Status | Scenario |
|---|---|
| 400 | CopiesRequested ≤ 0, missing testId/examData, invalid exam data |
| 401 | User not authenticated |
| 404 | Test ID not found |
| 409 | Test not associated with department |

---

### 2. Get Pending Print Requests (Admin)
**Endpoint:** `GET /api/printrequests/pending`  
**Auth:** Authenticated users  
**Access:** Admins only  

**Response (200 OK):**
```json
[
  {
    "printRequestId": "550e8400-...",
    "testId": 123,
    "requestedByUserId": "UUID",
    "requestedByName": "John Doe",
    "departmentId": 1,
    "departmentName": "Computer Science",
    "status": "Pending",
    "createdAt": "2026-03-21T10:30:00Z",
    "processedAt": null,
    "notes": "Print 30 copies for Section A",
    "copiesRequested": 1
  }
]
```

**Business Logic:**
- Returns all requests with Status = Pending
- Ordered by CreatedAt ascending (oldest requests first = FIFO queue)
- Includes related Test, User, Department info
- Only returns requests from user's accessible departments

---

### 3. Get My Print Requests
**Endpoint:** `GET /api/printrequests/my-requests`  
**Auth:** Authenticated users  
**Access:** All users (themselves)  

**Response (200 OK):**
```json
[
  {
    "printRequestId": "...",
    "testId": 123,
    "status": "ReadyForPickup",
    "createdAt": "2026-03-20T14:00:00Z",
    "processedAt": "2026-03-21T09:00:00Z",
    "notes": "Ready in admin office, cabinet 2"
  }
]
```

**Business Logic:**
- Returns all requests submitted by current user
- All statuses included (Pending, Ready, Completed, Rejected)
- Ordered by CreatedAt descending (newest first)

---

### 4. Get Department Print Requests
**Endpoint:** `GET /api/printrequests/department/{departmentId}`  
**Auth:** Authenticated users  
**Access:** Department members  

**Response (200 OK):** Same structure as pending requests

**Business Logic:**
- Filters by DepartmentId
- Department-scoped access control
- All statuses included
- Ordered by CreatedAt descending

---

### 5. Get Master Set Preview
**Endpoint:** `GET /api/printrequests/{id:guid}/masterset`  
**Auth:** Authenticated users  
**Access:** Admins (or request originator for their own requests)  

**Response (200 OK):**
```json
{
  "testInfo": {
    "id": 123,
    "title": "Midterm Exam - Data Structures",
    "description": "...",
    "subject": "Computer Science",
    "course": "CS 201",
    "department": "Engineering",
    "examType": "Midterm",
    "semester": "2nd",
    "schoolYear": "2025-2026",
    "setLabel": "Set A",
    "durationMinutes": 120,
    "totalQuestions": 50,
    "totalPoints": 100,
    "specificationSnapshot": "..."  // TOS data
  },
  "questions": [
    {
      "id": 1,
      "topicId": 5,
      "topicName": "Arrays",
      "bloomLevel": "Remembering",
      "content": "What is the time complexity of binary search?",
      "choices": ["O(1)", "O(log n)", "O(n)", "O(n²)"],
      "correctAnswer": "B",
      "placement": 1
    }
  ],
  "totalQuestions": 50,
  "specificationData": {...}  // Full spec breakdown
}
```

**Business Logic:**
- Retrieves print request with all related data
- If ExamSnapshotJson exists: deserializes and returns snapshot (historical record)
- If snapshot missing: reconstructs from current test data
- Includes TOS, all questions, answer key info
- Returns enough data for three-part print (spec, exam, answers)

**Error Cases:**
| Status | Scenario |
|---|---|
| 404 | Print request not found |
| 403 | User not authorized to view this request |

---

### 6. Update Print Request Status (Admin)
**Endpoint:** `PUT /api/printrequests/{id}/status`  
**Auth:** Authenticated users  
**Access:** Admins only  

**Request Body:**
```json
{
  "status": "ReadyForPickup",      // Pending, ReadyForPickup, Completed, Rejected
  "notes": "Master set printed and ready in admin office"
}
```

**Response (200 OK):**
```json
{
  "printRequestId": "...",
  "status": "ReadyForPickup",
  "processedAt": "2026-03-21T11:00:00Z",
  "processedByUserId": "admin-uuid",
  "notes": "Original note. [ADMIN: Printed by John - ready in cabinet 2]"
}
```

**Business Logic:**
- Validates status enum value
- Sets ProcessedAt to current UTC time
- Sets ProcessedByUserId to current admin
- Appends new notes to existing notes with "[ADMIN: ...]" prefix
- Updates database record
- Logs activity to ActivityLog

**Error Cases:**
| Status | Scenario |
|---|---|
| 400 | Invalid status value |
| 403 | User not admin |
| 404 | Print request not found |

---

## Print Process Flow

### Sequence Diagram

```
Teacher                          Frontend                Backend              Database
  |                                 |                        |                    |
  |-- (1) Generate Exam ---------->|                        |                    |
  |                                 |-- (2) Save Test ------>|-- (3) Store ----->|
  |                                 |<-- Test ID ------------|                    |
  |-- (4) Click "Print" ---------->|                        |                    |
  |                                 |-- (5) Submit Request -->|-- (6) Check ---->>|
  |                                 |<-- Confirmation -------|                    |
  |-- (7) See "Pending" ---------->|                        |                    |
  |  status in My Requests         |                        |                    |
  |                                 |                        |                    |
  |                [Admin Processing Begins]               |                    |
  |                                 |                        |                    |
  |                              Admin                       |                    |
  |                              clicks                      |                    |
  |                         "Print Requests"                |                    |
  |                                 |-- (8) Get Pending ---->|-- (9) Query ----->|
  |                                 |<-- Request List -------|                    |
  |                                 |                        |                    |
  |                              Admin                       |                    |
  |                              clicks                      |                    |
  |                              request                     |                    |
  |                                 |-- (10) Get MasterSet ->|-- (11) Get Data ->|
  |                                 |<-- Full Preview -------|                    |
  |                                 |                        |                    |
  |                              Admin                       |                    |
  |                              presses                     |                    |
  |                              Ctrl+P                      |                    |
  |                                 |                        |                    |
  |                              Admin                       |                    |
  |                              clicks                      |                    |
  |                         "Ready for Pickup"              |                    |
  |                                 |-- (12) Update Status ->|-- (13) Update -->|
  |                                 |<-- Confirmation -------|                    |
  |                                 |                        |                    |
  |                              Teacher                     |                    |
  |                              checks                      |                    |
  |                         "My Requests"                    |                    |
  |                                 |-- (14) Get My Req. --->|-- (15) Query --->>|
  |                                 |<-- Status=Ready -------|                    |
  |-- (16) See "Ready for ------->|                        |                    |
  |  Pickup" with admin notes      |                        |                    |
  |-- (17) Goes to pick up ------->|                        |                    |
  |  physical materials
```

---

## Status Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                   PRINT REQUEST LIFECYCLE                        │
└─────────────────────────────────────────────────────────────────┘

   ┌──────────┐
   │ Teacher  │
   │ submits  │
   │ request  │
   └─────┬────┘
         │
         ▼
  ╔════════════╗
  ║  PENDING   ║  ← Request in queue, waiting for admin action
  ║            ║    - Shows in admin "Print Requests" view
  ║            ║    - Teacher sees "Pending" status
  ╚────┬───┬──╝
       │   │
       │   └──────┐
       │          │
       ▼          ▼
  ┌─────────┐  ┌──────────┐
  │ REJECTED │  │READY FOR │
  │          │  │ PICKUP   │  ← Admin printed & ready for teacher
  │(Optional)│  │          │    - Shows in teacher "My Requests"
  └─────────┘  │          │    - Teacher can pick up printouts
                ╚────┬─────╝
                     │
                     ▼
                ╔═══════════╗
                ║ COMPLETED ║  ← Teacher picked up materials
                ║           ║    - End of workflow
                ║           ║    - Kept for audit trail
                ╚═══════════╝
```

### Status Transitions

| From | To | Trigger | Who | Notes |
|---|---|---|---|---|
| Pending | ReadyForPickup | Student printed master set | Admin only | Most common path |
| Pending | Completed | Teacher picked up (skip pickup) | Admin | Shortcut transition |
| Pending | Rejected | Request cannot be fulfilled | Admin | Attach reason in notes |
| ReadyForPickup | Completed | Teacher confirms pickup | Admin | Normal completion |
| ReadyForPickup | Pending | Request returned for fix | Admin | Rare; restart workflow |

---

## Frontend Print Dialog

### Print Options

**Specification Print** (TOS)
- Table of Specifications
- Topic hours, Bloom's level distribution
- Question counts per topic/level
- Useful for xerox distribution guide

**Exam Print** (Full Master Set)
- Full exam questions with all options
- Answer key (separate section)
- TOS included
- What admins typically print for physical distribution

### Print Feature Integration

```jsx
// Triggered from Test Generation page
const handlePrintClick = () => {
  setShowPrintModal(true);  // Preview exam
};

const handleRequestPrint = () => {
  setShowPrintRequestModal(true);  // Request workflow
};
```

### Print CSS Optimization

**Location:** `client/src/styles/TestGeneration.css`

```css
/* Print-specific styling */
@media print {
  .no-print { display: none; }
  
  /* Ensure images print */
  .question-image-print {
    max-width: 100%;
    height: auto;
    page-break-inside: avoid;
  }
  
  /* Force exact colors */
  .summary-card {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

---

## Error Handling

### Common Errors & Resolutions

| Error | Cause | Resolution |
|---|---|---|
| "Duplicate pending request for this test" | User submitted same test twice | User edits existing request instead |
| "Test not associated with department" | Test missing DepartmentId | Ensure test is assigned to department |
| "Insufficient permissions" (HTTP 403) | Non-admin trying to view pending queue | Only admins see "Print Requests" tab |
| "Print request not found" (404) | Link to deleted or missing request | Refresh page; request may have expired |
| "Invalid status value" (400) | API received unrecognized status | Check enum values in request |

---

## Best Practices

### For Teachers
✅ **DO:**
- Include clear notes about section/class requirements
- Check "My Requests" status daily
- Pick up immediately when marked "Ready"
- Use "Specification" print for distribution planning

❌ **DON'T:**
- Submit duplicate requests (update existing instead)
- Request more copies than needed (wastes paper)
- Ignore rejection notes from admin

### For Admins
✅ **DO:**
- Process requests in FIFO order (oldest first)
- Preview master set before printing
- Add clear notes about print location/status
- Mark completed promptly (clears queue)

❌ **DON'T:**
- Print without reviewing master set first
- Leave requests in ReadyForPickup for weeks
- Forget to update status (leaves queue confused)

---

## Testing Checklist

- [ ] Teacher can submit print request for saved exam
- [ ] Teacher can submit print request for draft exam
- [ ] Duplicate requests are rejected (returns alert)
- [ ] Admin sees print requests queue
- [ ] Admin can preview master set (all 3 sections render)
- [ ] Admin can print from browser (Ctrl+P works)
- [ ] Admin can update status to ReadyForPickup
- [ ] Teacher sees updated status in My Requests
- [ ] Admin notes include "[ADMIN: ...]" prefix
- [ ] Print request shows in department filter
- [ ] Deleted test cascades to delete print requests
- [ ] Activity log captures print request submission
- [ ] Exam snapshot JSON captures state at request time

---

## Database Schema

### PrintRequests Table

```sql
CREATE TABLE "PrintRequests" (
    "PrintRequestId" UUID PRIMARY KEY,
    "TestId" INT NOT NULL REFERENCES "Tests",
    "RequestedByUserId" UUID NOT NULL REFERENCES "Users" (OnDelete: RESTRICT),
    "DepartmentId" INT NOT NULL REFERENCES "Departments" (OnDelete: RESTRICT),
    "Status" INT NOT NULL,  -- 0=Pending, 1=ReadyForPickup, 2=Completed, 3=Rejected
    "CreatedAt" TIMESTAMP NOT NULL,
    "ProcessedAt" TIMESTAMP NULL,
    "ProcessedByUserId" UUID NULL REFERENCES "Users",
    "Notes" TEXT NULL,
    "CopiesRequested" INT NOT NULL,
    "IsDraftRequest" BOOLEAN NOT NULL,
    "ExamSnapshotJson" TEXT NULL
);

-- Indexes for performance
CREATE INDEX idx_PrintRequests_Status ON "PrintRequests" ("Status");
CREATE INDEX idx_PrintRequests_DepartmentId ON "PrintRequests" ("DepartmentId");
CREATE INDEX idx_PrintRequests_RequestedByUserId ON "PrintRequests" ("RequestedByUserId");
CREATE INDEX idx_PrintRequests_CreatedAt ON "PrintRequests" ("CreatedAt");
CREATE INDEX idx_PrintRequests_ProcessedByUserId ON "PrintRequests" ("ProcessedByUserId");
CREATE INDEX idx_PrintRequests_TestId ON "PrintRequests" ("TestId");
```

---

## Migration Reference

**Created:** March 7, 2026  
**File:** `src/Migrations/20260307133029_AddPrintRequestEntity.cs`  
**Tables:** PrintRequests (new)  
**Indexes:** 6 (see schema above)

---

## Future Enhancements

- [ ] **Batch Printing:** Submit multiple requests to print queue simultaneously
- [ ] **Print Templates:** Admin-defined templates for master set formatting
- [ ] **Print Analytics:** Track printing costs, most-printed courses, peak times
- [ ] **Scheduled Printing:** Request print at specific date/time (e.g., "print tomorrow at 8 AM")
- [ ] **Email Notifications:** Notify teacher when request moves to ReadyForPickup
- [ ] **Print History:** Archive completed requests for audit trail
- [ ] **Digital Delivery:** Option to email master set PDF instead of physical print
- [ ] **Multi-Admin Queue:** Assign print request to specific admin with notification

---

## File Reference

| File | Purpose |
|---|---|
| `src/Entities/PrintRequest.cs` | Data model |
| `src/Configuration/PrintRequestConfiguration.cs` | EF Core configuration |
| `src/Features/PrintRequests/Submit/SubmitPrintRequestEndpoint.cs` | POST endpoint |
| `src/Features/PrintRequests/GetPending/GetPendingPrintRequestsEndpoint.cs` | Pending queue endpoint |
| `src/Features/PrintRequests/GetMyRequests/GetMyPrintRequestsEndpoint.cs` | User requests endpoint |
| `src/Features/PrintRequests/GetByDepartment/GetPrintRequestsByDepartmentEndpoint.cs` | Dept requests endpoint |
| `src/Features/PrintRequests/GetMasterSet/GetMasterSetEndpoint.cs` | Master set preview endpoint |
| `src/Features/PrintRequests/UpdateStatus/UpdatePrintRequestStatusEndpoint.cs` | Status update endpoint |
| `client/src/services/api.js` | Frontend API calls |
| `client/src/pages/TestGeneration.jsx` | Main UI component |
| `client/src/styles/TestGeneration.css` | Print styles |
| `docs/print-request-workflow.md` | Original workflow doc |

---

## Support & Questions

For issues or questions about the print system:
1. Check this README for detailed workflows
2. Review database schema and API endpoints
3. Inspect browser console for client-side errors
4. Check application logs for backend errors
5. Verify user permissions (admin checks for queue access)
