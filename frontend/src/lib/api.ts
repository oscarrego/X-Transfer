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

export type TransferEventType = 'start' | 'progress' | 'done'

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

export type TransferEvent = TransferStartEvent | TransferProgressEvent | TransferDoneEvent

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

// ── Transfer ──────────────────────────────────────────────────────────────────

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
        yield JSON.parse(trimmed) as TransferEvent
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
