# Installation and Setup Guide

## Prerequisites

Ensure you have the following installed:
- Node.js v18 or higher
- npm v9 or higher
- Angular CLI (optional but recommended)

### Check Versions

```bash
node --version
npm --version
```

## Installation Steps

### 1. Clone or Navigate to Project

```bash
cd c:\Users\Ahmed\Desktop\Work\TeamsFrontend
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- Angular 19 core packages
- Angular Forms and Router
- PrimeNG UI library
- RxJS reactive library
- TypeScript 5.6

### 3. Configure Backend API

The application is configured to connect to the backend at:
```
http://localhost:8080/api/v1
```

To change this URL, edit:
- `src/app/core/config/api.config.ts`
- `src/environments/environment.ts`

### 4. Start Development Server

```bash
npm start
```

The application will be available at:
```
http://localhost:4200
```

## Backend API Setup

The frontend expects the backend to implement the following endpoints:

### Required Endpoints

#### 1. POST /auth/login
Authenticate user with email and password

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "TestPassword123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "username": "admin"
  },
  "success": true
}
```

#### 2. POST /auth/register
Create a new user account

**Request:**
```json
{
  "email": "testuser222@example.com",
  "password": "TestPassword123!",
  "firstName": "Test",
  "lastName": "User",
  "username": "user22"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "email": "testuser222@example.com",
    "firstName": "Test",
    "lastName": "User",
    "username": "user22"
  },
  "success": true
}
```

#### 3. POST /auth/logout
End user session

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### CORS Configuration

Ensure your backend allows requests from:
- `http://localhost:4200`
- `http://localhost:4300` (if using different port)

Example CORS headers needed:
```
Access-Control-Allow-Origin: http://localhost:4200
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Project Structure

```
TeamsFrontend/
│
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config/          # API and app configuration
│   │   │   ├── guards/          # Route guards
│   │   │   ├── models/          # Core data models
│   │   │   └── services/        # Core services
│   │   │
│   │   ├── shared/
│   │   │   ├── components/      # Reusable components
│   │   │   ├── directives/      # Custom directives
│   │   │   ├── interfaces/      # Shared interfaces
│   │   │   └── pipes/           # Custom pipes
│   │   │
│   │   ├── features/
│   │   │   ├── auth/            # Authentication feature
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   ├── services/
│   │   │   │   └── models/
│   │   │   └── home/            # Home page feature
│   │   │
│   │   ├── app.component.ts     # Root component
│   │   ├── app.config.ts        # App configuration
│   │   └── app.routes.ts        # Routing configuration
│   │
│   ├── environments/            # Environment configurations
│   ├── index.html               # HTML entry point
│   ├── main.ts                  # Angular bootstrapping
│   └── styles.css               # Global styles
│
├── angular.json                 # Angular CLI config
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies
└── README.md                    # Documentation
```

## Common Commands

### Development Server

```bash
npm start
```

### Build for Production

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Watch Mode (rebuild on changes)

```bash
npm run watch
```

### Lint Code

```bash
npm run lint
```

## Environment Variables

Create a `.env` file in the root directory (optional):

```
API_URL=http://localhost:8080/api/v1
LOG_LEVEL=debug
```

Then import in `src/main.ts`:

```typescript
import 'dotenv/config';
```

## Troubleshooting

### Issue: "Cannot find module '@angular/core'"

**Solution:** Run `npm install` to install all dependencies.

### Issue: "Port 4200 is already in use"

**Solution:** Either close the app using port 4200 or use a different port:
```bash
ng serve --port 4300
```

### Issue: "CORS error from backend"

**Solution:** 
1. Verify backend is running
2. Check backend CORS configuration
3. Ensure correct API URL in `api.config.ts`

### Issue: "Authentication always fails"

**Solution:**
1. Verify backend API is running on `http://localhost:8080`
2. Check the request/response format matches documentation
3. Check browser console for detailed error messages

### Issue: "Cannot resolve path '@core/...' or '@features/...'"

**Solution:** The path aliases are configured in `tsconfig.json`. If not working:
1. Rebuild the project: `ng build`
2. Restart the dev server: `npm start`

## Performance Optimization

### Bundle Analysis

```bash
ng build --configuration production --stats-json
webpack-bundle-analyzer dist/teams-frontend/stats.json
```

### Lazy Loading

Routes are already configured with lazy loading:

```typescript
{
  path: 'home',
  loadComponent: () =>
    import('@features/home/home.component').then(m => m.HomeComponent),
  canActivate: [authGuardFn]
}
```

## Production Build

### Create Production Build

```bash
npm run build
```

### Serve Production Build Locally

```bash
npx http-server dist/teams-frontend
```

### Deploy to Server

The `dist/teams-frontend` folder contains all files needed for deployment:

1. Upload to hosting service (Netlify, Vercel, AWS S3, etc.)
2. Configure routing to point all routes to `index.html`
3. Set environment variables appropriately

## Security Considerations

1. **Never commit sensitive data** - Keep `.env` files in `.gitignore`
2. **Use HTTPS in production** - Ensure API and frontend use HTTPS
3. **JWT Token Storage** - Currently stored in localStorage (consider alternatives)
4. **CORS** - Configure backend CORS properly
5. **Input Validation** - All forms validate input on client and server
6. **XSS Protection** - Angular's built-in sanitization prevents XSS
7. **CSRF Protection** - Consider implementing CSRF tokens for POST requests

## Next Steps

### Extend the Application

1. **Add User Profile** - Manage user settings and information
2. **Implement JWT Interceptor** - Auto-attach token to API requests
3. **Add Error Interceptor** - Handle API errors globally
4. **Use NgRx** - For complex state management
5. **Add Form Services** - Centralize form logic
6. **Create Shared Components** - Reusable form components, modals, etc.
7. **Add Notifications** - Toast or notification system
8. **Implement Search** - Global search functionality
9. **Add Dashboard** - Analytics and statistics
10. **Multi-language Support** - i18n internationalization

## Support and Documentation

- [Angular Documentation](https://angular.io/docs)
- [PrimeNG Documentation](https://primeng.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [RxJS Documentation](https://rxjs.dev/)

## Version Information

- Angular: 19.0.0
- TypeScript: 5.6.0
- PrimeNG: 17.0.0
- Node: v18+
- npm: v9+

---

**Last Updated:** June 2026
