# Databank Frontend

React + TypeScript frontend for the Databank Test Management System.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (if not already created):
```
VITE_API_BASE_URL=https://localhost:7088
```

3. Start development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Pages

- **Login** (`/login`) - User login with email and password
- **Welcome** (`/`) - Home page with welcome message, search bar, and college cards
- **Admin Dashboard** (`/admin`) - Administrative interface for user management, department assignment, and system settings
- **Course & Topic Management** (`/course-topic/:departmentCode`) - Manage courses and topics per department
- **Test Encoding** (`/test-encoding/:departmentCode`) - Create and edit test questions
- **Test Generation** (`/test-generation/:departmentCode`) - Generate exams with Table of Specifications
- **Saved Exams Report** (`/reports/saved-exams/:departmentCode`) - View and manage saved exam sets

## Features

### Multi-Department Access
- Users can be assigned access to multiple departments by administrators
- Department switcher allows users to switch between their assigned departments
- URL-based department context (`/page/:departmentCode`) restricts data to selected department
- Admins have access to all departments automatically

### User Management (Admin Only)
- **Account Creation**: Administrators create user accounts manually via the User Management interface
- **Multi-Department Assignment**: Assign users to one or more departments using checkboxes
- **Role Management**: Set admin privileges and active/inactive status
- **Self-Registration Disabled**: Users cannot create their own accounts

## Notes

- All user accounts are created and managed by administrators through the admin dashboard
- Users with multiple department assignments can switch between them using the department switcher
- The login endpoint supports both username and email for authentication
- First-time setup: Use the `/api/users/seed-admin` endpoint to create the initial admin account

## Development

- Build for production: `npm run build`
- Preview production build: `npm run preview`
- Lint code: `npm run lint`
