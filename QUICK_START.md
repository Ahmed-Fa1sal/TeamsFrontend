# Quick Start Guide

## 30-Second Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm start
```

### 3. Open Browser
Navigate to: `http://localhost:4200`

---

## Default Login Credentials

The backend should support these test accounts:

### Admin Account
```
Email: admin@example.com
Password: TestPassword123!
```

### Test User Account
```
Email: testuser222@example.com
Password: TestPassword123!
```

---

## Quick Navigation

### Available Routes
- **Login Page**: http://localhost:4200/login
- **Register Page**: http://localhost:4200/register
- **Home Page**: http://localhost:4200/home (after login)

### Workflow
1. Go to `/login` or `/register`
2. Enter credentials and submit
3. If successful, redirected to `/home`
4. Click Logout to return to login page

---

## Troubleshooting

### "Cannot GET /home"
- Make sure you're logged in
- Auth guard will redirect to login if not authenticated

### "API Connection Failed"
- Verify backend is running on `http://localhost:8080`
- Check if API URL is correct in `src/app/core/config/api.config.ts`

### Port 4200 Already in Use
```bash
ng serve --port 4300
```

---

## File Locations for Quick Reference

| What | Where |
|------|-------|
| Login Page | `src/app/features/auth/login/login.component.ts` |
| Register Page | `src/app/features/auth/register/register.component.ts` |
| Home Page | `src/app/features/home/home.component.ts` |
| API Config | `src/app/core/config/api.config.ts` |
| Auth Service | `src/app/features/auth/services/auth.service.ts` |
| Routes | `src/app/app.routes.ts` |
| Styles | `src/styles.css` |

---

## Common Commands

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Watch mode (rebuild on changes)
npm run watch

# Lint code
npm run lint
```

---

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Start server: `npm start`
3. ✅ Test login/register flows
4. ✅ Review code in VS Code
5. 📖 Read [README.md](README.md) for full documentation
6. 📖 Read [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed setup
7. 📖 Read [ARCHITECTURE.md](ARCHITECTURE.md) for design patterns

---

## Project Structure at a Glance

```
src/app/
├── core/
│   ├── config/       ← API URLs and settings
│   └── guards/       ← Route protection
├── shared/
│   └── interfaces/   ← Common types
├── features/
│   ├── auth/
│   │   ├── login/    ← Login form
│   │   ├── register/ ← Registration form
│   │   └── services/ ← Auth logic
│   └── home/         ← Home page
├── app.component.ts  ← Root component
├── app.config.ts     ← App setup
└── app.routes.ts     ← Routing
```

---

## Key Features

✨ **Authentication**: Login and register users
🔒 **Protected Routes**: Home page requires authentication
🎨 **Modern UI**: PrimeNG components with custom styling
📱 **Responsive**: Works on desktop and mobile
⚡ **Fast**: Standalone components with lazy loading
🔧 **Extensible**: Easy to add features

---

**Ready to code?** Open `src/app/features/` to explore the components!
