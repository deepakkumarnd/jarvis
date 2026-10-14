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

export type CpuMetrics = {
  model: string | null
  logical_cores: number
  physical_cores: number | null
  sockets: number
  mhz: number | null
  usage_percent: number
  per_core_usage_percent: number[]
  load_average: Record<'1m' | '5m' | '15m', number>
}

export type MemoryMetrics = {
  total_bytes: number
  free_bytes: number
  available_bytes: number
  used_bytes: number
  buffers_bytes: number
  cached_bytes: number
  used_percent: number
  swap: { total_bytes: number; free_bytes: number; used_bytes: number; used_percent: number }
}

export type FilesystemMetrics = {
  filesystem: string
  mount: string
  total_bytes: number
  used_bytes: number
  free_bytes: number
  used_percent: number
}

export type DiskDeviceMetrics = {
  name: string
  reads: number
  read_bytes: number
  writes: number
  written_bytes: number
  io_in_progress: number
  io_time_ms: number
}

export type NetworkInterfaceMetrics = {
  name: string
  rx_bytes: number
  rx_packets: number
  rx_errors: number
  rx_dropped: number
  tx_bytes: number
  tx_packets: number
  tx_errors: number
  tx_dropped: number
  state: string | null
  mac: string | null
  mtu: number | null
  speed_mbps: number | null
  loopback: boolean
  virtual: boolean
  addresses: { family: 'ipv4' | 'ipv6'; address: string }[]
}

/** Host metrics from /up. A section is null when the backend couldn't read it (e.g. not Linux). */
export type SystemMetrics = {
  host: { hostname: string; os: string; kernel: string; architecture: string; uptime_seconds: number; booted_at: string } | null
  cpu: CpuMetrics | null
  memory: MemoryMetrics | null
  disk: { filesystems: FilesystemMetrics[]; devices: DiskDeviceMetrics[] } | null
  network: NetworkInterfaceMetrics[] | null
  process: {
    pid: number
    ruby_version: string
    rails_version: string
    environment: string
    rss_bytes: number
    threads: number
    uptime_seconds: number | null
    cpu_time_seconds: number
  } | null
}

/** Bytes per second since the previous sample, keyed by device / interface name. */
export type ThroughputRates = {
  disk: Record<string, { read: number; write: number }>
  network: Record<string, { rx: number; tx: number }>
}

export type HealthStatus = {
  ok: true
  status: number
  latencyMs: number
  checkedAt: Date
  serverTime: string
  database: { status: 'ok'; latency_ms: number }
  /** Absent when the backend withholds metrics (production without a token). */
  metrics?: SystemMetrics
  /** Null on the first sample, before there is anything to compare against. */
  rates: ThroughputRates | null
}

type HealthResponse = {
  status: 'ok' | 'error'
  time: string
  checks: { database: { status: 'ok' | 'error'; latency_ms?: number; error?: string } }
  metrics?: SystemMetrics
}

function throughputRates(current: HealthResponse, previous?: HealthStatus): ThroughputRates | null {
  const prev = previous?.metrics
  const now = current.metrics
  if (!prev || !now || !previous) return null
  const seconds = (Date.parse(current.time) - Date.parse(previous.serverTime)) / 1000
  if (seconds <= 0) return null
  // Counters reset on reboot or device changes; never report a negative rate
  const rate = (a: number, b: number) => Math.max(0, (a - b) / seconds)

  const disk: ThroughputRates['disk'] = {}
  for (const d of now.disk?.devices ?? []) {
    const p = prev.disk?.devices.find((x) => x.name === d.name)
    if (p) disk[d.name] = { read: rate(d.read_bytes, p.read_bytes), write: rate(d.written_bytes, p.written_bytes) }
  }
  const network: ThroughputRates['network'] = {}
  for (const n of now.network ?? []) {
    const p = prev.network?.find((x) => x.name === n.name)
    if (p) network[n.name] = { rx: rate(n.rx_bytes, p.rx_bytes), tx: rate(n.tx_bytes, p.tx_bytes) }
  }
  return { disk, network }
}

/**
 * Calls the health check (GET /up): 200 with database status and host metrics, 503 when unhealthy.
 * Pass the previous result to get disk and network throughput since that sample.
 */
export async function checkBackendHealth(previous?: HealthStatus): Promise<HealthStatus> {
  const started = performance.now()
  const response = await fetch('/up', { cache: 'no-store', headers: { Accept: 'application/json' } })
  const latencyMs = Math.round(performance.now() - started)
  const body: HealthResponse | null = await response.json().catch(() => null)

  if (!response.ok || body?.status !== 'ok') {
    const dbError = body?.checks.database.error
    throw new ApiError(response.status, dbError ? `Database unavailable (${dbError})` : `Backend health check failed (${response.status})`)
  }

  return {
    ok: true,
    status: response.status,
    latencyMs,
    checkedAt: new Date(),
    serverTime: body.time,
    database: { status: 'ok', latency_ms: body.checks.database.latency_ms ?? 0 },
    metrics: body.metrics,
    rates: throughputRates(body, previous),
  }
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

export type Note = {
  id: number
  title: string
  /** Markdown */
  body: string
  created_at: string
  updated_at: string
}

/** A note as returned by the list endpoint: a Markdown preview instead of the full body. */
export type NoteSummary = Omit<Note, 'body'> & {
  preview: string
  truncated: boolean
}

export type NoteInput = Pick<Note, 'title' | 'body'>

export const notesApi = {
  list: (page: number) => request<Paginated<NoteSummary>>(`/api/notes?page=${page}`),

  get: (id: number) => request<Note>(`/api/notes/${id}`),

  create: (input: NoteInput) => request<Note>('/api/notes', { method: 'POST', body: JSON.stringify({ note: input }) }),

  update: (id: number, input: NoteInput) =>
    request<Note>(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify({ note: input }) }),

  destroy: (id: number) => request<void>(`/api/notes/${id}`, { method: 'DELETE' }),
}

export type Todo = {
  id: number
  title: string
  completed: boolean
  /** ISO date (YYYY-MM-DD) or null */
  due_on: string | null
  created_at: string
  updated_at: string
}

export type TodoInput = Partial<Pick<Todo, 'title' | 'completed' | 'due_on'>>

export type TodoStatus = 'all' | 'active' | 'completed'

export type TodoListMeta = PaginationMeta & {
  status: TodoStatus
  counts: Record<TodoStatus, number>
}

export const todosApi = {
  list: (status: TodoStatus, page: number) =>
    request<{ data: Todo[]; meta: TodoListMeta }>(`/api/todos?${new URLSearchParams({ status, page: String(page) })}`),

  create: (input: TodoInput) => request<Todo>('/api/todos', { method: 'POST', body: JSON.stringify({ todo: input }) }),

  update: (id: number, input: TodoInput) =>
    request<Todo>(`/api/todos/${id}`, { method: 'PATCH', body: JSON.stringify({ todo: input }) }),

  destroy: (id: number) => request<void>(`/api/todos/${id}`, { method: 'DELETE' }),

  destroyCompleted: () => request<{ deleted: number }>('/api/todos/completed', { method: 'DELETE' }),
}

export const MAX_FILE_BYTES = 100 * 1024 * 1024
export const MAX_FILE_LABEL = `${MAX_FILE_BYTES / 1024 / 1024} MB`
export const MAX_FILES_PER_UPLOAD = 20

export type PreviewKind = 'image' | 'pdf' | 'text'

export type DocumentFileInfo = {
  id: number
  filename: string
  content_type: string
  byte_size: number
  preview_kind: PreviewKind | null
  created_at: string
}

export type DocumentSummary = {
  id: number
  name: string
  file_count: number
  total_bytes: number
  content_types: string[]
  filenames: string[]
  created_at: string
  updated_at: string
}

export type DocumentDetail = {
  id: number
  name: string
  total_bytes: number
  files: DocumentFileInfo[]
  created_at: string
  updated_at: string
}

/**
 * POSTs multipart form data with upload progress (fetch can't report upload progress).
 * Rejects with ApiError, including field errors on 422.
 */
function uploadForm<T>(url: string, form: FormData, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.responseType = 'json'
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress?.(event.loaded / event.total)
    xhr.onload = () => {
      const body = xhr.response ?? {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as T)
      else reject(new ApiError(xhr.status, body.error ?? `Upload failed (${xhr.status})`, body.errors))
    }
    xhr.onerror = () => reject(new ApiError(0, 'Upload failed: network error'))
    xhr.send(form)
  })
}

export const documentsApi = {
  list: (query: string, page: number) =>
    request<Paginated<DocumentSummary>>(`/api/documents?${new URLSearchParams({ ...(query && { q: query }), page: String(page) })}`),

  get: (id: number) => request<DocumentDetail>(`/api/documents/${id}`),

  create: (name: string, files: File[], onProgress?: (fraction: number) => void) => {
    const form = new FormData()
    form.append('name', name)
    files.forEach((file) => form.append('files[]', file))
    return uploadForm<DocumentDetail>('/api/documents', form, onProgress)
  },

  addFiles: (id: number, files: File[], onProgress?: (fraction: number) => void) => {
    const form = new FormData()
    files.forEach((file) => form.append('files[]', file))
    return uploadForm<DocumentDetail>(`/api/documents/${id}/files`, form, onProgress)
  },

  rename: (id: number, name: string) =>
    request<DocumentDetail>(`/api/documents/${id}`, { method: 'PATCH', body: JSON.stringify({ document: { name } }) }),

  destroy: (id: number) => request<void>(`/api/documents/${id}`, { method: 'DELETE' }),

  deleteFile: (id: number, fileId: number) => request<DocumentDetail>(`/api/documents/${id}/files/${fileId}`, { method: 'DELETE' }),

  /** Decrypting download URL; inline for previews. */
  fileUrl: (id: number, fileId: number, { inline = false } = {}) =>
    `/api/documents/${id}/files/${fileId}/download${inline ? '?disposition=inline' : ''}`,
}

export type CredentialKind = 'username_password' | 'api_key' | 'secret_text'

/** A credential as listed: identifying fields only (e.g. username); secret values are fetched on demand. */
export type Credential = {
  id: number
  name: string
  kind: CredentialKind
  fields: Record<string, string>
  secret_fields: string[]
  created_at: string
  updated_at: string
}

export type CredentialGroupSummary = {
  id: number
  name: string
  credential_count: number
  kinds: CredentialKind[]
  credential_names: string[]
  created_at: string
  updated_at: string
}

export type CredentialGroup = {
  id: number
  name: string
  credentials: Credential[]
  created_at: string
  updated_at: string
}

export type CredentialInput = { name: string; kind?: CredentialKind; fields: Record<string, string> }

export const credentialsApi = {
  listGroups: (query: string, page: number) =>
    request<Paginated<CredentialGroupSummary>>(
      `/api/credential_groups?${new URLSearchParams({ ...(query && { q: query }), page: String(page) })}`,
    ),

  getGroup: (id: number) => request<CredentialGroup>(`/api/credential_groups/${id}`),

  createGroup: (name: string) =>
    request<CredentialGroup>('/api/credential_groups', { method: 'POST', body: JSON.stringify({ credential_group: { name } }) }),

  renameGroup: (id: number, name: string) =>
    request<CredentialGroup>(`/api/credential_groups/${id}`, { method: 'PATCH', body: JSON.stringify({ credential_group: { name } }) }),

  destroyGroup: (id: number) => request<void>(`/api/credential_groups/${id}`, { method: 'DELETE' }),

  create: (groupId: number, input: CredentialInput) =>
    request<Credential>(`/api/credential_groups/${groupId}/credentials`, { method: 'POST', body: JSON.stringify({ credential: input }) }),

  /** Blank secret fields keep their current value. */
  update: (groupId: number, id: number, input: CredentialInput) =>
    request<Credential>(`/api/credential_groups/${groupId}/credentials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ credential: input }),
    }),

  destroy: (groupId: number, id: number) => request<void>(`/api/credential_groups/${groupId}/credentials/${id}`, { method: 'DELETE' }),

  /** The only call that returns secret values. Deliberately not cached anywhere. */
  fetchSecrets: async (groupId: number, id: number) =>
    (await request<{ id: number; secrets: Record<string, string> }>(`/api/credential_groups/${groupId}/credentials/${id}/secret`, { cache: 'no-store' }))
      .secrets,
}

export type Settings = {
  brand_name: string
  tagline: string
  updated_at: string
}

export const settingsApi = {
  get: () => request<Settings>('/api/settings'),
  update: (input: Pick<Settings, 'brand_name' | 'tagline'>) =>
    request<Settings>('/api/settings', { method: 'PATCH', body: JSON.stringify({ setting: input }) }),
}
