import type { Note } from "@/types/life";

export let mockNotes: Note[] = [
  {
    id: "note-1",
    title: "Q2 Report Notes",
    content: `# Q2 Quarterly Report

## Key Metrics
- Revenue: **$2.4M** (+18% YoY)
- New customers: **847**
- Churn rate: **2.1%**

## Action Items
- [ ] Finalize executive summary
- [ ] Add competitor analysis section
- [ ] Schedule review with CFO

## Notes from Leadership Call
> Focus on retention metrics and expansion revenue for Q3 planning.`,
    summary:
      "Q2 report covering revenue ($2.4M, +18%), 847 new customers, 2.1% churn. Pending: executive summary, competitor analysis, CFO review.",
    folder: "Work",
    tags: ["work", "reports"],
    linkedTaskIds: ["task-1"],
    pinned: true,
    attachments: [{ name: "Q2-data.xlsx", type: "spreadsheet" }],
    createdAt: "2026-06-28T10:00:00Z",
    updatedAt: "2026-07-02T14:00:00Z",
  },
  {
    id: "note-2",
    title: "Portfolio Ideas",
    content: `# Portfolio Redesign Ideas

## Design Direction
- Dark mode first
- Minimal, Apple-inspired aesthetic
- Showcase 3-4 key projects prominently

## Projects to Feature
1. LifeOS (this project!)
2. E-commerce platform
3. Mobile fitness app

## Tech Stack
- Next.js 16
- Tailwind CSS
- Framer Motion for animations`,
    summary:
      "Portfolio redesign plan: dark mode, minimal Apple aesthetic, featuring LifeOS, e-commerce, and fitness app projects.",
    folder: "Work",
    tags: ["career", "design"],
    linkedTaskIds: ["task-8"],
    pinned: false,
    attachments: [{ name: "mockup.png", type: "image" }],
    createdAt: "2026-06-15T10:00:00Z",
    updatedAt: "2026-06-28T16:00:00Z",
  },
  {
    id: "note-3",
    title: "System Design Study Notes",
    content: `# Chapter 5: Distributed Systems

## CAP Theorem
- **Consistency** - All nodes see same data
- **Availability** - Every request gets a response
- **Partition Tolerance** - System works despite network failures

You can only guarantee 2 of 3.

## Key Patterns
- Load balancing
- Database sharding
- Caching strategies (Redis, CDN)
- Message queues (Kafka, RabbitMQ)`,
    summary:
      "System design notes on CAP theorem (Consistency, Availability, Partition Tolerance) and patterns: load balancing, sharding, caching, message queues.",
    folder: "Study",
    tags: ["study", "engineering"],
    linkedTaskIds: ["task-6"],
    pinned: false,
    attachments: [{ name: "chapter5.pdf", type: "pdf" }],
    createdAt: "2026-06-30T20:00:00Z",
    updatedAt: "2026-07-02T21:00:00Z",
  },
  {
    id: "note-4",
    title: "Weekly Meal Plan",
    content: `# This Week's Meals

## Monday
- Breakfast: Oatmeal with berries
- Lunch: Chicken salad
- Dinner: Pasta primavera

## Tuesday
- Breakfast: Smoothie bowl
- Lunch: Leftover pasta
- Dinner: Grilled salmon

## Grocery List
- Chicken breast
- Salmon fillets
- Mixed greens
- Berries
- Pasta`,
    summary: "Weekly meal plan with breakfast, lunch, dinner for Mon-Tue plus grocery list.",
    folder: "Personal",
    tags: ["personal", "health"],
    linkedTaskIds: [],
    pinned: false,
    attachments: [],
    createdAt: "2026-07-01T08:00:00Z",
    updatedAt: "2026-07-01T08:00:00Z",
  },
];

export const noteFolders = ["Personal", "Work", "Study"];
