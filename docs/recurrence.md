# Recurring tasks

Recurrence lets a task reappear automatically on the **daily list** across days
(habits, routines). It is intentionally scoped to daily lists only; standalone
lists hold one-off tasks.

## Concept

A **recurring task** is a definition owned by a user (their daily stream), not a
row inside a single day. It carries a title and a recurrence rule. On any date
the rule matches, the day's daily list materializes a concrete `Task` instance
so completion state is tracked independently per day.

```
RecurringTask (definition)        Task instances (one per matching day)
  id, ownerId, title, rule   ->     2026-06-21  [ ] Drink water
                                     2026-06-22  [x] Drink water
                                     2026-06-23  [ ] Drink water
```

## Recurrence rule

Stored as structured JSON (no iCal dependency), covering the agreed cases
"every N days", "specific weekdays", and "monthly":

```ts
type RecurrenceRule = {
  freq: 'daily' | 'weekly' | 'monthly'
  interval: number // every N units, >= 1
  byWeekday?: number[] // 0-6 (Sun..Sat), used by weekly
  byMonthday?: number // 1-31, used by monthly
  startDate: string // YYYY-MM-DD anchor
  until?: string | null // YYYY-MM-DD inclusive end, optional
}
```

A pure `occursOn(rule, date)` predicate decides whether the rule fires on a given
local date. It is fully unit-tested and has no I/O, so the scheduling logic lives
in the domain, not in the database.

## Materialization (lazy, on read)

There is no cron job. When the daily list for date `D` is requested for owner
`U`:

1. Auto-provision the daily `List` for `(U, D)` if absent.
2. For each `RecurringTask` of `U` where `occursOn(rule, D)` and no `Task`
   already exists in that day's list with `recurringTaskId = definition.id`,
   create a pending `Task` instance linked back to the definition.
3. Return the day's tasks.

Lazy generation keeps the system stateless between days and avoids a scheduler,
while still giving each day its own independent completion state.

## Data model impact

- New table `recurring_tasks`: `id`, `owner_id` (FK `users`), `title`,
  `rule` (jsonb), `created_at`.
- `tasks` gains `recurring_task_id` (FK `recurring_tasks`, nullable,
  `ON DELETE SET NULL`) so deleting a definition keeps already-created instances.

## Timezone

"Today" is the user's local civil date. Each user stores an IANA `timezone`
(defaulting to `UTC`). It is auto-detected in the browser and synced via
`PATCH /api/v1/account/timezone` **only while still on the `UTC` default**; once
personalized it is left alone. The user can also override it by hand from the
account dialog (a full IANA picker), with a "use device time zone" reset. The client supplies the daily list's `referenceDate` (a
date without time) for the board it is viewing; when the server needs to decide
whether that board is "today" (carry-over) or to provision today's list for a
background flow (digest, bring-to-today), it derives the civil day from
`clock.now()` in the user's timezone via `startOfCivilDay` / `civilDate`. The
`referenceDate` marker stays at UTC midnight of the chosen civil day, so
`occursOn` keeps comparing civil days regardless of offset. Analytics day
buckets are grouped by the same local civil day in SQL
(`completed_at AT TIME ZONE 'UTC' AT TIME ZONE <tz>`), so streaks and the daily
series line up with the user's calendar.
