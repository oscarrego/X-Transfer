import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { startTransfer, TransferProgressEvent, TransferDoneEvent } from '../lib/api'
import ProgressLog from '../components/ProgressLog'
import { Topbar } from './Home'

type TransferState = 'idle' | 'running' | 'done' | 'error'

export default function Transfer() {

  const [channelIds, setChannelIds] = useState<string[]>([])
  const [state, setState] = useState<TransferState>('idle')
  const [events, setEvents] = useState<TransferProgressEvent[]>([])
  const [summary, setSummary] = useState<TransferDoneEvent | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const abortRef = useRef(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('transferIds')
    if (raw) {
      try {
        const ids = JSON.parse(raw) as string[]
        setChannelIds(ids)
      } catch {
        //
      }
    }
  }, [])

  async function runTransfer() {
    if (channelIds.length === 0) return
    abortRef.current = false
    setState('running')
    setEvents([])
    setSummary(null)
    setErrorMsg(null)

    try {
      for await (const event of startTransfer(channelIds)) {
        if (abortRef.current) break

        if (event.type === 'progress') {
          setEvents((prev) => [...prev, event])
        } else if (event.type === 'done') {
          setSummary(event)
          setState('done')
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Transfer failed')
      setState('error')
    }
  }

  async function exportLog() {
    const lines = events.map(
      (e) =>
        `[${e.status.toUpperCase()}] ${e.channelId}${e.reason ? ` — ${e.reason}` : ''}`
    )
    if (summary) {
      lines.push('')
      lines.push(`Total: ${summary.total}`)
      lines.push(`Succeeded: ${summary.succeeded}`)
      lines.push(`Skipped: ${summary.skipped}`)
      lines.push(`Failed: ${summary.failed}`)
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `xt-transfer-log-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const noIds = channelIds.length === 0

  return (
    <>
      <Topbar active="transfer" />
      <main className="layout page">
        <div className="flex-row mb-16">
          <div>
            <div className="page-title">Transfer</div>
            <div className="page-subtitle" style={{ marginBottom: 0 }}>
              {noIds
                ? 'No channels selected. Go to Subscriptions first.'
                : `${channelIds.length} channel${channelIds.length !== 1 ? 's' : ''} queued for transfer`}
            </div>
          </div>
          <div className="ml-auto flex-row">
            {state === 'idle' && !noIds && (
              <button className="btn btn-accent btn-lg" onClick={runTransfer}>
                Start Transfer
              </button>
            )}
            {state === 'running' && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  abortRef.current = true
                  setState('done')
                }}
              >
                Stop
              </button>
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
                  }}
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        {noIds && (
          <div className="empty-state">
            <div className="empty-state-title">Nothing to transfer</div>
            <div className="empty-state-sub" style={{ marginBottom: 20 }}>
              Select channels on the Subscriptions page first
            </div>
            <Link to="/subscriptions">
              <button className="btn btn-primary">Go to Subscriptions →</button>
            </Link>
          </div>
        )}

        {!noIds && (
          <>
            {state === 'idle' && (
              <div className="info-box info-box-note" style={{ maxWidth: 560 }}>
                <span>ⓘ</span>
                <div>
                  <strong>Before you start:</strong> Make sure both accounts are still connected.
                  The transfer will subscribe your <em>target</em> account to all {channelIds.length} selected channels.
                  Channels that are already subscribed will be skipped automatically.
                </div>
              </div>
            )}

            {state === 'error' && (
              <div
                className="info-box mb-16"
                style={{ background: 'var(--error-light)', color: 'var(--error)', border: '1px solid #ffc9c9' }}
              >
                <span>✗</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {summary && state === 'done' && (
              <div className="info-box info-box-success mb-16">
                <span>✓</span>
                <span>
                  Transfer complete — <strong>{summary.succeeded}</strong> subscribed,{' '}
                  <strong>{summary.skipped}</strong> already subscribed,{' '}
                  <strong>{summary.failed}</strong> failed.
                </span>
              </div>
            )}

            {(state === 'running' || state === 'done' || events.length > 0) && (
              <ProgressLog
                events={events}
                total={channelIds.length}
                done={state === 'done'}
              />
            )}

            {state === 'idle' && (
              <div
                style={{
                  border: 'var(--border)',
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                  maxHeight: 320,
                  overflowY: 'auto',
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
                        Channel ID
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelIds.map((id) => (
                      <tr key={id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                        <td style={{ padding: '8px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--gray-700)' }}>
                          {id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}
