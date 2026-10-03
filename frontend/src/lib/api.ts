// Typed API client for the X Transfer backend

export interface AccountStatus {
  connected: boolean
  id?: string
  email?: string
  name?: string
  picture?: string
}

export interface AuthStatus {
  source: AccountStatus
  target: AccountStatus
}

export interface Channel {
  channelId: string
  title: string
  description: string
  thumbnail: string
  channelUrl: string
  publishedAt: string
}

export interface SubscriptionsResponse {
  subscriptions: Channel[]
  total: number
}

// ── Content types ─────────────────────────────────────────────────────────────

export interface VideoItem {
  videoId: string
  title: string
  channelTitle: string
  thumbnail: string
  videoUrl: string
  addedAt?: string
  position?: number
}

export interface PlaylistItem {
  playlistId: string
  title: string
  description: string
  thumbnail: string
  videoCount: number
  privacy: 'public' | 'private' | 'unlisted'
  playlistUrl: string
  videos?: VideoItem[] // loaded on demand
}

export interface WatchLaterResponse {
  videos: VideoItem[]
  total: number
}

export interface PlaylistsResponse {
  playlists: PlaylistItem[]
  total: number
}

export interface PlaylistVideosResponse {
  videos: VideoItem[]
  total: number
}

// ── Transfer event types ──────────────────────────────────────────────────────

export type TransferEventType = 'start' | 'progress' | 'done' | 'quota_exceeded'

export interface TransferStartEvent {
  type: 'start'
  total: number
}

export interface TransferProgressEvent {
  type: 'progress'
  index: number
  total: number
  channelId: string
  status: 'success' | 'skipped' | 'error'
  reason?: string
}

export interface TransferDoneEvent {
  type: 'done'
  succeeded: number
  skipped: number
  failed: number
  total: number
}

export interface TransferQuotaEvent {
  type: 'quota_exceeded'
  channelId?: string
  index: number
  total: number
  remaining: number
}

export type TransferEvent =
  | TransferStartEvent
  | TransferProgressEvent
  | TransferDoneEvent
  | TransferQuotaEvent

// ── Content transfer event types ──────────────────────────────────────────────

export interface ContentProgressEvent {
  type: 'progress'
  index: number
  total: number
  itemId: string
  status: 'success' | 'skipped' | 'error'
  reason?: string
}

export interface ContentQuotaEvent {
  type: 'quota_exceeded'
  index: number
  total: number
  remaining: number
}

export interface ContentDoneEvent {
  type: 'done'
  succeeded: number
  skipped: number
  failed: number
  total: number
}

export interface PlaylistCreatedEvent {
  type: 'playlist_created'
  index: number
  total: number
  title: string
  newPlaylistId: string
}

export interface PlaylistFetchedEvent {
  type: 'playlist_fetched'
  title: string
  videoCount: number
}

export interface PlaylistDoneEvent {
  type: 'playlist_done'
  index: number
  total: number
  title: string
  newPlaylistId?: string
  videoSucceeded?: number
  videoFailed?: number
  status: 'success' | 'error'
  reason?: string
}

export interface PlaylistTransferDoneEvent {
  type: 'done'
  succeeded: number
  failed: number
  total: number
}

export type ContentEvent =
  | { type: 'start'; total: number }
  | ContentProgressEvent
  | ContentQuotaEvent
  | ContentDoneEvent

export type PlaylistTransferEvent =
  | { type: 'start'; total: number }
  | PlaylistCreatedEvent
  | PlaylistFetchedEvent
  | PlaylistDoneEvent
  | ContentQuotaEvent
  | PlaylistTransferDoneEvent

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function getAuthStatus(): Promise<AuthStatus> {
  const res = await fetch('/auth/status', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to get auth status')
  return res.json()
}

export function connectSource() {
  window.location.href = '/auth/google/source'
}

export function connectTarget() {
  window.location.href = '/auth/google/target'
}

export async function disconnectAccount(role: 'source' | 'target') {
  await fetch(`/auth/logout/${role}`, {
    method: 'POST',
    credentials: 'include',
  })
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export async function fetchSubscriptions(): Promise<SubscriptionsResponse> {
  const res = await fetch('/api/subscriptions', { credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || 'Failed to fetch subscriptions')
  }
  return res.json()
}

// ── Subscription Transfer ─────────────────────────────────────────────────────

export async function* startTransfer(
  channelIds: string[]
): AsyncGenerator<TransferEvent> {
  const res = await fetch('/api/transfer', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelIds }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || 'Transfer failed')
  }

  yield* streamNDJSON<TransferEvent>(res)
}

// ── Content — Watch Later ─────────────────────────────────────────────────────

export async function fetchWatchLater(): Promise<WatchLaterResponse> {
  const res = await fetch('/api/content/watchlater', { credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const error = err as any
    if (error.error === 'api_limitation') {
      throw new Error('api_limitation:' + (error.message || ''))
    }
    throw new Error(error.error || 'Failed to fetch Watch Later')
  }
  return res.json()
}

export async function* transferWatchLater(
  videoIds: string[]
): AsyncGenerator<ContentEvent> {
  const res = await fetch('/api/content/watchlater/transfer', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoIds }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || 'Transfer failed')
  }
  yield* streamNDJSON<ContentEvent>(res)
}

// ── Content — Playlists ───────────────────────────────────────────────────────

export async function fetchPlaylists(): Promise<PlaylistsResponse> {
  const res = await fetch('/api/content/playlists', { credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || 'Failed to fetch playlists')
  }
  return res.json()
}

export async function fetchPlaylistVideos(playlistId: string): Promise<PlaylistVideosResponse> {
  const res = await fetch(`/api/content/playlists/${playlistId}/videos`, {
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || 'Failed to fetch playlist videos')
  }
  return res.json()
}

export async function* transferPlaylists(
  playlists: Array<{
    playlistId: string
    title: string
    description: string
    privacy: string
    videoCount: number
  }>
): AsyncGenerator<PlaylistTransferEvent> {
  const res = await fetch('/api/content/playlists/transfer', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playlists }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || 'Transfer failed')
  }
  yield* streamNDJSON<PlaylistTransferEvent>(res)
}

// ── Shared NDJSON stream reader ───────────────────────────────────────────────

async function* streamNDJSON<T>(res: Response): AsyncGenerator<T> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        yield JSON.parse(trimmed) as T
      } catch {
        // ignore malformed lines
      }
    }
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}
