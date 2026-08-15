# LifeOS — Product Requirements Document

## Vision

LifeOS is an AI-powered Life Operating System — one intelligent platform where every feature works together. Unlike disconnected tools, LifeOS integrates calendar, tasks, budget, notes, health, and more into a unified experience with context-aware AI.

## Target Users

- Students, workers, parents, business owners, freelancers, developers, doctors, farmers — everyone.

## Core Value Proposition

**Integration over feature count.** Your calendar knows your tasks. Your budget reflects planned expenses. Your notes become tasks with one click. Your AI assistant understands your data.

## Modules

### Phase 1 (Current — Frontend Mock)
- Personal Dashboard
- Smart Tasks
- Notes (Notion-like)
- AI Assistant (context-aware)

### Phase 2
- Finance (spending, income, savings, debts, investments)
- Health (water, sleep, weight, exercise, mood)
- Habit Tracker
- Study (PDFs, quizzes, flashcards)

### Phase 3
- Career (resume, portfolio, cover letters, interview practice)
- Document Center (encrypted storage)
- Password Vault (encrypted, never plain text)
- Family Space (shared lists, budgets, events)
- Small Business (invoices, inventory, sales, expenses)

### Phase 4
- AI Writing, AI Image Tools, File Converter
- Global Utilities (currency, timezone, unit converters)
- Emergency Vault (trusted family access)

## Pricing Model

**Free forever** for all essential features.

**Premium ($9/mo)** for:
- Extended AI credits
- Large storage (50GB)
- Team workspaces
- Advanced analytics
- Automation workflows

## Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query, Zustand, Framer Motion
- **Backend:** Node.js, Express, Prisma, PostgreSQL, Redis, JWT, OAuth
- **Auth:** Better Auth / Auth.js (Google, GitHub, Apple)
- **Payments:** Stripe, PayPal, Paystack
- **Storage:** Cloudinary, AWS S3
- **Deployment:** Vercel, Railway, Neon

## Design Direction

Apple (clean) + Notion (organized) + Linear (fast) + Spotify (animations). Dark mode first. Responsive. Keyboard shortcuts. Command palette. Everything searchable.
