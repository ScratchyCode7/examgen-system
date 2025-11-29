# Databank Frontend

React + TypeScript frontend for the Databank Test Management System.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Backend API running (see main README)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure API URL:
Create a `.env` file in the `client` directory:
```
VITE_API_BASE_URL=https://localhost:5001
```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in terminal).

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## 📁 Project Structure

```
client/
├── src/
│   ├── components/     # Reusable components
│   ├── contexts/       # React contexts (Auth, etc.)
│   ├── pages/          # Page components
│   ├── services/       # API service layer
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Main app component with routing
│   └── main.tsx        # Entry point
├── public/             # Static assets
└── package.json
```

## 🔑 Features

- **Authentication**: Login with JWT token management
- **Protected Routes**: Route protection based on authentication and admin status
- **API Integration**: Complete API service layer for all backend endpoints
- **Type Safety**: Full TypeScript support with type definitions matching backend

## 🛠️ Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
