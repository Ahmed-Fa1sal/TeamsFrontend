# Teams Frontend Application

A modern, enterprise-grade Angular application featuring authentication, routing, and PrimeNG UI components.

## Features

- **Standalone Components**: Angular 19 standalone components architecture
- **Authentication**: Login and registration with local state management
- **Reactive Forms**: Robust form validation with Reactive Forms API
- **PrimeNG Integration**: Professional UI components from PrimeNG
- **Responsive Design**: Mobile-friendly interface
- **Type Safety**: Full TypeScript support with strict mode
- **Scalable Architecture**: Enterprise-ready folder structure

## Architecture

The application follows a scalable, feature-based folder structure:

```
src/app/
├── core/
│   ├── config/          # API configuration and constants
│   ├── guards/          # Route guards (auth guard)
│   ├── models/          # Shared models and interfaces
│   └── services/        # Core services
│
├── shared/
│   ├── components/      # Shared components
│   ├── directives/      # Custom directives
│   ├── interfaces/      # Shared interfaces
│   └── pipes/           # Custom pipes
│
├── features/
│   ├── auth/            # Authentication feature
│   │   ├── login/
│   │   ├── register/
│   │   ├── services/
│   │   └── models/
│   └── home/            # Home page feature
│
└── app.routes.ts        # Application routing
```

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Ensure backend API is running** at `http://localhost:8080/api/v1`

## Development

Start the development server:

```bash
npm start
```

The application will be available at `http://localhost:4200`

## Build

Build the application for production:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## API Configuration

The API endpoints are configured in [src/app/core/config/api.config.ts](src/app/core/config/api.config.ts):

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8080/api/v1',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout'
    }
  }
};
```

### Backend API Requirements

The backend should implement the following endpoints:

#### POST /auth/login
Request body:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe"
  },
  "success": true
}
```

#### POST /auth/register
Request body:
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe"
}
```

Response: Same as login endpoint

#### POST /auth/logout
Request body: `{}`

Response:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Key Components

### Authentication Service
[src/app/features/auth/services/auth.service.ts](src/app/features/auth/services/auth.service.ts)

Manages authentication state and API calls:
- `login(credentials)` - Authenticate user
- `register(data)` - Create new user account
- `logout()` - End user session
- `isAuthenticated()` - Check auth status
- `getCurrentUser()` - Get logged-in user info
- `getToken()` - Get auth token

### Auth Guard
[src/app/core/guards/auth.guard.ts](src/app/core/guards/auth.guard.ts)

Protects routes requiring authentication.

### Components

#### Login Component
[src/app/features/auth/login/login.component.ts](src/app/features/auth/login/login.component.ts)

- Email and password validation
- Error handling
- Link to registration page
- Redirect if already authenticated

#### Register Component
[src/app/features/auth/register/register.component.ts](src/app/features/auth/register/register.component.ts)

- All required fields with validation
- Password strength validation (uppercase, lowercase, number)
- Error handling
- Link to login page

#### Home Component
[src/app/features/home/home.component.ts](src/app/features/home/home.component.ts)

- Welcome message with user name
- Display user information
- Logout functionality
- Protected route (requires authentication)

## Routing

Routes are configured in [src/app/app.routes.ts](src/app/app.routes.ts):

| Route | Component | Protected | Description |
|-------|-----------|-----------|-------------|
| `/` | - | No | Redirects to `/login` |
| `/login` | LoginComponent | No | User login page |
| `/register` | RegisterComponent | No | User registration page |
| `/home` | HomeComponent | Yes | Home page (requires auth) |
| `**` | - | No | Catches all unmatched routes, redirects to `/login` |

## State Management

Authentication state is managed using:

- **RxJS BehaviorSubject**: Real-time state updates
- **Local Storage**: Persistent session storage
- **Observable Patterns**: Clean reactive architecture

The authentication service can be extended with:
- NgRx for complex state management
- JWT interceptors for automatic token handling
- Refresh token mechanism

## Future Extensions

### 1. JWT Interceptor
Add automatic JWT token attachment to API requests:

```typescript
// src/app/core/interceptors/jwt.interceptor.ts
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  
  return next(req);
};
```

### 2. Error Interceptor
Handle common API errors globally:

```typescript
// src/app/core/interceptors/error.interceptor.ts
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        // Handle unauthorized
      }
      return throwError(() => error);
    })
  );
};
```

### 3. NgRx Store
For larger applications, implement NgRx:

```typescript
// src/app/store/auth/auth.actions.ts
// src/app/store/auth/auth.reducer.ts
// src/app/store/auth/auth.effects.ts
```

### 4. Additional Features
- User profile management
- Role-based access control (RBAC)
- Token refresh mechanism
- Remember me functionality
- Social authentication

## UI Components (PrimeNG)

The application uses PrimeNG components:

- **ButtonModule** - Action buttons
- **InputTextModule** - Text input fields
- **CardModule** - Content containers
- **MessagesModule** - Error/success notifications

PrimeNG theme: Lara Light Blue (configurable in [angular.json](angular.json))

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow Angular style guide
- Use meaningful variable and function names
- Add JSDoc comments for public methods

### Component Design
- Keep components focused and single-purpose
- Use dependency injection
- Implement OnDestroy to unsubscribe from observables
- Use async pipe in templates when possible

### Forms
- Use Reactive Forms for complex validation
- Create custom validators for business logic
- Display clear error messages to users

### Security
- Never store sensitive data in local storage (except non-sensitive tokens)
- Always validate user input
- Use HTTPS in production
- Implement proper CORS configuration
- Consider implementing rate limiting

## Testing

To run tests:

```bash
npm test
```

## Troubleshooting

### Port 4200 already in use
```bash
ng serve --port 4300
```

### CORS errors
Ensure the backend API has proper CORS configuration for `http://localhost:4200`

### Authentication failing
- Verify backend API is running on `http://localhost:8080`
- Check API response format matches expected structure
- Verify credentials are correct

## License

This project is proprietary and confidential.

## Support

For issues or questions, please contact the development team.

---

**Last Updated**: June 2026
