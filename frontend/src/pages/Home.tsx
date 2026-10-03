import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getAuthStatus, AuthStatus } from '../lib/api'
import AccountCard from '../components/AccountCard'

function Topbar({ active }: { active?: string }) {
  return (
    <nav className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="topbar-brand">
          <span className="brand-badge">X</span>
          <span className="brand-name">Transfer</span>
        </Link>
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
  const targetConnected = status.target.connected

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
            <div className="stepper-container">
              <StepRow
                num={1}
                done={sourceConnected}
                active={!sourceConnected}
                label="Connect your old (source) account"
                sub="Read-only access - we only fetch your subscription list"
              />
              <StepRow
                num={2}
                done={targetConnected}
                active={sourceConnected && !targetConnected}
                label="Connect your new (target) account"
                sub="Write access needed to subscribe to channels"
              />
              <StepRow
                num={3}
                done={false}
                active={bothConnected}
                label="Review and transfer subscriptions"
                sub="Browse all channels, select what to migrate, or start the transfer directly"
              >
                <Link to="/subscriptions">
                  <button className="btn btn-outline btn-sm" disabled={!sourceConnected}>
                    View subscriptions →
                  </button>
                </Link>
                <Link to="/transfer">
                  <button className="btn btn-accent btn-sm" disabled={!bothConnected}>
                    Start transfer →
                  </button>
                </Link>
              </StepRow>
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
  active,
  label,
  sub,
  children,
}: {
  num: number
  done: boolean
  active: boolean
  label: string
  sub: string
  children?: React.ReactNode
}) {
  const statusClass = done
    ? 'step-done'
    : active
    ? 'step-active'
    : 'step-upcoming'

  return (
    <div className={`step-item ${statusClass}`}>
      <div className="step-badge">{done ? '✓' : num}</div>
      <div className="step-body">
        <div className="step-title">{label}</div>
        <div className="step-sub">{sub}</div>
        {children && <div className="step-actions">{children}</div>}
      </div>
    </div>
  )
}
