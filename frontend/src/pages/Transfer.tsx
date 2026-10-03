import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  startTransfer,
  TransferProgressEvent,
  TransferDoneEvent,
  TransferQuotaEvent,
  Channel,
  copyToClipboard,
} from '../lib/api'
import ProgressLog from '../components/ProgressLog'
import QuotaNotice, { isQuotaExceeded } from '../components/QuotaNotice'
import { Topbar } from './Home'

type TransferState = 'idle' | 'running' | 'paused' | 'done' | 'error'

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function handle(e: React.MouseEvent) {
    e.stopPropagation()
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={handle}
      title="Copy channel URL"
      style={{ color: copied ? 'var(--success)' : 'var(--gray-500)' }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}

// ── Quota Modal ───────────────────────────────────────────────────────────────
function QuotaModal({ remaining, onClose }: { remaining: number; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">⚠</div>
        <div className="modal-title">YouTube Quota Limit Reached</div>
        <div className="modal-body">
          <p>
            YouTube allows around <strong>200 subscription transfers per day</strong> on the free quota.
            You have hit this limit for today.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong>{remaining} channels</strong> were not transferred yet. Come back tomorrow and
            run the transfer again — already-subscribed channels will be skipped automatically.
          </p>
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--gray-500)' }}>
            To increase your limit, visit Google Cloud Console and request a quota increase for
            YouTube Data API v3.
          </p>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Skipped / Error Table ─────────────────────────────────────────────────────
function ChannelResultTable({
  title,
  events,
  channelMap,
  statusColor,
}: {
  title: string
  events: TransferProgressEvent[]
  channelMap: Map<string, Channel>
  statusColor: string
}) {
  if (events.length === 0) return null
  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: statusColor,
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>{title}</span>
        <span
          style={{
            background: statusColor,
            color: '#fff',
            borderRadius: 20,
            padding: '1px 8px',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {events.length}
        </span>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th>Channel</th>
              <th>Reason</th>
              <th>Link</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => {
              const ch = channelMap.get(ev.channelId)
              return (
                <tr key={ev.channelId}>
                  <td>
                    {ch?.thumbnail ? (
                      <img
                        className="channel-thumb"
                        src={ch.thumbnail}
                        alt={ch.title}
                        referrerPolicy="no-referrer"
                        style={{ margin: '0 auto', display: 'block' }}
                      />
                    ) : (
                      <div className="channel-thumb" style={{ margin: '0 auto' }} />
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>
                      {ch?.title || ev.channelId}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      {ev.reason || '-'}
                    </span>
                  </td>
                  <td>
                    {ch?.channelUrl ? (
                      <a
                        href={ch.channelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="channel-url"
                      >
                        {ch.channelUrl}
                      </a>
                    ) : (
                      <span className="channel-url">{ev.channelId}</span>
                    )}
                  </td>
                  <td>
                    <CopyBtn text={ch?.channelUrl || `https://www.youtube.com/channel/${ev.channelId}`} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Transfer Page ─────────────────────────────────────────────────────────────
export default function Transfer() {
  const navigate = useNavigate()
  const [allIds, setAllIds] = useState<string[]>([])             // full original list
  const [channelIds, setChannelIds] = useState<string[]>([])     // current batch (remaining after pause)
  const [channelMap, setChannelMap] = useState<Map<string, Channel>>(new Map())
  const [state, setState] = useState<TransferState>('idle')
  const [events, setEvents] = useState<TransferProgressEvent[]>([])
  const [summary, setSummary] = useState<TransferDoneEvent | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [quotaEvent, setQuotaEvent] = useState<TransferQuotaEvent | null>(null)
  const [showQuotaModal, setShowQuotaModal] = useState(false)

  const abortRef = useRef(false)
  const pauseRef = useRef(false)

  useEffect(() => {
    const rawIds = sessionStorage.getItem('transferIds')
    const rawChannels = sessionStorage.getItem('transferChannels')
    if (rawIds) {
      try {
        const ids = JSON.parse(rawIds) as string[]
        setAllIds(ids)
        setChannelIds(ids)
      } catch { /**/ }
    }
    if (rawChannels) {
      try {
        const channels = JSON.parse(rawChannels) as Channel[]
        const map = new Map<string, Channel>()
        channels.forEach((c) => map.set(c.channelId, c))
        setChannelMap(map)
      } catch { /**/ }
    }
  }, [])

  async function runTransfer(ids: string[]) {
    if (ids.length === 0) return
    abortRef.current = false
    pauseRef.current = false
    setState('running')
    setErrorMsg(null)
    setQuotaEvent(null)

    try {
      for await (const event of startTransfer(ids)) {
        // Abort (Stop)
        if (abortRef.current) break

        // Pause — wait in a loop until unpaused or aborted
        while (pauseRef.current && !abortRef.current) {
          await new Promise((r) => setTimeout(r, 200))
        }
        if (abortRef.current) break

        if (event.type === 'progress') {
          setEvents((prev) => [...prev, event])
        } else if (event.type === 'done') {
          setSummary(event)
          setState('done')
        } else if (event.type === 'quota_exceeded') {
          setQuotaEvent(event)
          setShowQuotaModal(true)
          setState('done')
          break
        }
      }

      // If aborted mid-transfer, still mark as done
      if (abortRef.current) {
        setState('done')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Transfer failed')
      setState('error')
    }
  }

  function handleStart() {
    setEvents([])
    setSummary(null)
    runTransfer(channelIds)
  }

  function handlePause() {
    pauseRef.current = true
    setState('paused')
  }

  function handleResume() {
    pauseRef.current = false
    setState('running')
  }

  function handleStop() {
    abortRef.current = true
    pauseRef.current = false
    setState('done')
  }

  async function exportLog() {
    const lines = events.map(
      (e) => {
        const ch = channelMap.get(e.channelId)
        const name = ch?.title || e.channelId
        const url = ch?.channelUrl || `https://www.youtube.com/channel/${e.channelId}`
        return `[${e.status.toUpperCase()}] ${name} - ${url}${e.reason ? ` - ${e.reason}` : ''}`
      }
    )
    if (summary) {
      lines.push('')
      lines.push(`Total: ${summary.total}`)
      lines.push(`Succeeded: ${summary.succeeded}`)
      lines.push(`Skipped: ${summary.skipped}`)
      lines.push(`Failed: ${summary.failed}`)
    }
    if (quotaEvent) {
      lines.push('')
      lines.push(`QUOTA EXCEEDED at channel ${quotaEvent.index} of ${quotaEvent.total}`)
      lines.push(`Remaining channels not transferred: ${quotaEvent.remaining}`)
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `xt-transfer-log-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const noIds = allIds.length === 0
  const skippedEvents = events.filter((e) => e.status === 'skipped')
  const errorEvents = events.filter((e) => e.status === 'error')
  const hasIssues = skippedEvents.length > 0 || errorEvents.length > 0

  return (
    <>
      <Topbar active="transfer" />

      {/* Quota Modal */}
      {showQuotaModal && quotaEvent && (
        <QuotaModal
          remaining={quotaEvent.remaining}
          onClose={() => setShowQuotaModal(false)}
        />
      )}

      <main className="layout page" style={{ paddingBottom: 120 }}>
        {/* ── Header ── */}
        <div className="flex-row mb-16" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="page-title">Transfer</div>
            <div className="page-subtitle" style={{ marginBottom: 0 }}>
              {noIds
                ? 'No channels selected. Go to Subscriptions first.'
                : `${allIds.length} channel${allIds.length !== 1 ? 's' : ''} queued for transfer`}
            </div>
          </div>

          {/* ── Action buttons top-right ── */}
          <div className="ml-auto flex-row" style={{ gap: 8 }}>
            {state === 'idle' && !noIds && (
              <button className="btn btn-accent btn-lg" onClick={handleStart}>
                Start Transfer
              </button>
            )}

            {state === 'running' && (
              <>
                <button
                  className="btn btn-sm"
                  style={{
                    background: 'var(--warning)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                  }}
                  onClick={handlePause}
                >
                  Pause
                </button>
                <button
                  className="btn btn-sm"
                  style={{
                    background: 'var(--error)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    minWidth: 80,
                  }}
                  onClick={handleStop}
                >
                  Stop
                </button>
              </>
            )}

            {state === 'paused' && (
              <>
                <span style={{ fontSize: 13, color: 'var(--warning)', fontWeight: 500, alignSelf: 'center' }}>
                  Paused
                </span>
                <button
                  className="btn btn-accent btn-sm"
                  onClick={handleResume}
                >
                  Resume
                </button>
                <button
                  className="btn btn-sm"
                  style={{
                    background: 'var(--error)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                  }}
                  onClick={handleStop}
                >
                  Stop
                </button>
              </>
            )}

            {(state === 'done' || state === 'error') && (
              <div className="flex-row">
                <button className="btn btn-outline btn-sm" onClick={exportLog}>
                  Export log
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setState('idle')
                    setEvents([])
                    setSummary(null)
                    setQuotaEvent(null)
                  }}
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Empty state ── */}
        {noIds && (
          <div className="empty-state">
            <div className="empty-state-title">Nothing to transfer</div>
            <div className="empty-state-sub" style={{ marginBottom: 20 }}>
              Select channels on the Subscriptions page first
            </div>
            <Link to="/subscriptions">
              <button className="btn btn-primary">Go to Subscriptions</button>
            </Link>
          </div>
        )}

        {!noIds && (
          <>
            {/* ── Info box (idle) ── */}
            {state === 'idle' && (
              <div className="info-box info-box-note" style={{ maxWidth: 560 }}>
                <span>i</span>
                <div>
                  <strong>Before you start:</strong> Make sure both accounts are still connected.
                  The transfer will subscribe your <em>target</em> account to all{' '}
                  {allIds.length} selected channels. Already subscribed channels are skipped automatically.
                </div>
              </div>
            )}

            {/* ── Error box ── */}
            {state === 'error' && (
              isQuotaExceeded(errorMsg) ? (
                <QuotaNotice customMessage={errorMsg || undefined} />
              ) : (
                <div
                  className="info-box mb-16"
                  style={{
                    background: 'var(--error-light)',
                    color: 'var(--error)',
                    border: '1px solid #ffc9c9',
                  }}
                >
                  <span>x</span>
                  <span>{errorMsg}</span>
                </div>
              )
            )}

            {/* ── Quota warning ── */}
            {quotaEvent && (
              <QuotaNotice
                customMessage={`Quota limit hit at channel ${quotaEvent.index} of ${quotaEvent.total}. ${quotaEvent.remaining} channels were not transferred. Come back tomorrow and run again — duplicates are skipped automatically.`}
              />
            )}

            {/* ── Success banner ── */}
            {summary && state === 'done' && !quotaEvent && (
              <div className="info-box info-box-success mb-16">
                <span>v</span>
                <span>
                  Transfer complete -{' '}
                  <strong>{summary.succeeded}</strong> subscribed,{' '}
                  <strong>{summary.skipped}</strong> already subscribed,{' '}
                  <strong>{summary.failed}</strong> failed.
                </span>
              </div>
            )}

            {/* ── Progress log ── */}
            {(state === 'running' || state === 'paused' || state === 'done' || events.length > 0) && (
              <ProgressLog
                events={events}
                total={allIds.length}
                done={state === 'done'}
                paused={state === 'paused'}
                channelMap={channelMap}
              />
            )}

            {/* ── Queue preview (idle only) ── */}
            {state === 'idle' && (
              <div
                style={{
                  border: 'var(--border)',
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                  maxHeight: 320,
                  overflowY: 'auto',
                  marginTop: 16,
                }}
              >
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '10px 16px',
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--gray-500)',
                          borderBottom: 'var(--border)',
                          background: 'var(--gray-100)',
                        }}
                      >
                        Channel
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelIds.map((id) => {
                      const ch = channelMap.get(id)
                      return (
                        <tr key={id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                          <td style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            {ch?.thumbnail && (
                              <img
                                className="channel-thumb"
                                src={ch.thumbnail}
                                alt={ch.title}
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <span style={{ fontWeight: 500, fontSize: 13 }}>
                              {ch?.title || id}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Skipped / Error channel tables (shown when done) ── */}
            {state === 'done' && hasIssues && (
              <div style={{ marginTop: 32 }}>
                <div className="section-label">Review Channels</div>

                <ChannelResultTable
                  title="Skipped - Already Subscribed"
                  events={skippedEvents}
                  channelMap={channelMap}
                  statusColor="var(--warning)"
                />

                <ChannelResultTable
                  title="Failed - Could not subscribe"
                  events={errorEvents}
                  channelMap={channelMap}
                  statusColor="var(--error)"
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Done button fixed at bottom ── */}
      {state === 'done' && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--white)',
            borderTop: 'var(--border)',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
            {summary ? (
              <>
                <strong style={{ color: 'var(--success)' }}>{summary.succeeded}</strong> subscribed &nbsp;·&nbsp;
                <strong style={{ color: 'var(--warning)' }}>{summary.skipped}</strong> skipped &nbsp;·&nbsp;
                <strong style={{ color: 'var(--error)' }}>{summary.failed}</strong> failed
                {quotaEvent && (
                  <> &nbsp;·&nbsp; <strong style={{ color: 'var(--warning)' }}>{quotaEvent.remaining}</strong> not reached (quota)</>
                )}
              </>
            ) : (
              'Transfer stopped'
            )}
          </div>
          <div className="flex-row" style={{ gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={exportLog}>
              Export log
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/')}
            >
              Done - Back to Home
            </button>
          </div>
        </div>
      )}
    </>
  )
}
