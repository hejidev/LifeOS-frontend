# LifeOS Architecture

## Overview

LifeOS uses a monorepo structure with frontend (Next.js) and backend (Express) as sibling folders.

```
life_os/
├── app/              # Next.js App Router (frontend)
├── components/       # React components
├── lib/              # Utilities, mock data, stores, hooks
├── types/            # Shared TypeScript types
├── docs/             # Documentation
└── backend/          # Express API (Phase 2+)
```

## Frontend Architecture

### Route Groups
- `(marketing)` — Public landing page
- `(auth)` — Login, signup
- `(app)` — Main authenticated app (dashboard, tasks, notes, AI)
- `(admin)` — Admin dashboard
- `(super-admin)` — Super admin platform management

### State Management
- **TanStack Query** — Server state with mock API delays
- **Zustand** — Client state (auth, chat, UI preferences)
- **Mock data layer** — `lib/mock/` with unified query helpers

### Data Flow

```
Mock Store → Query Helpers → TanStack Query Hooks → React Components
                                    ↑
                              Cross-module actions
                              (note → task, AI context)
```

## Backend Architecture (Planned)

### API Routes
- `/api/auth` — OAuth, JWT sessions
- `/api/tasks` — CRUD + AI scheduling
- `/api/notes` — CRUD + AI summaries
- `/api/ai` — Context-aware AI endpoints
- `/api/admin` — User management, analytics

### Database (PostgreSQL via Prisma)
- Users, Tasks, Notes, CalendarEvents, Transactions, Goals, Habits, Documents

### Caching (Redis)
- Session tokens, AI response cache, real-time notifications

### Auth Flow
1. OAuth provider (Google/GitHub/Apple) → callback
2. Create/update user in PostgreSQL
3. Issue JWT + refresh token
4. Store session in Redis

## Deployment

- **Frontend:** Vercel (auto-deploy from git)
- **Backend:** Railway
- **Database:** Neon (PostgreSQL)
- **Cache:** Upstash Redis

## Role-Based Access

| Role | Access |
|------|--------|
| user | Personal app modules |
| admin | User management, analytics |
| super_admin | Platform overview, tenants, billing |
