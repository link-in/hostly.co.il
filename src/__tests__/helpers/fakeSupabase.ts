/**
 * Minimal in-memory fake of the subset of the Supabase JS query builder used
 * by `src/lib/availability/blocking.ts` and `src/lib/availability/cache.ts`:
 * `.from(table).select().eq().eq().in()`, `.update().eq().eq().in()`, and
 * `.upsert(rows, { onConflict, ignoreDuplicates })`.
 *
 * This is NOT a full reimplementation of PostgREST — it only supports the
 * exact call shapes this codebase uses, which keeps it easy to reason about
 * in tests while avoiding any real network/DB access.
 */

export type FakeRow = Record<string, unknown>

interface UpsertOptions {
  onConflict?: string
  ignoreDuplicates?: boolean
}

type Mode = 'select' | 'update' | 'upsert'

class FakeQueryBuilder implements PromiseLike<{ data: FakeRow[] | null; error: null }> {
  private filters: Array<(row: FakeRow) => boolean> = []
  private mode: Mode = 'select'
  private updatePatch: FakeRow = {}
  private upsertRows: FakeRow[] = []
  private upsertOpts: UpsertOptions = {}

  constructor(private rows: FakeRow[]) {}

  select(_columns?: string): this {
    this.mode = 'select'
    return this
  }

  eq(key: string, value: unknown): this {
    this.filters.push((row) => row[key] === value)
    return this
  }

  in(key: string, values: unknown[]): this {
    this.filters.push((row) => values.includes(row[key]))
    return this
  }

  update(patch: FakeRow): this {
    this.mode = 'update'
    this.updatePatch = patch
    return this
  }

  upsert(rows: FakeRow[], opts?: UpsertOptions): this {
    this.mode = 'upsert'
    this.upsertRows = rows
    this.upsertOpts = opts ?? {}
    return this
  }

  private conflictKeys(): string[] {
    return (this.upsertOpts.onConflict ?? 'id').split(',').map((k) => k.trim())
  }

  private execute(): { data: FakeRow[] | null; error: null } {
    if (this.mode === 'upsert') {
      const keys = this.conflictKeys()
      for (const incoming of this.upsertRows) {
        const existingIndex = this.rows.findIndex((row) => keys.every((k) => row[k] === incoming[k]))
        if (existingIndex >= 0) {
          if (!this.upsertOpts.ignoreDuplicates) {
            this.rows[existingIndex] = { ...this.rows[existingIndex], ...incoming }
          }
        } else {
          this.rows.push({ ...incoming })
        }
      }
      return { data: this.upsertRows, error: null }
    }

    const matched = this.rows.filter((row) => this.filters.every((f) => f(row)))

    if (this.mode === 'update') {
      matched.forEach((row) => Object.assign(row, this.updatePatch))
      return { data: matched, error: null }
    }

    return { data: matched, error: null }
  }

  // Makes the builder awaitable, matching supabase-js's thenable query builders.
  then<TResult1 = { data: FakeRow[] | null; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: FakeRow[] | null; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }
}

export interface FakeSupabaseClient {
  from(table: string): FakeQueryBuilder
  /** Direct access to the underlying rows for test assertions/seeding. */
  __table(table: string): FakeRow[]
}

/**
 * Create a fake Supabase client backed by an in-memory table store.
 * Pass `initialRows` to seed the `availability_cache` table (or any table
 * name you use as the key) before the code under test runs.
 */
export function createFakeSupabaseClient(
  initialTables: Record<string, FakeRow[]> = {},
): FakeSupabaseClient {
  const tables: Record<string, FakeRow[]> = {}
  for (const [name, rows] of Object.entries(initialTables)) {
    tables[name] = rows.map((r) => ({ ...r }))
  }

  return {
    from(table: string) {
      if (!tables[table]) tables[table] = []
      return new FakeQueryBuilder(tables[table])
    },
    __table(table: string) {
      return tables[table] ?? []
    },
  }
}
