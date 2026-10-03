import { AccountStatus, connectSource, connectTarget, disconnectAccount } from '../lib/api'

interface AccountCardProps {
  role: 'source' | 'target'
  account: AccountStatus
  onDisconnect: () => void
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function AccountCard({ role, account, onDisconnect }: AccountCardProps) {
  const isSource = role === 'source'
  const roleLabel = isSource ? 'Source Account' : 'Target Account'
  const roleDesc = isSource
    ? 'The account you\'re moving FROM'
    : 'The account you\'re moving TO'

  function handleConnect() {
    if (isSource) connectSource()
    else connectTarget()
  }

  async function handleDisconnect() {
    await disconnectAccount(role)
    onDisconnect()
  }

  return (
    <div className="account-card">
      <div className="account-card-header">
        <div>
          <div className="account-card-role">{roleLabel}</div>
          <div className="text-muted" style={{ marginTop: 2 }}>{roleDesc}</div>
        </div>
        <span className={`account-card-badge ${account.connected ? 'badge-connected' : 'badge-disconnected'}`}>
          {account.connected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      {account.connected ? (
        <>
          <div className="account-card-profile">
            <img
              className="account-card-avatar"
              src={account.picture}
              alt={account.name}
              referrerPolicy="no-referrer"
            />
            <div className="account-card-info">
              <div className="account-card-name">{account.name}</div>
              <div className="account-card-email">{account.email}</div>
            </div>
          </div>
          <div className="flex-row">
            <button className="btn btn-outline btn-sm" onClick={handleConnect}>
              Switch account
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="account-card-empty">
            No account connected
          </div>
          <button className="btn btn-google" onClick={handleConnect}>
            <GoogleIcon />
            Sign in with Google
          </button>
        </>
      )}
    </div>
  )
}
