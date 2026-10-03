import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchSubscriptions, getAuthStatus, Channel, copyToClipboard } from '../lib/api'
import ChannelTable from '../components/ChannelTable'
import QuotaNotice, { isQuotaExceeded } from '../components/QuotaNotice'
import { Topbar } from './Home'

export default function Subscriptions() {
  const navigate = useNavigate()
  const [channels, setChannels] = useState<Channel[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceConnected, setSourceConnected] = useState<boolean | null>(null)
  const [targetConnected, setTargetConnected] = useState<boolean | null>(null)

  useEffect(() => {
    getAuthStatus().then((s) => {
      setSourceConnected(s.source.connected)
      setTargetConnected(s.target.connected)
    })
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchSubscriptions()
      setChannels(res.subscriptions)
      // Select all by default
      setSelected(new Set(res.subscriptions.map((c) => c.channelId)))
    } catch (err: any) {
      setError(err.message || 'Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }

  function toggle(channelId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(channelId)) next.delete(channelId)
      else next.add(channelId)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelected(new Set(channels.map((c) => c.channelId)))
    } else {
      setSelected(new Set())
    }
  }

  function handleTransfer() {
    // Store selected IDs in sessionStorage for the Transfer page
    sessionStorage.setItem('transferIds', JSON.stringify([...selected]))
    sessionStorage.setItem(
      'transferChannels',
      JSON.stringify(channels.filter((c) => selected.has(c.channelId)))
    )
    navigate('/transfer')
  }

  const selectedCount = selected.size

  return (
    <>
      <Topbar active="subs" />
      <main className="layout page" style={{ paddingBottom: 100 }}>
        <div className="flex-row mb-16">
          <div>
            <div className="page-title">Subscriptions</div>
            <div className="page-subtitle" style={{ marginBottom: 0 }}>
              {channels.length > 0
                ? `${channels.length} channels from your source account`
                : 'Fetch subscriptions from your connected source account'}
            </div>
          </div>
          <div className="ml-auto flex-row">
            {channels.length === 0 ? (
              <button
                className="btn btn-primary"
                onClick={load}
                disabled={loading || !sourceConnected}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Fetching…
                  </>
                ) : (
                  'Fetch subscriptions'
                )}
              </button>
            ) : (
              <button
                className="btn btn-outline btn-sm"
                onClick={load}
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : '↺'} Refresh
              </button>
            )}
          </div>
        </div>

        {sourceConnected === false && (
          <div className="info-box info-box-warn">
            <span>⚠</span>
            <span>
              Source account not connected.{' '}
              <Link to="/">Connect it first →</Link>
            </span>
          </div>
        )}

        {error && isQuotaExceeded(error) ? (
          <QuotaNotice onDismiss={() => setError(null)} customMessage={error} />
        ) : error ? (
          <div className="info-box" style={{ background: 'var(--error-light)', color: 'var(--error)', border: '1px solid #ffc9c9' }}>
            <span>✗</span>
            <span>{error}</span>
          </div>
        ) : null}

        {channels.length === 0 && !loading && !error && sourceConnected && (
          <div className="empty-state">
            <div className="empty-state-title">No subscriptions loaded</div>
            <div className="empty-state-sub">Click "Fetch subscriptions" to load your channel list</div>
          </div>
        )}

        {channels.length > 0 && (
          <ChannelTable
            channels={channels}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
          />
        )}
      </main>

      {/* Sticky action bar */}
      {channels.length > 0 && (
        <div className="action-bar">
          <div className="action-bar-info">
            <strong>{selectedCount}</strong> of {channels.length} channels selected for transfer
          </div>
          <div className="action-bar-buttons">
            <button
              className="btn btn-outline"
              onClick={async () => {
                const links = channels
                  .filter((c) => selected.has(c.channelId))
                  .map((c) => c.channelUrl)
                  .join('\n')
                await copyToClipboard(links)
              }}
              disabled={selectedCount === 0}
            >
              Copy selected links
            </button>
            <button
              className="btn btn-accent"
              onClick={handleTransfer}
              disabled={selectedCount === 0 || !targetConnected}
              title={!targetConnected ? 'Connect your target account first' : ''}
            >
              Transfer {selectedCount > 0 ? selectedCount : ''} channels →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
