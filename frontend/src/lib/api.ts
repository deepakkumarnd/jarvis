export type Bookmark = {
  id: number
  name: string
  link: string
  created_at: string
  updated_at: string
}

export type BookmarkInput = Pick<Bookmark, 'name' | 'link'>

export type PaginationMeta = {
  page: number
  per_page: number
  total_count: number
  total_pages: number
}

export type Paginated<T> = {
  data: T[]
  meta: PaginationMeta
}

/** Field errors as returned by Rails, e.g. { link: ["must be a valid http(s) URL"] } */
export type FieldErrors = Partial<Record<string, string[]>>

export class ApiError extends Error {
  status: number
  fieldErrors: FieldErrors

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(response.status, body.error ?? `Request failed (${response.status})`, body.errors)
  }

  return response.status === 204 ? (undefined as T) : response.json()
}

export type HealthStatus = {
  ok: boolean
  status: number
  latencyMs: number
  checkedAt: Date
}

/** Calls the Rails health check (GET /up), which returns 200 when the app boots without errors. */
export async function checkBackendHealth(): Promise<HealthStatus> {
  const started = performance.now()
  const response = await fetch('/up', { cache: 'no-store' })
  const health = {
    ok: response.ok,
    status: response.status,
    latencyMs: Math.round(performance.now() - started),
    checkedAt: new Date(),
  }
  if (!health.ok) throw new ApiError(response.status, `Backend health check failed (${response.status})`)
  return health
}

export const bookmarksApi = {
  list: (page: number) => request<Paginated<Bookmark>>(`/api/bookmarks?page=${page}`),

  search: (query: string, page: number) =>
    request<Paginated<Bookmark>>(`/api/bookmarks/search?${new URLSearchParams({ q: query, page: String(page) })}`),

  create: (input: BookmarkInput) =>
    request<Bookmark>('/api/bookmarks', { method: 'POST', body: JSON.stringify({ bookmark: input }) }),

  update: (id: number, input: BookmarkInput) =>
    request<Bookmark>(`/api/bookmarks/${id}`, { method: 'PATCH', body: JSON.stringify({ bookmark: input }) }),

  destroy: (id: number) => request<void>(`/api/bookmarks/${id}`, { method: 'DELETE' }),
}
