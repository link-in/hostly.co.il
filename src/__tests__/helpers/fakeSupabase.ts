/**
 * Minimal in-memory fake of the subset of the Supabase JS query builder used
 * across the codebase: `.from(table).select().eq().eq().in().gte().lte()`,
 * `.order()`, `.limit()`, `.single()`/`.maybeSingle()`, `.update().eq().eq().in()`,
 * and `.upsert(rows, { onConflict, ignoreDuplicates })`.
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

interface OrderOptions {
  ascending?: boolean
}

type Mode = 'select' | 'update' | 'upsert'
type SingleMode = 'none' | 'single' | 'maybeSingle'

type FakeResult = { data: FakeRow | FakeRow[] | null; error: { code?: string; message: string } | null }

class FakeQueryBuilder implements PromiseLike<FakeResult> {
  private filters: Array<(row: FakeRow) => boolean> = []
  private mode: Mode = 'select'
  private updatePatch: FakeRow = {}
  private upsertRows: FakeRow[] = []
  private upsertOpts: UpsertOptions = {}
  private orderKey: string | null = null
  private orderAscending = true
  private limitCount: number | null = null
  private singleMode: SingleMode = 'none'

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

  gte(key: string, value: unknown): this {
    this.filters.push((row) => (row[key] as string | number) >= (value as string | number))
    return this
  }

  lte(key: string, value: unknown): this {
    this.filters.push((row) => (row[key] as string | number) <= (value as string | number))
    return this
  }

  order(key: string, opts?: OrderOptions): this {
    this.orderKey = key
    this.orderAscending = opts?.ascending ?? true
    return this
  }

  limit(count: number): this {
    this.limitCount = count
    return this
  }

  single(): this {
    this.singleMode = 'single'
    return this
  }

  maybeSingle(): this {
    this.singleMode = 'maybeSingle'
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

  private applyOrderAndLimit(rows: FakeRow[]): FakeRow[] {
    let result = rows
    if (this.orderKey) {
      const key = this.orderKey
      result = [...result].sort((a, b) => {
        const av = a[key] as string | number
        const bv = b[key] as string | number
        if (av < bv) return this.orderAscending ? -1 : 1
        if (av > bv) return this.orderAscending ? 1 : -1
        return 0
      })
    }
    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount)
    }
    return result
  }

  private execute(): FakeResult {
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

    let matched = this.rows.filter((row) => this.filters.every((f) => f(row)))

    if (this.mode === 'update') {
      matched.forEach((row) => Object.assign(row, this.updatePatch))
      return { data: matched, error: null }
    }

    matched = this.applyOrderAndLimit(matched)

    if (this.singleMode === 'single') {
      if (matched.length === 1) return { data: matched[0], error: null }
      return {
        data: null,
        error: { code: 'PGRST116', message: `Expected 1 row, got ${matched.length}` },
      }
    }

    if (this.singleMode === 'maybeSingle') {
      return { data: matched[0] ?? null, error: null }
    }

    return { data: matched, error: null }
  }

  // Makes the builder awaitable, matching supabase-js's thenable query builders.
  then<TResult1 = FakeResult, TResult2 = never>(
    onfulfilled?: ((value: FakeResult) => TResult1 | PromiseLike<TResult1>) | null,
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
