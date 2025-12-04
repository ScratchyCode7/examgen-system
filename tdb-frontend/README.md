# Test Databank Frontend

React frontend application for the Test Databank System, built with Create React App.

## Features

- 🔐 **Authentication**: Login with username/email and password
- 👤 **User Management**: Admin and regular user dashboards
- 📊 **Dashboard**: View programs and courses
- 📝 **Data Entry**: Course and topic management
- 🌓 **Dark Mode**: Toggle between light and dark themes
- 🛡️ **Protected Routes**: Route protection based on authentication and admin status

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend API running on `http://localhost:5012`

## Installation

1. Install dependencies:
```bash
npm install
```

## Configuration

The API base URL is configured in `.env`:
```
REACT_APP_API_BASE_URL=http://localhost:5012
```

To change the backend URL, update this file.

## Running the Application

### Development Mode

```bash
npm start
```

This will start the development server on [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Project Structure

```
tdb-frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── DropdownNavItem.jsx
│   │   ├── LogoutModal.jsx
│   │   ├── NavItem.jsx
│   │   ├── PasswordInput.jsx
│   │   └── ProtectedRoute.jsx
│   ├── contexts/            # React Context providers
│   │   └── AuthContext.js   # Authentication state management
│   ├── pages/               # Page components
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── DashboardAdmin.jsx
│   │   └── CourseTopic.jsx
│   ├── services/            # API services
│   │   └── api.js           # Axios client and API methods
│   ├── styles/              # CSS stylesheets
│   ├── assets/              # Images and static assets
│   ├── App.js               # Main app component with routing
│   └── index.js             # Entry point
├── public/                  # Public static files
└── package.json
```

## Authentication

The app uses JWT (JSON Web Tokens) for authentication. After successful login:

1. Token is stored in `localStorage`
2. Token is automatically included in API requests via Axios interceptor
3. User data (including admin status) is decoded from the JWT token
4. Protected routes check authentication and admin status

### Login Credentials

**Admin User:**
- Username: `admin`
- Password: `Admin123!`

**Regular Users:**
- Create via admin user management or seed endpoint

## Routes

- `/login` - Login page (redirects to dashboard if already authenticated)
- `/` - Regular user dashboard
- `/admin` - Admin dashboard (requires admin privileges)
- `/course-topic` - Course & Topic management page

## API Integration

The frontend communicates with the backend API at `http://localhost:5012`. All API calls are made through the `api.js` service file, which:

- Configures Axios with base URL
- Adds JWT token to requests automatically
- Handles 401 errors by redirecting to login
- Uses camelCase for JSON (matches backend configuration)

## Features Overview

### Login Page
- Username/Email input (accepts both)
- Password input with show/hide toggle
- Error message display
- Automatic redirect after successful login

### Dashboard Pages
- **Regular Dashboard**: Shows user's programs (limited view)
- **Admin Dashboard**: Shows all programs with expanded access
- Search functionality
- Grid/List view toggle
- Dark mode toggle
- User menu with logout

### Course Topic Page
- Course and topic management form
- Topic history table
- Same navigation as dashboard

## Development Notes

### Adding New Routes

1. Create a new page component in `src/pages/`
2. Add route to `src/App.js`:
```jsx
<Route
  path="/your-route"
  element={
    <ProtectedRoute>
      <YourPage />
    </ProtectedRoute>
  }
/>
```

### Adding API Endpoints

Add new methods to `src/services/api.js`:
```javascript
yourMethod: async (params) => {
  const response = await apiClient.get('/api/your-endpoint', { params });
  return response.data;
}
```

### Using Authentication

Import and use the auth context:
```javascript
import { useAuth } from '../contexts/AuthContext';

const YourComponent = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  // ...
}
```

## Troubleshooting

### Cannot connect to backend
- Verify backend is running on `http://localhost:5012`
- Check `.env` file has correct `REACT_APP_API_BASE_URL`
- Check browser console for CORS errors

### Login not working
- Verify backend is running and accessible
- Check that credentials are correct
- Check browser console for error messages
- Verify JWT token is being stored in localStorage

### Build errors
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Check Node.js version (should be 14+)

## Dependencies

- **react** ^18.2.0 - UI library
- **react-dom** ^18.2.0 - React DOM renderer
- **react-router-dom** - Client-side routing
- **axios** - HTTP client for API calls
- **lucide-react** ^0.259.0 - Icon library

## License

Private project - All rights reserved
