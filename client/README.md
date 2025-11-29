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
- **Signup** (`/signup`) - Temporary account creation page for testing (requires admin token)
- **Welcome** (`/`) - Home page with welcome message, search bar, and college cards

## Notes

- The signup page is for testing only and will not be in the final release
- Creating an account requires admin authentication (use seed-admin endpoint or login as admin first)
- The login endpoint supports both username and email for login

## Development

- Build for production: `npm run build`
- Preview production build: `npm run preview`
- Lint code: `npm run lint`
