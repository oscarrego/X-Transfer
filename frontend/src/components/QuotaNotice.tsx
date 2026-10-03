interface QuotaNoticeProps {
  onDismiss?: () => void
  customMessage?: string
}

export function isQuotaExceeded(error: string | null | undefined): boolean {
  if (!error) return false
  const lower = error.toLowerCase()
  return (
    lower.includes('quota') ||
    lower.includes('dailylimitexceeded') ||
    lower.includes('quota_exceeded') ||
    lower.includes('exceeded your')
  )
}

export default function QuotaNotice({ onDismiss, customMessage }: QuotaNoticeProps) {
  return (
    <div
      style={{
        border: '1px solid #e5c07b',
        background: '#fefcf3',
        borderRadius: 'var(--radius)',
        padding: '14px 18px',
        marginBottom: '18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--black)', marginBottom: '3px' }}>
            Daily Quota Reached
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gray-700)', lineHeight: 1.5 }}>
            {customMessage || 'YouTube daily transfer limit reached. Resets at midnight PT. Transferred items are saved.'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a
            href="https://console.cloud.google.com/iam-admin/quotas"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-sm"
            style={{ fontSize: '11px', padding: '3px 8px' }}
          >
            Check Quotas ↗
          </a>
          {onDismiss && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={onDismiss}
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
