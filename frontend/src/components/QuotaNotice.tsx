
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
        border: '1px solid #ffd43b',
        background: '#fff9db',
        borderRadius: '6px',
        padding: '20px 24px',
        marginBottom: '20px',
        color: '#2b2b2b',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div
          style={{
            fontSize: '24px',
            lineHeight: 1,
            padding: '6px 8px',
            background: '#ffe066',
            borderRadius: '6px',
            flexShrink: 0,
          }}
        >
          ⏳
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#d9480f',
              marginBottom: '6px',
              letterSpacing: '-0.01em',
            }}
          >
            YouTube Daily Quota Limit Reached
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#495057' }}>
            {customMessage || (
              <>
                You have reached YouTube's free API limit for today (<strong>10,000 units/day</strong>).
                Google automatically resets this quota every day at{' '}
                <strong>midnight Pacific Time (PT)</strong>.
              </>
            )}
          </div>

          <div
            style={{
              marginTop: '10px',
              fontSize: '12px',
              color: '#5c6f84',
              background: 'rgba(255, 255, 255, 0.6)',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ffe066',
            }}
          >
            <strong>Your progress is safe:</strong> All channels and playlists already transferred are in your new account.
            When you run it again after reset, items already transferred are automatically skipped.
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginTop: '14px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="https://console.cloud.google.com/iam-admin/quotas"
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
              style={{ background: '#ffffff', borderColor: '#e9ecef', fontSize: '12px' }}
            >
              View Quotas in Google Cloud ↗
            </a>
            {onDismiss && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={onDismiss}
                style={{ fontSize: '12px' }}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
