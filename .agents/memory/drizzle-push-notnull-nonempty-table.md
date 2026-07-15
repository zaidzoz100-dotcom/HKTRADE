---
name: drizzle-push-notnull-nonempty-table
description: drizzle-kit push fails non-interactively when adding a NOT NULL/UNIQUE column to a table that already has rows.
---

Adding a new `.notNull()` (and/or `.unique()`) column to a Drizzle schema for a table that
already has rows makes `drizzle-kit push` stop and ask an interactive question (e.g. "truncate
table?" or how to backfill). In this environment stdin/stdout aren't a TTY, so the prompt throws
`ERR_MODULE_NOT_FOUND`-style `Interactive prompts require a TTY terminal` and the push aborts.

**Why:** drizzle-kit can't infer a default/backfill value for existing rows when the new column
must be non-null and unique (e.g. a per-user unique `referral_code`), so it always asks rather
than guessing.

**How to apply:** Before running `drizzle-kit push` for such a column, manually run the
migration in three raw-SQL steps via the database skill's `executeSql`:
1. `ALTER TABLE ... ADD COLUMN ... <nullable, no constraint>`
2. Backfill existing rows (e.g. a `DO $$ ... $$` loop generating unique values per row).
3. `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` and/or `ADD CONSTRAINT ... UNIQUE (...)`.

Then `drizzle-kit push` reports "No changes detected" and proceeds cleanly. Columns with a
`.default(...)` (no uniqueness) don't need this — push handles those without prompting.
