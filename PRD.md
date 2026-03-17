# PRD: Payment Reconciliation Portal (UpdatesPortal)

## 1. Overview

A daily payment reconciliation system where a **Master** user tracks payments made through outsourcing partners (B-accounts). Each B-account manages multiple payment groups (P-groups), and the Master maintains their own payment ledger (N-names). The system calculates the **difference** between what B-accounts reported paying vs what the Master recorded — per day.

---

## 2. Actors & Roles

| Role | Description | Auth |
|------|-------------|------|
| **Master** | Business owner. Views all B-accounts, enters N-name amounts, checks daily reconciliation | Full access |
| **B-account** (B1, B2, ...Bn) | Outsourcing partner. Enters payment amounts per user in their assigned P-groups | Own groups only |

---

## 3. Core Concepts

```
Master
├── B1 (account)
│   ├── P1 (group) → [Sai: ₹500, Suresh: ₹300, Naresh: ₹200]
│   ├── P2 (group) → [Ravi: ₹100, Kumar: ₹400]
│   └── P3 (group) → [...]
├── B2 (account)
│   ├── P1 (group) → [...]
│   └── P2 (group) → [...]
│
└── Master's Ledger (for B1)
    ├── N1: ₹600
    ├── N2: ₹300
    └── N3: ₹100

    DIFFERENCE = Sum(all P-groups of B1) - Sum(N-names for B1) = ₹1500 - ₹1000 = ₹500
```

- **P-group**: A named group under a B-account containing a list of people (users) who receive payments.
- **N-names**: Master's own list of payment entries associated with a B-account.
- **Reconciliation**: Daily comparison — `Sum(P-groups) vs Sum(N-names)` per B-account.

---

## 4. User Flows

### 4.1 B-Account Flow (e.g., B1)

1. **Login** → Lands on **today's date** automatically.
2. **Dashboard**: Sees a summary card (total amount entered today, groups completed/total) and a list of all P-groups in **collapsed accordion** view.
3. **Expand a group** (e.g., P1): Sees list of user names, each with:
   - Amount input field
   - Lock button (per entry)
4. **Enter amount** → Click **Lock** → Amount becomes read-only with a locked indicator.
5. **Once all users in a group are locked** → "Submit Group" button activates → Click to submit.
6. **Repeat** for all groups.
7. **Once all groups are submitted** → "Final Submit" button activates on dashboard → Click to finalize the day.
8. After final submit, the day's data is **frozen** — no edits possible.

### 4.2 Master Flow

1. **Login** → Sees list of B-accounts (B1, B2, etc.) as cards.
2. **Click a B-account** (e.g., B1):
   - Top section: Status of all P-groups (submitted / pending) with total amount.
   - Middle section: N-names list with amount input fields for each.
   - Bottom section: **Reconciliation summary**:
     - Total P-group amount: ₹XXXX
     - Total N-names amount: ₹YYYY
     - **Difference: ₹ZZZZ** (highlighted green if 0, red if mismatch)
3. **Date navigation**: Can navigate to past dates to view/check reconciliation history.
4. **Missing day alert**: If yesterday (or any recent day) has incomplete data, show a notification banner: _"B1 did not complete entries for March 16. Click to review."_

---

## 5. Detailed Feature Requirements

### 5.1 Date System
| Requirement | Details |
|------------|---------|
| Default view | Current date (auto-detected) |
| Date picker | Calendar picker + prev/next day arrows |
| Date format | DD-MM-YYYY (Indian locale) |
| Timezone | IST (Asia/Kolkata) — day boundary at 12:00 AM IST |
| Historical access | B-account: read-only past dates. Master: can edit past dates (with indicator) |

### 5.2 Amount Entry & Locking (B-account)
| Requirement | Details |
|------------|---------|
| Input type | Numeric only, no decimals (whole rupees) — or allow 2 decimal places (configurable) |
| Lock behavior | Per-entry lock. Once locked, greyed out + lock icon. Cannot be unlocked by B-account |
| Unlock override | Only Master can unlock a specific entry if B-account made an error |
| Submit group | Only available when ALL entries in group are locked |
| Final submit | Only available when ALL groups are submitted |
| Post-final-submit | Entire day is frozen for that B-account |

### 5.3 Reconciliation (Master)
| Requirement | Details |
|------------|---------|
| Calculation | `Difference = Sum(all P-group amounts for B-account) - Sum(N-name amounts for B-account)` |
| Display | Show per-day difference with color coding |
| History view | Table/list of past N days showing date, P-total, N-total, difference |
| Edit past N-names | Master can edit N-name amounts for past dates (audit logged) |

### 5.4 UI/UX Requirements
| Requirement | Details |
|------------|---------|
| Mobile-first | Primary usage on phones — accordion groups, large touch targets |
| Accordion groups | Groups collapsed by default. Tap to expand. Only one group open at a time (optional) |
| Quick stats | Dashboard top: total amount today, groups done / total |
| Color coding | Green = match (diff 0), Red = mismatch, Yellow = incomplete |
| Loading states | Skeleton loaders for data fetch |
| Offline indicator | Show when network is unavailable |

---

## 6. Edge Cases & Handling

### 6.1 Missed Day (Past Midnight)
- **Scenario**: B1 forgot to log in on March 16, it's now March 17.
- **Handling**:
  - When B1 logs in on March 17, show a **banner**: _"You have incomplete entries for March 16."_
  - Allow B1 to navigate back to March 16 and complete entries (until Master locks that date).
  - Master sees a **warning** on their dashboard: _"B1: March 16 — NOT SUBMITTED"_.
  - Master can set a **cutoff** — e.g., B-accounts can back-fill up to 2 days. After that, only Master can edit.

### 6.2 Partial Submission
- **Scenario**: B1 submitted P1 and P2 but not P3, then closed the app.
- **Handling**:
  - P1 and P2 remain submitted. P3 stays in "in progress" state.
  - Locked entries in P3 are preserved (not lost).
  - Dashboard clearly shows: P1 ✓, P2 ✓, P3 ✗
  - Final submit is blocked until all groups are done.

### 6.3 Wrong Amount Entered & Locked
- **Scenario**: B1 locked ₹500 for Sai but it should be ₹300.
- **Handling**:
  - B1 **cannot** unlock. Must contact Master.
  - Master has an "Unlock Entry" action per locked field.
  - Unlock action is **audit logged** (who, when, old value).
  - After unlock, B1 can re-enter and re-lock.

### 6.4 Master Edits Past Date
- **Scenario**: Master realizes N2 amount on March 14 was wrong.
- **Handling**:
  - Master navigates to March 14, edits N2 amount.
  - Old value is preserved in audit log.
  - Difference recalculates automatically.
  - Visual indicator: _"Edited on March 17"_ next to the field.

### 6.5 New User Added Mid-Month
- **Scenario**: A new person "Ganesh" joins P1 group on March 15.
- **Handling**:
  - Master (or admin) adds "Ganesh" to P1.
  - From March 15 onward, B1 sees Ganesh in P1.
  - Past dates are unaffected (no retroactive addition).

### 6.6 Group with Zero Entries for a Day
- **Scenario**: P5 had no payments today.
- **Handling**:
  - B1 can mark group as "No entries today" (explicit zero-submit).
  - This counts as "submitted" for that group.
  - Alternatively: allow submitting with all ₹0 amounts.

### 6.7 Concurrent Editing
- **Scenario**: B1 has portal open on phone and laptop simultaneously.
- **Handling**:
  - Last-write-wins with optimistic locking.
  - On save/lock, check if value changed since page load. If yes, show conflict warning.

### 6.8 Network Failure During Submit
- **Scenario**: B1 clicks "Submit Group" but network drops.
- **Handling**:
  - Show error toast: _"Submission failed. Please retry."_
  - Data is NOT marked as submitted until server confirms.
  - Retry button available. Locked entries persist locally.

### 6.9 Multiple B-Accounts Sharing Same Group Names
- **Scenario**: B1 has P1 and B2 also has P1.
- **Handling**:
  - Groups are scoped to B-account. B1's P1 and B2's P1 are completely independent.
  - No confusion in Master view because it's nested under each B-account.

### 6.10 Day with Large Discrepancy
- **Scenario**: Difference is unusually large (> configurable threshold).
- **Handling**:
  - Highlight with a red alert on Master dashboard.
  - Optional: require Master to acknowledge/add a note for large discrepancies.

---

## 7. Data Model (Conceptual)

```
Master (1)
 └── B-Account (many)
      ├── name: "B1"
      ├── P-Group (many)
      │    ├── name: "P1"
      │    └── User (many)
      │         ├── name: "Sai"
      │         └── (static, managed by Master)
      └── N-Name (many)
           ├── name: "N1"
           └── (static, managed by Master)

DailyEntry
 ├── date: 2026-03-17
 ├── b_account_id
 ├── p_group_id
 ├── user_id
 ├── amount: 500
 ├── is_locked: true
 ├── locked_at: timestamp
 └── locked_by: user_id

DailyNEntry
 ├── date: 2026-03-17
 ├── b_account_id
 ├── n_name_id
 ├── amount: 600
 └── entered_by: master_id

GroupSubmission
 ├── date: 2026-03-17
 ├── b_account_id
 ├── p_group_id
 ├── status: submitted | pending
 └── submitted_at: timestamp

DaySubmission
 ├── date: 2026-03-17
 ├── b_account_id
 ├── status: finalized | partial | not_started
 └── finalized_at: timestamp

AuditLog
 ├── timestamp
 ├── action: "unlock" | "edit" | "delete"
 ├── actor_id
 ├── entity_type + entity_id
 ├── old_value
 └── new_value
```

---

## 8. Non-Functional Requirements

| Area | Requirement |
|------|------------|
| **Performance** | Page load < 2s on 3G. Amount save < 500ms. |
| **Security** | Role-based access. B-accounts can only see/edit their own data. JWT auth. HTTPS only. |
| **Availability** | 99.5% uptime. Graceful degradation on API failure. |
| **Audit** | All edits, unlocks, and deletes logged with actor + timestamp. |
| **Backup** | Daily automated DB backups. |
| **Scalability** | Support up to 50 B-accounts, 100 P-groups per account, 50 users per group. |

---

## 9. Future Considerations (Out of Scope for V1)

- Export to Excel/PDF (daily or monthly reports)
- Notifications (WhatsApp/SMS) to B-accounts for incomplete days
- Multi-master support (sub-admins)
- Running monthly totals and reconciliation
- Dashboard analytics (charts, trends)
- Bulk import of users/groups via CSV

---

## 10. Success Metrics

- Master can identify daily discrepancies in < 30 seconds
- B-accounts complete daily entry in < 5 minutes
- Zero data loss incidents
- 100% audit trail coverage for edits and unlocks
