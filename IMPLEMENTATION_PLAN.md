# Implementation Plan: UpdatesPortal

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 14 (App Router) + TypeScript | SSR, file-based routing, great mobile perf |
| **UI Library** | Tailwind CSS + shadcn/ui | Fast styling, accessible components, great mobile defaults |
| **State** | React Context + SWR (or TanStack Query) | Simple state management + server data caching with revalidation |
| **Backend** | Next.js API Routes (or separate Express if needed) | Keep it simple — single deployable |
| **Database** | PostgreSQL (via Supabase or Neon) | Relational data model, strong consistency, free tier available |
| **ORM** | Prisma | Type-safe queries, migrations, great DX |
| **Auth** | NextAuth.js (or Supabase Auth) | Role-based auth with minimal setup |
| **Hosting** | Vercel (frontend + API) + Supabase (DB) | Free/cheap tiers, zero-config deploys |

---

## Phase Breakdown

### Phase 1: Foundation (Days 1-3)
**Goal**: Project scaffold, DB schema, auth, basic routing

- [ ] Initialize Next.js 14 project with TypeScript + Tailwind + shadcn/ui
- [ ] Set up Prisma with PostgreSQL
- [ ] Create DB schema (all tables from PRD data model)
- [ ] Run initial migration
- [ ] Set up NextAuth with credential provider (email/password)
- [ ] Create role-based middleware (Master vs B-account)
- [ ] Create basic layout: sidebar/header, mobile-responsive shell
- [ ] Seed script: create Master, 2 B-accounts, sample P-groups with users, sample N-names

**Deliverable**: Login works. Master and B-account see different dashboards (empty).

---

### Phase 2: B-Account Portal (Days 4-7)
**Goal**: B-account can enter, lock, and submit daily amounts

- [ ] **Dashboard page** (`/dashboard`)
  - Auto-detect today's date (IST)
  - Show summary card: total amount, groups completed/total
  - List all P-groups as accordion items (collapsed)
  - Date display (read-only for today, picker for past dates in read-only mode)

- [ ] **Group accordion component**
  - Expand to show list of users
  - Each user row: name + amount input + lock button
  - Lock action: API call → mark entry as locked → disable input
  - Visual states: empty, entered, locked

- [ ] **API routes**
  - `GET /api/entries?date=YYYY-MM-DD` — fetch all entries for B-account for date
  - `POST /api/entries` — save/update an entry amount
  - `POST /api/entries/lock` — lock a specific entry
  - `POST /api/groups/submit` — submit a group (validate all entries locked)
  - `POST /api/day/finalize` — final submit (validate all groups submitted)

- [ ] **Submit group** button (active only when all locked)
- [ ] **Final submit** button (active only when all groups submitted)
- [ ] **Post-submit state**: entire day read-only with "Submitted" badge

**Deliverable**: B-account can fully complete a day's entries.

---

### Phase 3: Master Portal (Days 8-11)
**Goal**: Master views B-account data, enters N-names, sees reconciliation

- [ ] **Master dashboard** (`/master`)
  - List of B-accounts as cards
  - Each card shows: name, today's status (submitted/pending/not started), total P-amount

- [ ] **B-account detail page** (`/master/b/[id]`)
  - **Top**: P-groups status overview (list with ✓/✗ and amounts)
  - **Middle**: N-names entry section
    - Each N-name: name + amount input + save button
  - **Bottom**: Reconciliation box
    - Total P-groups: ₹XXXX
    - Total N-names: ₹YYYY
    - Difference: ₹ZZZZ (color-coded)

- [ ] **Date navigation**
  - Date picker + prev/next arrows
  - Navigate to any past date
  - Shows reconciliation for selected date

- [ ] **API routes**
  - `GET /api/master/b-accounts` — list all B-accounts with today's status
  - `GET /api/master/b/[id]?date=YYYY-MM-DD` — full detail for a B-account on a date
  - `POST /api/master/n-entries` — save N-name amount
  - `GET /api/master/reconciliation/[bId]?date=YYYY-MM-DD` — get reconciliation data

- [ ] **Missing day alerts**
  - Check if yesterday has incomplete data for any B-account
  - Show banner with link to that date

**Deliverable**: Master can view all data and reconcile daily.

---

### Phase 4: Edge Cases & Admin (Days 12-14)
**Goal**: Handle all edge cases from PRD, admin features

- [ ] **Unlock flow**
  - Master can click "Unlock" on any locked entry in B-account's data
  - Confirmation dialog
  - Audit log entry created
  - B-account sees entry unlocked on next load

- [ ] **Back-fill for missed days**
  - B-account can navigate to past dates (within cutoff window)
  - Enter/lock/submit for past dates
  - Master sees which dates are back-filled with indicator

- [ ] **Master edit past N-names**
  - Edit button on past date N-name entries
  - "Edited on [date]" indicator
  - Audit log entry

- [ ] **"No entries today" for empty groups**
  - Button to mark group as zero/no-entries
  - Counts as submitted

- [ ] **Admin section** (Master only)
  - Manage B-accounts (add/edit)
  - Manage P-groups per B-account (add/edit/remove users)
  - Manage N-names per B-account (add/edit)

- [ ] **Audit log viewer** (Master only)
  - Filterable table of all audit events

**Deliverable**: All edge cases handled. Master can manage system configuration.

---

### Phase 5: Polish & Deploy (Days 15-17)
**Goal**: UI polish, mobile optimization, testing, deploy

- [ ] **Mobile optimization**
  - Test all flows on 375px width
  - Touch-friendly tap targets (min 44px)
  - Smooth accordion animations
  - Bottom-anchored action buttons on mobile

- [ ] **UI polish**
  - Loading skeletons
  - Toast notifications for actions
  - Empty states
  - Error boundaries
  - Confirmation dialogs for destructive actions

- [ ] **Testing**
  - API route tests (critical paths)
  - Manual testing of all flows
  - Cross-browser check (Chrome, Safari mobile)

- [ ] **Deploy**
  - Set up Vercel project
  - Configure environment variables
  - Set up Supabase/Neon production database
  - Run migrations on production
  - Seed production with real B-accounts/groups/names
  - DNS + custom domain (if applicable)

**Deliverable**: Production-ready application live.

---

## Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // hashed
  name      String
  role      Role     // MASTER or B_ACCOUNT
  bAccountId String? // null for master, set for B-account users
  bAccount  BAccount? @relation(fields: [bAccountId], references: [id])
  createdAt DateTime @default(now())
}

model BAccount {
  id       String    @id @default(cuid())
  name     String    // "B1", "B2"
  users    User[]
  pGroups  PGroup[]
  nNames   NName[]
  createdAt DateTime @default(now())
}

model PGroup {
  id         String    @id @default(cuid())
  name       String    // "P1", "P2"
  bAccountId String
  bAccount   BAccount  @relation(fields: [bAccountId], references: [id])
  members    PGroupMember[]
  createdAt  DateTime  @default(now())

  @@unique([bAccountId, name])
}

model PGroupMember {
  id       String  @id @default(cuid())
  name     String  // "Sai", "Suresh"
  pGroupId String
  pGroup   PGroup  @relation(fields: [pGroupId], references: [id])
  isActive Boolean @default(true)
  createdAt DateTime @default(now())

  @@unique([pGroupId, name])
}

model NName {
  id         String   @id @default(cuid())
  name       String   // "N1", "N2"
  bAccountId String
  bAccount   BAccount @relation(fields: [bAccountId], references: [id])
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())

  @@unique([bAccountId, name])
}

model DailyEntry {
  id            String   @id @default(cuid())
  date          DateTime @db.Date
  bAccountId    String
  pGroupId      String
  memberId      String
  amount        Int      // in smallest unit (paise) or whole rupees
  isLocked      Boolean  @default(false)
  lockedAt      DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([date, memberId])
}

model DailyNEntry {
  id         String   @id @default(cuid())
  date       DateTime @db.Date
  bAccountId String
  nNameId    String
  amount     Int
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([date, nNameId])
}

model GroupSubmission {
  id         String   @id @default(cuid())
  date       DateTime @db.Date
  bAccountId String
  pGroupId   String
  status     SubmissionStatus @default(PENDING)
  submittedAt DateTime?

  @@unique([date, pGroupId])
}

model DaySubmission {
  id          String   @id @default(cuid())
  date        DateTime @db.Date
  bAccountId  String
  status      DayStatus @default(NOT_STARTED)
  finalizedAt DateTime?

  @@unique([date, bAccountId])
}

model AuditLog {
  id         String   @id @default(cuid())
  timestamp  DateTime @default(now())
  action     String   // "unlock", "edit", "delete"
  actorId    String
  entityType String   // "DailyEntry", "DailyNEntry"
  entityId   String
  oldValue   String?
  newValue   String?
}

enum Role {
  MASTER
  B_ACCOUNT
}

enum SubmissionStatus {
  PENDING
  SUBMITTED
}

enum DayStatus {
  NOT_STARTED
  PARTIAL
  FINALIZED
}
```

---

## Key API Endpoints Summary

| Method | Endpoint | Actor | Description |
|--------|----------|-------|-------------|
| POST | `/api/auth/login` | All | Login |
| GET | `/api/entries?date=` | B-account | Get all entries for today |
| POST | `/api/entries` | B-account | Save/update entry amount |
| POST | `/api/entries/lock` | B-account | Lock an entry |
| POST | `/api/entries/unlock` | Master | Unlock an entry |
| POST | `/api/groups/submit` | B-account | Submit a group |
| POST | `/api/day/finalize` | B-account | Final submit for day |
| GET | `/api/master/b-accounts` | Master | List B-accounts + status |
| GET | `/api/master/b/[id]?date=` | Master | B-account detail + reconciliation |
| POST | `/api/master/n-entries` | Master | Save N-name amount |
| GET | `/api/master/reconciliation/[bId]?date=` | Master | Reconciliation data |
| GET | `/api/admin/audit-log` | Master | View audit logs |
| POST | `/api/admin/b-accounts` | Master | Manage B-accounts |
| POST | `/api/admin/p-groups` | Master | Manage P-groups |
| POST | `/api/admin/n-names` | Master | Manage N-names |

---

## Folder Structure

```
updatesportal/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              (login)
│   │   ├── dashboard/            (B-account pages)
│   │   │   └── page.tsx
│   │   ├── master/               (Master pages)
│   │   │   ├── page.tsx
│   │   │   └── b/[id]/page.tsx
│   │   └── admin/                (Admin pages)
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   ├── entries/
│   │   ├── groups/
│   │   ├── day/
│   │   ├── master/
│   │   └── admin/
│   ├── components/
│   │   ├── ui/                   (shadcn components)
│   │   ├── GroupAccordion.tsx
│   │   ├── EntryRow.tsx
│   │   ├── ReconciliationBox.tsx
│   │   ├── DateNavigation.tsx
│   │   ├── SummaryCard.tsx
│   │   └── MissedDayBanner.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── PRD.md
```
