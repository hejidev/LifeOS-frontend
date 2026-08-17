# LifeOS Backend API

Express + TypeScript API scaffold for LifeOS. Not connected to frontend in Phase 1.

## Quick Start

```bash
cd backend
npm install
npm run dev
```

Health check: `GET http://localhost:4000/health`

## Planned Stack

- **Runtime:** Node.js + Express
- **ORM:** Prisma
- **Database:** PostgreSQL (Neon)
- **Cache:** Redis (Upstash)
- **Auth:** JWT + OAuth (Google, GitHub, Apple via Better Auth)
- **Storage:** AWS S3 + Cloudinary

## Planned API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth` | POST | Login, register, OAuth callback |
| `/api/tasks` | GET, POST, PUT, DELETE | Task CRUD + AI scheduling |
| `/api/notes` | GET, POST, PUT, DELETE | Note CRUD + AI summaries |
| `/api/ai` | POST | Context-aware AI chat |
| `/api/admin` | GET, PUT | User management, analytics |

## Planned Prisma Schema (Outline)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  tasks     Task[]
  notes     Note[]
  createdAt DateTime @default(now())
}

model Task {
  id          String   @id @default(cuid())
  title       String
  priority    Priority
  status      Status
  dueDate     DateTime?
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  linkedNote  Note?    @relation(fields: [linkedNoteId], references: [id])
  linkedNoteId String?
}

model Note {
  id       String @id @default(cuid())
  title    String
  content  String
  folder   String
  userId   String
  user     User   @relation(fields: [userId], references: [id])
  tasks    Task[]
}
```

## Environment Variables (Future)

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
STRIPE_SECRET_KEY=...
PAYSTACK_SECRET_KEY=...
AWS_S3_BUCKET=...
```
