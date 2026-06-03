# Teams Frontend - Complete Project Structure

## Overview

This document provides a complete visual representation of the project structure with descriptions of each directory and file.

## Full Directory Tree

```
TeamsFrontend/
│
├── 📁 src/
│   │
│   ├── 📁 app/
│   │   │
│   │   ├── 📁 core/                    # Application core logic
│   │   │   │
│   │   │   ├── 📁 config/              # Configuration files
│   │   │   │   └── 📄 api.config.ts    # API endpoints and base URL
│   │   │   │
│   │   │   ├── 📁 guards/              # Route guards
│   │   │   │   └── 📄 auth.guard.ts    # Authentication guard
│   │   │   │
│   │   │   ├── 📁 models/              # Core data models
│   │   │   │   └── (currently empty, ready for expansion)
│   │   │   │
│   │   │   └── 📁 services/            # Core services
│   │   │       └── (currently empty, ready for expansion)
│   │   │
│   │   ├── 📁 shared/                  # Shared across features
│   │   │   │
│   │   │   ├── 📁 components/          # Reusable components
│   │   │   │   └── (currently empty, ready for expansion)
│   │   │   │
│   │   │   ├── 📁 directives/          # Custom directives
│   │   │   │   └── (currently empty, ready for expansion)
│   │   │   │
│   │   │   ├── 📁 interfaces/          # Shared interfaces
│   │   │   │   └── 📄 common.interfaces.ts
│   │   │   │
│   │   │   └── 📁 pipes/               # Custom pipes
│   │   │       └── (currently empty, ready for expansion)
│   │   │
│   │   ├── 📁 features/                # Feature modules
│   │   │   │
│   │   │   ├── 📁 auth/                # Authentication feature
│   │   │   │   │
│   │   │   │   ├── 📁 login/
│   │   │   │   │   └── 📄 login.component.ts
│   │   │   │   │
│   │   │   │   ├── 📁 register/
│   │   │   │   │   └── 📄 register.component.ts
│   │   │   │   │
│   │   │   │   ├── 📁 services/
│   │   │   │   │   └── 📄 auth.service.ts
│   │   │   │   │
│   │   │   │   └── 📁 models/
│   │   │   │       └── 📄 auth.models.ts
│   │   │   │
│   │   │   └── 📁 home/                # Home feature
│   │   │       └── 📄 home.component.ts
│   │   │
│   │   ├── 📄 app.component.ts         # Root component
│   │   ├── 📄 app.config.ts            # Application configuration
│   │   └── 📄 app.routes.ts            # Route configuration
│   │
│   ├── 📁 environments/                # Environment configurations
│   │   ├── 📄 environment.ts           # Development environment
│   │   └── 📄 environment.prod.ts      # Production environment
│   │
│   ├── 📄 index.html                   # HTML entry point
│   ├── 📄 main.ts                      # Bootstrap entry point
│   └── 📄 styles.css                   # Global styles
│
├── 📁 public/                          # Static assets (optional)
│
├── 📄 angular.json                     # Angular CLI configuration
├── 📄 tsconfig.json                    # TypeScript configuration
├── 📄 tsconfig.app.json                # TypeScript app config
├── 📄 tsconfig.spec.json               # TypeScript test config
├── 📄 package.json                     # Dependencies and scripts
├── 📄 .gitignore                       # Git ignore rules
│
├── 📄 README.md                        # Project documentation
├── 📄 SETUP_GUIDE.md                   # Setup instructions
├── 📄 ARCHITECTURE.md                  # Architecture documentation
├── 📄 PROJECT_FILES.md                 # File reference guide
├── 📄 QUICK_START.md                   # Quick start guide
└── 📄 PROJECT_STRUCTURE.md             # This file

```

## Directory Details

### `/src/app/core/`

**Purpose**: Contains core business logic and configuration that's shared throughout the application.

**Contents**:
- **config/**: Application constants and configuration
  - `api.config.ts`: API endpoints and base URL
  
- **guards/**: Route protection mechanisms
  - `auth.guard.ts`: Functional guard for protecting authenticated routes
  
- **models/**: Core data models (expandable)
- **services/**: Core services (expandable)

### `/src/app/shared/`

**Purpose**: Contains components, services, and utilities shared across multiple features.

**Contents**:
- **components/**: Reusable UI components (expandable)
- **directives/**: Custom structural directives (expandable)
- **interfaces/**: Shared TypeScript interfaces
  - `common.interfaces.ts`: API response types and common models
- **pipes/**: Custom transformation pipes (expandable)

### `/src/app/features/`

**Purpose**: Feature-based modules organized by business domain.

#### `/src/app/features/auth/`

**Purpose**: Authentication feature module.

**Structure**:
```
auth/
├── login/
│   └── login.component.ts        # Login page component
├── register/
│   └── register.component.ts      # Registration page component
├── services/
│   └── auth.service.ts            # Authentication service
└── models/
    └── auth.models.ts             # Auth-related models
```

**Components**:
- **login.component.ts**
  - Email/password form
  - Validation and error handling
  - Link to registration
  - PrimeNG components: Button, InputText, Card, Messages

- **register.component.ts**
  - Multi-field form (firstName, lastName, username, email, password)
  - Password strength validation
  - Error handling with detailed messages
  - Link back to login

**Services**:
- **auth.service.ts**
  - `login()` - User authentication
  - `register()` - New account creation
  - `logout()` - Session termination
  - State management with RxJS BehaviorSubject
  - Local storage persistence

**Models**:
- **auth.models.ts**
  - `LoginRequest`
  - `RegisterRequest`
  - `AuthResponse`
  - `User`
  - `AuthState`

#### `/src/app/features/home/`

**Purpose**: Home/dashboard feature module.

**Components**:
- **home.component.ts**
  - Welcome message with user name
  - User information display
  - Feature list
  - Logout button
  - Protected route (requires authentication)

### `/src/environments/`

**Purpose**: Environment-specific configurations for development and production.

**Files**:
- **environment.ts** (Development)
  - `production: false`
  - `apiUrl: 'http://localhost:8080/api/v1'`
  - `logLevel: 'debug'`

- **environment.prod.ts** (Production)
  - `production: true`
  - `apiUrl: 'https://api.production.com/api/v1'`
  - `logLevel: 'error'`

---

## Root Level Files

### Configuration Files

| File | Purpose |
|------|---------|
| `angular.json` | Angular CLI configuration, build settings, PrimeNG theme |
| `tsconfig.json` | TypeScript compiler settings, path aliases |
| `tsconfig.app.json` | App-specific TypeScript configuration |
| `tsconfig.spec.json` | Test-specific TypeScript configuration |
| `package.json` | NPM dependencies and scripts |
| `.gitignore` | Git ignore rules |

### Entry Point Files

| File | Purpose |
|------|---------|
| `src/main.ts` | Bootstrap application |
| `src/index.html` | HTML entry point |
| `src/styles.css` | Global CSS styles |

### Source Files

| File | Purpose |
|------|---------|
| `src/app/app.component.ts` | Root component |
| `src/app/app.config.ts` | Application configuration/providers |
| `src/app/app.routes.ts` | Route definitions |

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Complete project documentation |
| `SETUP_GUIDE.md` | Installation and setup instructions |
| `ARCHITECTURE.md` | Architecture and design patterns |
| `PROJECT_FILES.md` | Detailed file reference |
| `QUICK_START.md` | Quick start instructions |
| `PROJECT_STRUCTURE.md` | This file |

---

## Expansion Points

The following directories are ready for expansion:

### Ready to Add Components
```
src/app/shared/components/
├── header/
├── footer/
├── navbar/
└── sidebar/
```

### Ready to Add Directives
```
src/app/shared/directives/
├── highlight.directive.ts
└── auto-focus.directive.ts
```

### Ready to Add Pipes
```
src/app/shared/pipes/
├── date-format.pipe.ts
└── truncate.pipe.ts
```

### Ready to Add Services
```
src/app/core/services/
├── notification.service.ts
└── logger.service.ts
```

### Ready to Add Features
```
src/app/features/
├── dashboard/
├── profile/
├── settings/
└── notifications/
```

---

## File Naming Conventions

### Components
- Filename: `component-name.component.ts`
- Class name: `ComponentNameComponent`
- Selector: `app-component-name`

**Example**:
```
login.component.ts
export class LoginComponent { }
// selector: 'app-login'
```

### Services
- Filename: `service-name.service.ts`
- Class name: `ServiceNameService`

**Example**:
```
auth.service.ts
export class AuthService { }
```

### Guards
- Filename: `guard-name.guard.ts`
- Export: `guardNameGuard` or `guardNameFn`

**Example**:
```
auth.guard.ts
export const authGuardFn: CanActivateFn = (...) => { }
```

### Models/Interfaces
- Filename: `entity.model.ts` or `entity.interface.ts`
- No class wrapping, just types

**Example**:
```
auth.models.ts
export interface User { }
export interface AuthState { }
```

---

## Import Path Aliases

The project uses TypeScript path aliases for cleaner imports:

```typescript
// Instead of:
import { ApiConfig } from '../../../core/config/api.config';

// Use:
import { ApiConfig } from '@core/config/api.config';
```

**Configured Aliases**:
- `@app/*` → `src/app/*`
- `@core/*` → `src/app/core/*`
- `@shared/*` → `src/app/shared/*`
- `@features/*` → `src/app/features/*`

---

## Feature Module Example Structure

For reference, here's how additional features should be structured:

```
features/
└── user-profile/
    ├── pages/
    │   ├── profile-view.component.ts
    │   └── profile-edit.component.ts
    ├── components/
    │   ├── profile-header.component.ts
    │   └── profile-form.component.ts
    ├── services/
    │   └── profile.service.ts
    ├── models/
    │   └── profile.models.ts
    └── user-profile.routes.ts
```

---

## Build Output

After running `npm run build`, the output structure is:

```
dist/
└── teams-frontend/
    ├── index.html
    ├── styles.css
    ├── main.js
    ├── polyfills.js
    ├── runtime.js
    └── assets/
```

---

## Development Workflow

### Adding a New Feature

1. Create feature folder: `src/app/features/feature-name/`
2. Create subfolders: `pages/`, `components/`, `services/`, `models/`
3. Create standalone components with imports
4. Create service with `@Injectable({ providedIn: 'root' })`
5. Add route in `app.routes.ts`
6. Import PrimeNG components as needed

### Adding a Shared Component

1. Create in: `src/app/shared/components/component-name/`
2. Make it standalone with explicit imports
3. Export in an index file (optional)
4. Use in features by importing directly

### Adding Utilities

1. Create service: `src/app/core/services/utility.service.ts`
2. Or create helper: `src/app/shared/utils/helper.ts`
3. Import and use throughout app

---

## Key Statistics

| Metric | Value |
|--------|-------|
| Total Files Created | 28 |
| TypeScript Files | 14 |
| Configuration Files | 6 |
| Documentation Files | 6 |
| Total Lines of Code | ~2000 |
| Total Documentation | ~5000 lines |

---

## Next Steps

1. **Review Documentation**
   - Start with [QUICK_START.md](QUICK_START.md)
   - Then read [README.md](README.md)
   - Deep dive into [ARCHITECTURE.md](ARCHITECTURE.md)

2. **Install and Run**
   ```bash
   npm install
   npm start
   ```

3. **Test Features**
   - Register a new account
   - Login with credentials
   - View home page
   - Logout

4. **Explore Code**
   - Review authentication service
   - Check form validation
   - Understand routing
   - Study state management

5. **Extend Application**
   - Add user profile feature
   - Implement JWT interceptor
   - Add more PrimeNG components
   - Create custom directives

---

**Created**: June 2026  
**Version**: 1.0.0  
**Framework**: Angular 19  
**UI Library**: PrimeNG 17
