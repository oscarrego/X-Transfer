import { TransferProgressEvent } from '../lib/api'

interface ProgressLogProps {
  events: TransferProgressEvent[]
  total: number
  done: boolean
}

type StatusType = 'success' | 'skipped' | 'error' | 'pending'

function StatusIcon({ status }: { status: StatusType }) {
  if (status === 'success') return <span style={{ color: 'var(--success)' }}>✓</span>
  if (status === 'skipped') return <span style={{ color: 'var(--warning)' }}>↷</span>
  if (status === 'error') return <span style={{ color: 'var(--error)' }}>✗</span>
  return <span className="spinner" />
}

export default function ProgressLog({ events, total, done }: ProgressLogProps) {
  const succeeded = events.filter((e) => e.status === 'success').length
  const skipped = events.filter((e) => e.status === 'skipped').length
  const failed = events.filter((e) => e.status === 'error').length
  const pending = total - events.length
  const pct = total > 0 ? Math.round((events.length / total) * 100) : 0

  return (
    <div>
      <div className="progress-stats">
        <div className="stat-item">
          <span className={`stat-value ${done ? 'stat-success' : 'stat-pending'}`}>{succeeded}</span>
          <span className="stat-label">Subscribed</span>
        </div>
        <div className="stat-item">
          <span className="stat-value stat-skipped">{skipped}</span>
          <span className="stat-label">Skipped</span>
        </div>
        <div className="stat-item">
          <span className="stat-value stat-error">{failed}</span>
          <span className="stat-label">Failed</span>
        </div>
        <div className="stat-item">
          <span className="stat-value stat-pending">{pending}</span>
          <span className="stat-label">Remaining</span>
        </div>
      </div>

      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex-row mb-16" style={{ fontSize: 13, color: 'var(--gray-500)' }}>
        <span>{events.length} / {total} processed</span>
        <span className="ml-auto">{pct}%</span>
      </div>

      <div className="log-list">
        {events.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--gray-500)', fontSize: 13 }}>
            Waiting to start…
          </div>
        ) : (
          [...events].reverse().map((event, i) => (
            <div key={`${event.channelId}-${i}`} className="log-item">
              <div className="log-status-icon">
                <StatusIcon status={event.status} />
              </div>
              <div className="log-channel">{event.channelId}</div>
              {event.reason && (
                <div className="log-reason">{event.reason}</div>
              )}
              <div className="log-reason" style={{ minWidth: 60, textAlign: 'right' }}>
                {event.index}/{event.total}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
