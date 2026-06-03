# Project Files Reference

## Overview

This document provides a complete reference of all files created in the project, their purposes, and key functionalities.

## Configuration Files

### `package.json`
**Purpose**: NPM package configuration and dependencies

**Key Dependencies**:
- `@angular/core` - Angular framework
- `@angular/forms` - Reactive Forms
- `@angular/router` - Routing
- `primeng` - UI component library
- `rxjs` - Reactive programming

**Scripts**:
- `npm start` - Start dev server
- `npm run build` - Production build
- `npm test` - Run tests

### `tsconfig.json`
**Purpose**: TypeScript compiler configuration

**Key Settings**:
- `strict: true` - Enable strict type checking
- Path aliases for imports:
  - `@app/*` → `src/app/*`
  - `@core/*` → `src/app/core/*`
  - `@shared/*` → `src/app/shared/*`
  - `@features/*` → `src/app/features/*`

### `angular.json`
**Purpose**: Angular CLI configuration

**Configuration**:
- Build settings and asset inclusion
- PrimeNG theme integration (Lara Light Blue)
- Development and production configurations
- Polyfills and source maps

### `.gitignore`
**Purpose**: Specify files to ignore in Git

**Ignores**:
- `node_modules/` - Dependencies
- `dist/` - Build output
- `.angular/` - Cache
- Environment files
- IDE files

---

## Source Files

### Entry Point

#### `src/main.ts`
**Purpose**: Application bootstrap entry point

**Functionality**:
- Bootstraps the AppComponent
- Applies application configuration
- Handles initialization errors

#### `src/index.html`
**Purpose**: HTML entry point

**Contains**:
- Metadata and viewport settings
- `<app-root>` mounting point
- PrimeNG theme CSS links

#### `src/styles.css`
**Purpose**: Global application styles

**Includes**:
- CSS reset and normalization
- Global utility classes (.w-full, .mb-*, .p-*)
- PrimeNG customizations
- Accessibility styles
- Animations (fadeIn, slideInUp)

---

### Core Application Files

#### `src/app/app.component.ts`
**Purpose**: Root application component

**Properties**:
- Standalone: true
- Imports: RouterOutlet
- Contains router-outlet for page navigation

#### `src/app/app.config.ts`
**Purpose**: Application-wide configuration

**Providers**:
- `provideRouter()` - Route configuration
- `provideAnimations()` - Angular animations
- `provideHttpClient()` - HTTP client setup

#### `src/app/app.routes.ts`
**Purpose**: Application routing configuration

**Routes**:
- `/` → redirects to `/login`
- `/login` → LoginComponent (lazy loaded)
- `/register` → RegisterComponent (lazy loaded)
- `/home` → HomeComponent (lazy loaded, protected)
- `**` → redirects to `/login` (catch-all)

---

### Core Module

#### `src/app/core/config/api.config.ts`
**Purpose**: Centralized API configuration

**Exports**:
- `API_CONFIG` - Base URL and endpoints object
- `getApiUrl()` - Helper function to construct full URLs

**Configuration**:
```typescript
BASE_URL: 'http://localhost:8080/api/v1'
ENDPOINTS:
  AUTH:
    LOGIN: '/auth/login'
    REGISTER: '/auth/register'
    LOGOUT: '/auth/logout'
```

#### `src/app/core/guards/auth.guard.ts`
**Purpose**: Route protection guard

**Export**:
- `authGuardFn` - Functional guard for protected routes

**Logic**:
- Checks if user is authenticated
- Redirects to login if not
- Passes returnUrl as query parameter

#### `src/app/core/models/` (Empty - for future expansion)
**Purpose**: Placeholder for core models and types

---

### Shared Module

#### `src/app/shared/interfaces/common.interfaces.ts`
**Purpose**: Common interfaces used across app

**Interfaces**:
- `ApiResponse<T>` - Generic API response wrapper
- `PaginatedResponse<T>` - Paginated data response
- `ErrorResponse` - Error response format

#### `src/app/shared/components/` (Empty - for future expansion)
**Purpose**: Placeholder for reusable components

#### `src/app/shared/directives/` (Empty - for future expansion)
**Purpose**: Placeholder for custom directives

#### `src/app/shared/pipes/` (Empty - for future expansion)
**Purpose**: Placeholder for custom pipes

---

### Features Module - Authentication

#### `src/app/features/auth/models/auth.models.ts`
**Purpose**: Authentication data models

**Exports**:
- `LoginRequest` - Login form data
- `RegisterRequest` - Registration form data
- `AuthResponse` - Server response after auth
- `User` - User data model
- `AuthState` - Complete auth state object

#### `src/app/features/auth/services/auth.service.ts`
**Purpose**: Authentication business logic service

**Methods**:
- `login(credentials)` - Authenticate user
- `register(data)` - Create new account
- `logout()` - End session
- `isAuthenticated()` - Check auth status
- `getCurrentUser()` - Get logged-in user
- `getToken()` - Get auth token
- `getAuthState()` - Get state as observable

**Features**:
- RxJS BehaviorSubject for state management
- Local storage persistence
- Error handling
- Observable stream API

#### `src/app/features/auth/login/login.component.ts`
**Purpose**: User login page

**Features**:
- Email and password input fields
- Form validation with error messages
- Loading state during submission
- Error message display
- Link to registration page
- Auto-redirect if already logged in
- Unsubscribe on component destroy

**PrimeNG Components Used**:
- pButton
- pInputText
- pCard
- pMessages

**Styling**: Gradient background with centered card

#### `src/app/features/auth/register/register.component.ts`
**Purpose**: User registration page

**Features**:
- All required registration fields
- Complex password validation (uppercase, lowercase, number)
- Form validation with specific error messages
- Loading state during submission
- Error message display
- Link to login page
- Responsive design

**Validation**:
- firstName: required
- lastName: required
- username: required, min 3 chars
- email: required, valid email format
- password: required, min 8 chars, custom validation

#### `src/app/features/auth/services/` (Ready for expansion)
**Purpose**: Additional auth services

---

### Features Module - Home

#### `src/app/features/home/home.component.ts`
**Purpose**: Home page after successful login

**Features**:
- Welcome message with user name
- User information display (name, username, email)
- List of available features
- Logout button
- Success message after logout
- Auto-redirect to login if not authenticated
- Protected route (requires auth)

**Information Displayed**:
- User's first and last name
- Username
- Email address

---

### Environment Configuration

#### `src/environments/environment.ts`
**Purpose**: Development environment settings

**Configuration**:
- `production: false`
- `apiUrl: 'http://localhost:8080/api/v1'`
- `logLevel: 'debug'`

#### `src/environments/environment.prod.ts`
**Purpose**: Production environment settings

**Configuration**:
- `production: true`
- `apiUrl: 'https://api.production.com/api/v1'` (example)
- `logLevel: 'error'`

---

### Documentation Files

#### `README.md`
**Purpose**: Main project documentation

**Sections**:
- Features overview
- Architecture explanation
- Prerequisites and installation
- Development and build commands
- API configuration and requirements
- Component descriptions
- Routing overview
- State management approach
- Future extensions
- UI components reference
- Development guidelines
- Security considerations
- Troubleshooting
- License information

#### `SETUP_GUIDE.md`
**Purpose**: Step-by-step installation and setup

**Sections**:
- Prerequisites verification
- Installation steps
- Backend API setup requirements
- CORS configuration
- Project structure explanation
- Common commands
- Environment variables
- Troubleshooting
- Performance optimization
- Production build and deployment
- Security considerations
- Next steps for extension

#### `ARCHITECTURE.md`
**Purpose**: Architecture and design decisions

**Sections**:
- Overview of architectural decisions
- Data flow diagrams
- Security considerations
- Error handling strategy
- Performance optimization
- Testing strategy
- Scalability considerations
- Deployment considerations
- Future roadmap
- Extension guidelines
- Troubleshooting guide

#### `PROJECT_FILES.md`
**Purpose**: This file - Complete file reference

---

## Directory Structure Summary

```
TeamsFrontend/
│
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config/
│   │   │   │   └── api.config.ts
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts
│   │   │   ├── models/              (expandable)
│   │   │   └── services/            (expandable)
│   │   │
│   │   ├── shared/
│   │   │   ├── components/          (expandable)
│   │   │   ├── directives/          (expandable)
│   │   │   ├── interfaces/
│   │   │   │   └── common.interfaces.ts
│   │   │   └── pipes/               (expandable)
│   │   │
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── login.component.ts
│   │   │   │   ├── register/
│   │   │   │   │   └── register.component.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── auth.service.ts
│   │   │   │   └── models/
│   │   │   │       └── auth.models.ts
│   │   │   └── home/
│   │   │       └── home.component.ts
│   │   │
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   │
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   │
│   ├── index.html
│   ├── main.ts
│   └── styles.css
│
├── angular.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── package.json
├── .gitignore
├── README.md
├── SETUP_GUIDE.md
├── ARCHITECTURE.md
└── PROJECT_FILES.md
```

---

## File Size and Complexity

| File | Size | Complexity |
|------|------|------------|
| auth.service.ts | ~4 KB | High |
| login.component.ts | ~5 KB | Medium-High |
| register.component.ts | ~6 KB | Medium-High |
| home.component.ts | ~4 KB | Medium |
| auth.models.ts | ~1.5 KB | Low |
| api.config.ts | ~0.5 KB | Low |
| app.routes.ts | ~1 KB | Low |
| app.config.ts | ~0.5 KB | Low |

---

## Dependencies Used

### Angular Packages
- @angular/core
- @angular/common
- @angular/forms (ReactiveFormsModule)
- @angular/router (Router, Routes)
- @angular/platform-browser
- @angular/platform-browser-dynamic
- @angular/animations

### Third-party Libraries
- primeng (v17.0.0)
- primeicons (v6.0.1)
- rxjs (v7.8.0)

### TypeScript
- typescript (v5.6.0)

---

## How to Extend Each File Type

### Adding a New Component

1. Create component file in appropriate feature folder
2. Add `standalone: true` and import dependencies
3. Add route in `app.routes.ts`
4. Add to navigation if needed

### Adding a New Service

1. Create service in appropriate location
2. Use `@Injectable({ providedIn: 'root' })`
3. Inject in components via constructor
4. Use Observable pattern for data

### Adding a New Guard

1. Create guard file in `core/guards/`
2. Export as `CanActivateFn`
3. Use `inject()` for dependencies
4. Add to route's `canActivate` array

### Adding a New Interface

1. Add to appropriate interfaces file
2. Or create new interfaces file in shared
3. Import where needed
4. Use with `<T>` generic typing if applicable

---

## Key Concepts Used

### Standalone Components
Every component is standalone and self-contained with explicit imports.

### Dependency Injection
Services are injected via constructor or `inject()` function.

### RxJS Observables
Data flows through Observable streams for reactive updates.

### Type Safety
Full TypeScript strict mode with proper types throughout.

### Lazy Loading
Components loaded on-demand with `loadComponent()` in routes.

### Route Guards
Protected routes using functional `CanActivateFn` guards.

### Local Storage
Persistent session storage for authentication state.

---

## Performance Considerations

- **Bundle Size**: Optimized with lazy loading and tree-shaking
- **Change Detection**: Can add OnPush strategy per component
- **Unsubscription**: Properly handled with takeUntil pattern
- **Component Lifecycle**: OnDestroy implemented where needed

---

**Last Updated**: June 2026
**Version**: 1.0.0
