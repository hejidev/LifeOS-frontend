# LifeOS Design System

## Aesthetic

Blend of Apple (clean), Notion (organized), Linear (fast), Spotify (motion).

## Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#09090b` | Primary canvas |
| Surface/Card | `#18181b` | Cards, panels, sidebar |
| Border | `#27272a` | Subtle separation |
| Foreground | `#fafafa` | Primary text |
| Muted | `#a1a1aa` | Secondary text |
| Primary | `#6366f1` | CTAs, active states |
| Gradient | `#6366f1 → #8b5cf6` | Logo, buttons, progress bars |
| Success | `#22c55e` | Positive states |
| Warning | `#f59e0b` | Budget alerts, trial badges |
| Destructive | `#f43f5e` | Errors, overdue, suspend |

## Typography

- **Font:** Geist Sans (body + headings), Geist Mono (code)
- **Scale:** text-xs (10-12px), text-sm (14px), text-base (16px), text-lg (18px), text-xl-3xl (headings)

## Spacing & Radius

- **Card radius:** 12px (`rounded-xl`)
- **Input/button radius:** 8px (`rounded-lg`)
- **Page padding:** 24px (`p-6`)
- **Card padding:** 20-24px
- **Grid gap:** 16px (`gap-4`)

## Motion

- **Page entrance:** Staggered fade-up (Framer Motion, 80ms delay between items)
- **Hover:** Border color shift to `primary/20`, subtle lift on bento tiles
- **Transitions:** 200-300ms ease
- **AI streaming:** 20ms character interval for typewriter effect

## Component Patterns

- **Bento grid:** 12-column responsive grid for dashboard widgets
- **Split pane:** Notes editor (edit/preview + metadata sidebar)
- **Sheet:** Task detail from right side
- **Command palette:** Cmd+K global search overlay
- **Admin tables:** Dense data tables with inline actions
- **Empty states:** Icon + heading + CTA button

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+K | Open command palette |
| ? | Show shortcuts overlay |
| Esc | Close dialog/deselect |

## Responsive Breakpoints

- Mobile: sidebar collapses to icon-only
- Tablet (md): 2-column bento grid
- Desktop (lg): 4-column bento grid, notes metadata sidebar visible
- Wide (xl): AI context panel visible
