import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getAuthStatus, AuthStatus } from '../lib/api'
import AccountCard from '../components/AccountCard'

function Topbar({ active }: { active?: string }) {
  return (
    <nav className="topbar">
      <div className="topbar-inner">
        <div className="topbar-logo">X <span>Transfer</span></div>
        <div className="topbar-nav">
          <Link to="/" className={active === 'home' ? 'active' : ''}>Accounts</Link>
          <Link to="/subscriptions" className={active === 'subs' ? 'active' : ''}>Subscriptions</Link>
          <Link to="/transfer" className={active === 'transfer' ? 'active' : ''}>Transfer</Link>
          <Link to="/content" className={active === 'content' ? 'active' : ''}>My Content</Link>
        </div>
      </div>
    </nav>
  )
}


export { Topbar }

const DEFAULT_STATUS: AuthStatus = {
  source: { connected: false },
  target: { connected: false },
}

export default function Home() {
  const [status, setStatus] = useState<AuthStatus>(DEFAULT_STATUS)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  async function load() {
    try {
      const s = await getAuthStatus()
      setStatus(s)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [location.search]) // refresh after OAuth redirect

  const bothConnected = status.source.connected && status.target.connected
  const sourceConnected = status.source.connected

  return (
    <>
      <Topbar active="home" />
      <main className="layout page">
        <div className="page-title">YouTube Subscription Transfer</div>
        <div className="page-subtitle">
          Connect your old and new Google accounts to copy all subscriptions in one click.
        </div>

        {!loading && (
          <>
            {location.search.includes('error=') && (
              <div className="info-box info-box-warn mb-16">
                <span>⚠</span>
                <span>Authentication failed. Please try again.</span>
              </div>
            )}

            <div className="section-label">Connect Accounts</div>
            <div className="accounts-grid">
              <AccountCard role="source" account={status.source} onDisconnect={load} />
              <AccountCard role="target" account={status.target} onDisconnect={load} />
            </div>

            <hr className="divider" />

            <div className="section-label">Next Steps</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520 }}>
              <StepRow
                num={1}
                done={sourceConnected}
                label="Connect your old (source) account"
                sub="Read-only access — we only fetch your subscription list"
              />
              <StepRow
                num={2}
                done={status.target.connected}
                label="Connect your new (target) account"
                sub="Write access needed to subscribe to channels"
              />
              <StepRow
                num={3}
                done={false}
                disabled={!sourceConnected}
                label="Fetch and review your subscriptions"
                sub="Browse all channels, copy links, or select specific ones"
                action={
                  <Link to="/subscriptions">
                    <button className="btn btn-outline btn-sm" disabled={!sourceConnected}>
                      View subscriptions →
                    </button>
                  </Link>
                }
              />
              <StepRow
                num={4}
                done={false}
                disabled={!bothConnected}
                label="Transfer subscriptions"
                sub="One click to subscribe your new account to all selected channels"
                action={
                  <Link to="/transfer">
                    <button className="btn btn-accent btn-sm" disabled={!bothConnected}>
                      Start transfer →
                    </button>
                  </Link>
                }
              />
            </div>

            <hr className="divider" />

            <div className="info-box info-box-note" style={{ maxWidth: 520 }}>
              <span>ⓘ</span>
              <span>
                <strong>Quota note:</strong> YouTube allows ~200 subscription transfers per day per project.
                The transfer will automatically pause and show remaining channels if you hit the limit.
              </span>
            </div>
          </>
        )}

        {loading && (
          <div className="flex-row" style={{ color: 'var(--gray-500)', fontSize: 13 }}>
            <span className="spinner" />
            Loading…
          </div>
        )}
      </main>
    </>
  )
}

function StepRow({
  num,
  done,
  disabled,
  label,
  sub,
  action,
}: {
  num: number
  done: boolean
  disabled?: boolean
  label: string
  sub: string
  action?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        opacity: disabled ? 0.45 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: done ? 'none' : '1px solid var(--gray-300)',
          background: done ? 'var(--success)' : 'transparent',
          color: done ? 'var(--white)' : 'var(--gray-500)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {done ? '✓' : num}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        <div className="text-muted" style={{ marginTop: 2 }}>{sub}</div>
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </div>
    </div>
  )
}
