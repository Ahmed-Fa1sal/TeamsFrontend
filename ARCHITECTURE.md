# Architecture and Design Documentation

## Overview

This is an enterprise-grade Angular application demonstrating best practices for:
- Standalone components architecture
- Scalable folder structure
- Authentication and authorization
- Reactive programming with RxJS
- PrimeNG integration
- TypeScript strict mode

## Architecture Decisions

### 1. Standalone Components

**Decision**: Use Angular 19 standalone components instead of NgModules.

**Benefits**:
- Simpler mental model and less boilerplate
- Better tree-shaking and bundle optimization
- Easier testing and composition
- Modern Angular approach

**Implementation**:
- Every component has `standalone: true`
- Components import dependencies directly
- No feature modules or shared modules needed

```typescript
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PrimeNG components]
})
export class LoginComponent { }
```

### 2. Feature-Based Folder Structure

**Decision**: Organize code by features rather than by type.

**Structure**:
```
features/
  auth/
    login/
    register/
    services/
    models/
  home/
```

**Benefits**:
- Easy to find related code
- Scalable for large applications
- Clear feature boundaries
- Easier team collaboration

### 3. Centralized API Configuration

**Decision**: Keep all API endpoints in one config file.

**File**: `src/app/core/config/api.config.ts`

**Benefits**:
- No hardcoded URLs in services
- Easy to change environment configurations
- Single source of truth
- Reduces debugging time

### 4. Service-Based State Management

**Decision**: Use RxJS BehaviorSubject for simple state management (no NgRx).

**Implementation**:
```typescript
private authState$ = new BehaviorSubject<AuthState>(initialState);

// Subscribed to by components
this.authState$.asObservable().subscribe(state => { });
```

**Benefits**:
- Simple and straightforward
- No external dependencies (other than RxJS)
- Easy to add NgRx later if needed
- Good for small to medium applications

### 5. Route Guards with Functional API

**Decision**: Use functional `CanActivateFn` instead of class-based guards.

**Implementation**:
```typescript
export const authGuardFn: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authService.isAuthenticated() 
    ? true 
    : router.createUrlTree(['/login']);
};
```

**Benefits**:
- Modern Angular approach
- Easier composition
- Better with dependency injection
- Simpler testing

### 6. PrimeNG for UI Components

**Decision**: Use PrimeNG for professional UI components.

**Components Used**:
- Button
- InputText
- Card
- Messages
- Dialog (extensible)

**Benefits**:
- Professional, accessible components
- Rich theming system
- Community support
- Easy customization

### 7. Reactive Forms

**Decision**: Use Reactive Forms for all form handling.

**Implementation**:
```typescript
this.loginForm = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required]]
});
```

**Benefits**:
- Strong typing support
- Better for complex validation
- Easier to test
- More functional approach

## Data Flow

### Authentication Flow

```
User Input
    ↓
[Login Component]
    ↓
[AuthService.login()]
    ↓
[HTTP POST /auth/login]
    ↓
Backend Validation
    ↓
[JWT Token + User Data]
    ↓
[AuthService updates BehaviorSubject]
    ↓
[State saved to localStorage]
    ↓
[Navigation Guard checks state]
    ↓
[Route to /home]
```

### Component Communication

```
Parent Component
    ↓
Dependency Injection
    ↓
Service
    ↓
Observable/RxJS
    ↓
Child Component (via async pipe)
```

## Security Considerations

### Current Implementation

1. **Local Storage**: Authentication state stored in localStorage
   - Non-sensitive token storage
   - Survives page refresh
   - Cleared on logout

2. **Password Validation**: 
   - Minimum 8 characters
   - Must contain: uppercase, lowercase, number
   - Client-side and server-side validation

3. **HTTPS Ready**: 
   - Works with HTTPS in production
   - Secure cookie support

### Planned Enhancements

1. **JWT Interceptor**: Auto-attach token to requests
2. **Error Interceptor**: Global error handling
3. **Token Refresh**: Automatic token refresh mechanism
4. **Secure Storage**: Move away from localStorage for sensitive data
5. **Rate Limiting**: Prevent brute force attacks
6. **CSRF Protection**: Token-based CSRF protection

## Error Handling Strategy

### Global Error Handling

```typescript
// Currently: Component-level error handling
.subscribe({
  next: () => { /* success */ },
  error: (error) => { 
    this.messages = [{
      severity: 'error',
      detail: error?.error?.message
    }];
  }
});
```

### Future: Interceptor-Based

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError(error => {
      // Handle common errors
      if (error.status === 401) {
        // Handle unauthorized
      }
      return throwError(() => error);
    })
  );
};
```

## Performance Optimization

### Current Optimizations

1. **Lazy Loading**: Components loaded on demand
   ```typescript
   loadComponent: () => import('@features/auth/login/login.component')
   ```

2. **OnPush Change Detection**: Can be added to components
   ```typescript
   changeDetection: ChangeDetectionStrategy.OnPush
   ```

3. **Tree Shaking**: Standalone components improve bundling

### Recommended Optimizations

1. **Preloading Strategy**
2. **Image Lazy Loading**
3. **Virtual Scrolling** (for lists)
4. **Production Build**: `npm run build`

## Testing Strategy

### Unit Testing

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  it('should login user', () => {
    service.login(credentials).subscribe(response => {
      expect(response.token).toBeDefined();
    });

    const req = http.expectOne('http://localhost:8080/api/v1/auth/login');
    expect(req.request.method).toBe('POST');
  });
});
```

### Component Testing

```typescript
describe('LoginComponent', () => {
  let component: LoginComponent;
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginComponent]
    });
    component = TestBed.createComponent(LoginComponent).componentInstance;
  });

  it('should validate email field', () => {
    const email = component.loginForm.get('email');
    email?.setValue('invalid-email');
    expect(email?.hasError('email')).toBeTruthy();
  });
});
```

## Scalability Considerations

### For Larger Applications

1. **Module Federation**: Load features dynamically
2. **NgRx**: Complex state management
3. **API Versioning**: Support multiple API versions
4. **Feature Flags**: Enable/disable features at runtime
5. **Multi-tenancy**: Support multiple organizations

### Code Organization

```
features/
  dashboard/
    pages/
    components/
    services/
    state/  (NgRx store)
    models/
  settings/
    pages/
    components/
    services/
    models/
```

## Deployment Considerations

### Development
- `npm start` - Runs on http://localhost:4200
- Fast build times
- Source maps enabled

### Staging
- Production build
- Environment: staging
- API: staging backend

### Production
- Optimized build: `npm run build`
- Environment: production
- API: production backend
- HTTPS enabled
- CDN distribution

## Future Roadmap

### Phase 1: Current (MVP)
- ✅ Login/Register
- ✅ Home page
- ✅ Basic authentication
- ✅ UI with PrimeNG

### Phase 2: Enhancement
- JWT interceptor
- Error handling interceptor
- User profile page
- Toast notifications
- Form services

### Phase 3: Advanced
- NgRx state management
- Role-based access control
- Advanced caching
- Real-time notifications
- Analytics tracking

### Phase 4: Enterprise
- Multi-language support
- Dark mode
- Advanced search
- Audit logging
- Advanced security features

## Extending the Application

### Add New Feature

1. Create feature folder:
   ```
   src/app/features/profile/
     pages/
     components/
     services/
     models/
   ```

2. Create standalone component:
   ```typescript
   @Component({
     selector: 'app-profile',
     standalone: true,
     imports: [CommonModule, PrimeNG modules]
   })
   ```

3. Add route:
   ```typescript
   {
     path: 'profile',
     loadComponent: () => import('@features/profile/profile.component')
   }
   ```

4. Use service:
   ```typescript
   constructor(private profileService: ProfileService) {}
   ```

### Add New Service

1. Create in appropriate location:
   - Core service: `src/app/core/services/`
   - Feature service: `src/app/features/feature/services/`

2. Implement with dependency injection:
   ```typescript
   @Injectable({ providedIn: 'root' })
   export class MyService {
     constructor(private http: HttpClient) {}
   }
   ```

3. Use in components:
   ```typescript
   constructor(private myService: MyService) {}
   ```

## Troubleshooting Guide

### Component Not Rendering
- Check if component is imported in imports array
- Verify selector is correct
- Check for console errors

### API Calls Failing
- Verify backend is running
- Check API URL in api.config.ts
- Check browser Network tab for errors
- Verify CORS configuration

### State Not Updating
- Check if BehaviorSubject is updated
- Verify subscription is active
- Check for unsubscribe issues
- Use async pipe in templates

### Tests Failing
- Import required modules in TestBed
- Mock services properly
- Use HttpClientTestingModule
- Verify test data matches expected format

---

**Last Updated**: June 2026
**Architecture Version**: 1.0.0
