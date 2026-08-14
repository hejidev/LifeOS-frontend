# LifeOS — AI Life Operating System

One intelligent platform to manage every aspect of your life. Dark-mode-first, integration-driven, free forever.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo login:** Click any OAuth button or sign in with the pre-filled credentials on `/login`.

## What's Built (Phase 1)

| Feature | Route | Status |
|---------|-------|--------|
| Landing page | `/` | Done |
| Login / Signup | `/login`, `/signup` | Done |
| Dashboard | `/app/dashboard` | Done |
| Tasks | `/app/tasks` | Done |
| Notes | `/app/notes` | Done |
| AI Assistant | `/app/ai` | Done |
| Settings | `/app/settings` | Done |
| Admin panel | `/admin` | Done |
| Super Admin | `/super-admin` | Done |

## Key Features

- **Cmd+K** — Command palette searches tasks, notes, and pages
- **?** — Keyboard shortcuts overlay
- **Role switching** — Profile menu → switch between User, Admin, Super Admin views
- **Cross-module integration** — Notes convert to tasks, AI reads calendar/tasks/budget, dashboard aggregates everything
- **Mock data layer** — Unified store with simulated API delays via TanStack Query

## Project Structure

```
life_os/
├── app/              # Next.js routes
├── components/       # UI, shell, module components
├── lib/mock/         # Mock data + query helpers
├── lib/stores/       # Zustand (auth, chat, UI)
├── types/            # TypeScript models
├── docs/             # PRD, architecture, roadmap
└── backend/          # Express API scaffold (Phase 2)
```

## Documentation

- [PRD](docs/PRD.md) — Product vision
- [Architecture](docs/ARCHITECTURE.md) — Technical design
- [Modules](docs/MODULES.md) — All modules and status
- [Roadmap](docs/ROADMAP.md) — Phased delivery plan
- [Design](docs/DESIGN.md) — Design tokens and patterns

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · TanStack Query · Zustand · Framer Motion · Recharts

## Backend (Scaffold)

```bash
cd backend
npm install
npm run dev
```

API health check: `GET http://localhost:4000/health`
