import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchWatchLater,
  fetchPlaylists,
  fetchPlaylistVideos,
  transferWatchLater,
  transferPlaylists,
  VideoItem,
  PlaylistItem,
  ContentProgressEvent,
  PlaylistDoneEvent,
  copyToClipboard,
} from '../lib/api'
import { Topbar } from './Home'


// ── Icons ─────────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
function CheckSmall() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  async function handle(e: React.MouseEvent) {
    e.stopPropagation()
    await copyToClipboard(text)
    setOk(true)
    setTimeout(() => setOk(false), 1500)
  }
  return (
    <button
      className="btn btn-ghost btn-sm copy-btn"
      onClick={handle}
      title="Copy link"
      style={{ color: ok ? 'var(--success)' : undefined, opacity: 1 }}
    >
      {ok ? <CheckSmall /> : <CopyIcon />}
    </button>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function MiniProgress({ done, total, paused }: { done: number; total: number; paused?: boolean }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ marginTop: 12, marginBottom: 4 }}>
      <div className="progress-bar-wrap" style={{ marginBottom: 6 }}>
        <div
          className="progress-bar-fill"
          style={{ width: `${pct}%`, background: paused ? 'var(--warning)' : 'var(--accent)' }}
        />
      </div>
      <div className="flex-row" style={{ fontSize: 12, color: 'var(--gray-500)' }}>
        <span>
          {done} / {total}
          {paused && <span style={{ color: 'var(--warning)', fontWeight: 600, marginLeft: 6 }}>- Paused</span>}
        </span>
        <span className="ml-auto">{pct}%</span>
      </div>
    </div>
  )
}

// ── Video table ───────────────────────────────────────────────────────────────

function VideoTable({
  videos,
  selected,
  onToggle,
  onToggleAll,
}: {
  videos: VideoItem[]
  selected: Set<string>
  onToggle: (id: string) => void
  onToggleAll: (checked: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const [copiedAll, setCopiedAll] = useState(false)

  const filtered = query.trim()
    ? videos.filter(
        (v) =>
          v.title.toLowerCase().includes(query.toLowerCase()) ||
          v.channelTitle.toLowerCase().includes(query.toLowerCase())
      )
    : videos

  const allSelected = filtered.length > 0 && filtered.every((v) => selected.has(v.videoId))
  const someSelected = filtered.some((v) => selected.has(v.videoId))
  const selectedCount = videos.filter((v) => selected.has(v.videoId)).length

  async function handleCopyAll() {
    await copyToClipboard(videos.map((v) => v.videoUrl).join('\n'))
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  return (
    <div className="table-wrapper">
      <div className="table-toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Search videos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {selectedCount > 0 && (
          <button
            className="btn btn-outline btn-sm"
            onClick={async () => {
              await copyToClipboard(
                videos.filter((v) => selected.has(v.videoId)).map((v) => v.videoUrl).join('\n')
              )
            }}
          >
            Copy {selectedCount} links
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={handleCopyAll}>
          {copiedAll ? '✓ Copied' : 'Copy all links'}
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected }}
                  onChange={(e) => onToggleAll(e.target.checked)}
                />
              </th>
              <th>Video</th>
              <th>Channel</th>
              <th>Link</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)' }}>
                  {query ? 'No videos match your search' : 'No videos'}
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr
                  key={v.videoId}
                  className={selected.has(v.videoId) ? 'selected' : ''}
                  onClick={() => onToggle(v.videoId)}
                  style={{ cursor: 'pointer' }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(v.videoId)} onChange={() => onToggle(v.videoId)} />
                  </td>
                  <td>
                    <div className="channel-cell">
                      {v.thumbnail ? (
                        <img
                          src={v.thumbnail}
                          alt={v.title}
                          referrerPolicy="no-referrer"
                          style={{ width: 56, height: 32, objectFit: 'cover', borderRadius: 2, border: 'var(--border)', flexShrink: 0 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div style={{ width: 56, height: 32, background: 'var(--gray-100)', borderRadius: 2, flexShrink: 0 }} />
                      )}
                      <span className="channel-name" style={{ maxWidth: 280 }}>{v.title}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{v.channelTitle}</td>
                  <td>
                    <a href={v.videoUrl} target="_blank" rel="noreferrer" className="channel-url" onClick={(e) => e.stopPropagation()}>
                      {v.videoUrl}
                    </a>
                  </td>
                  <td><CopyBtn text={v.videoUrl} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>{filtered.length} video{filtered.length !== 1 ? 's' : ''}{query && ` matching "${query}"`}</span>
        {selectedCount > 0 && <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{selectedCount} selected</span>}
      </div>
    </div>
  )
}

// ── Watch Later Tab ───────────────────────────────────────────────────────────

function WatchLaterTab() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiBlocked, setApiBlocked] = useState(false)

  // Transfer state
  const [transferring, setTransferring] = useState(false)
  const [paused, setPaused] = useState(false)
  const [transferDone, setTransferDone] = useState(false)
  const [events, setEvents] = useState<ContentProgressEvent[]>([])
  const [summary, setSummary] = useState<{ succeeded: number; skipped: number; failed: number; total: number } | null>(null)
  const [quotaHit, setQuotaHit] = useState(false)
  const abortRef = useRef(false)
  const pauseRef = useRef(false)
  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    setError(null)
    setApiBlocked(false)
    try {
      const res = await fetchWatchLater()
      setVideos(res.videos)
      setSelected(new Set(res.videos.map((v) => v.videoId)))
    } catch (err: any) {
      if (err.message?.startsWith('api_limitation:')) {
        setApiBlocked(true)
      } else {
        setError(err.message || 'Failed to fetch Watch Later')
      }
    } finally {
      setLoading(false)
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(videos.map((v) => v.videoId)) : new Set())
  }

  async function startTransfer() {
    const ids = [...selected]
    if (ids.length === 0) return
    abortRef.current = false
    pauseRef.current = false
    setTransferring(true)
    setTransferDone(false)
    setEvents([])
    setSummary(null)
    setQuotaHit(false)

    try {
      for await (const event of transferWatchLater(ids)) {
        if (abortRef.current) break
        while (pauseRef.current && !abortRef.current) {
          await new Promise((r) => setTimeout(r, 200))
        }
        if (abortRef.current) break

        if (event.type === 'progress') {
          setEvents((prev) => [...prev, event as ContentProgressEvent])
        } else if (event.type === 'done') {
          const d = event as any
          setSummary({ succeeded: d.succeeded, skipped: d.skipped, failed: d.failed, total: d.total })
          setTransferDone(true)
          setTransferring(false)
        } else if (event.type === 'quota_exceeded') {
          setQuotaHit(true)
          setTransferDone(true)
          setTransferring(false)
        }
      }
      if (abortRef.current) { setTransferDone(true); setTransferring(false) }
    } catch (err: any) {
      setError(err.message || 'Transfer failed')
      setTransferring(false)
    }
  }

  const selectedCount = selected.size

  return (
    <div>
      {/* Header row */}
      <div className="flex-row mb-16" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Watch Later</div>
          <div className="text-muted" style={{ marginTop: 2 }}>
            {videos.length > 0
              ? `${videos.length} videos from your source account`
              : 'Fetch your Watch Later playlist from the source account'}
          </div>
        </div>
        <div className="ml-auto flex-row" style={{ gap: 8 }}>
          {!transferring && !transferDone && (
            <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
              {loading ? <><span className="spinner" /> Fetching...</> : videos.length > 0 ? '↺ Refresh' : 'Fetch Watch Later'}
            </button>
          )}
          {!transferring && !transferDone && videos.length > 0 && (
            <button
              className="btn btn-accent"
              onClick={startTransfer}
              disabled={selectedCount === 0}
            >
              Transfer {selectedCount} videos
            </button>
          )}
          {transferring && (
            <>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--warning)', color: '#fff', border: 'none', fontWeight: 600 }}
                onClick={() => { pauseRef.current = !pauseRef.current; setPaused(p => !p) }}
              >
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--error)', color: '#fff', border: 'none', fontWeight: 600 }}
                onClick={() => { abortRef.current = true }}
              >
                Stop
              </button>
            </>
          )}
          {transferDone && (
            <button className="btn btn-outline btn-sm" onClick={() => { setTransferDone(false); setEvents([]); setSummary(null) }}>
              Reset
            </button>
          )}
        </div>
      </div>

      {/* YouTube API blocked notice */}
      {apiBlocked && (
        <div className="info-box info-box-warn">
          <span>!</span>
          <div>
            <strong>YouTube API Limitation:</strong> YouTube's official API does not allow reading the
            Watch Later playlist. This is a restriction on YouTube's side and cannot be bypassed by any third-party app.
            <br />
            <span style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              As a workaround, you can manually export your Watch Later from{' '}
              <a href="https://www.youtube.com/playlist?list=WL" target="_blank" rel="noreferrer">
                youtube.com/playlist?list=WL
              </a>{' '}
              using Google Takeout.
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="info-box" style={{ background: 'var(--error-light)', color: 'var(--error)', border: '1px solid #ffc9c9' }}>
          <span>x</span><span>{error}</span>
        </div>
      )}

      {/* Transfer progress */}
      {(transferring || transferDone) && (
        <div style={{ marginBottom: 20 }}>
          {quotaHit && (
            <div className="info-box info-box-warn mb-16">
              <span>!</span>
              <span><strong>Quota limit hit.</strong> Come back tomorrow and run again - duplicates are skipped automatically.</span>
            </div>
          )}
          {summary && (
            <div className="info-box info-box-success mb-16">
              <span>v</span>
              <span>
                Done - <strong>{summary.succeeded}</strong> added, <strong>{summary.skipped}</strong> skipped, <strong>{summary.failed}</strong> failed.
              </span>
            </div>
          )}
          <MiniProgress done={events.length} total={selectedCount} paused={paused} />
          <div className="log-list" style={{ marginTop: 12, maxHeight: 260 }}>
            {[...events].reverse().map((ev, i) => {
              const vid = videos.find((v) => v.videoId === ev.itemId)
              return (
                <div key={`${ev.itemId}-${i}`} className="log-item">
                  <div className="log-status-icon">
                    {ev.status === 'success' && <span style={{ color: 'var(--success)' }}>✓</span>}
                    {ev.status === 'skipped' && <span style={{ color: 'var(--warning)' }}>↷</span>}
                    {ev.status === 'error' && <span style={{ color: 'var(--error)' }}>✗</span>}
                  </div>
                  <div className="log-channel">{vid?.title || ev.itemId}</div>
                  {ev.reason && <div className="log-reason">{ev.reason}</div>}
                  <div className="log-reason" style={{ minWidth: 60, textAlign: 'right' }}>{ev.index}/{ev.total}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Done bottom bar */}
      {transferDone && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Done - Back to Home</button>
        </div>
      )}

      {/* Video table */}
      {!transferring && !transferDone && videos.length > 0 && !apiBlocked && (
        <VideoTable
          videos={videos}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
      )}

      {!loading && !error && !apiBlocked && videos.length === 0 && !transferring && (
        <div className="empty-state">
          <div className="empty-state-title">No videos loaded</div>
          <div className="empty-state-sub">Click "Fetch Watch Later" to load your Watch Later playlist</div>
        </div>
      )}
    </div>
  )
}

// ── Playlists Tab ─────────────────────────────────────────────────────────────

function PlaylistsTab() {
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loadingVideos, setLoadingVideos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Transfer state
  const [transferring, setTransferring] = useState(false)
  const [paused, setPaused] = useState(false)
  const [transferDone, setTransferDone] = useState(false)
  const [transferLog, setTransferLog] = useState<PlaylistDoneEvent[]>([])
  const [currentAction, setCurrentAction] = useState<string>('')
  const [transferProgress, setTransferProgress] = useState({ done: 0, total: 0 })
  const [quotaHit, setQuotaHit] = useState(false)
  const abortRef = useRef(false)
  const pauseRef = useRef(false)
  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchPlaylists()
      setPlaylists(res.playlists)
      setSelected(new Set(res.playlists.map((p) => p.playlistId)))
    } catch (err: any) {
      setError(err.message || 'Failed to fetch playlists')
    } finally {
      setLoading(false)
    }
  }

  async function loadVideos(playlistId: string) {
    setLoadingVideos((prev) => new Set(prev).add(playlistId))
    try {
      const res = await fetchPlaylistVideos(playlistId)
      setPlaylists((prev) =>
        prev.map((p) => (p.playlistId === playlistId ? { ...p, videos: res.videos } : p))
      )
      setExpanded((prev) => new Set(prev).add(playlistId))
    } catch {
      // ignore
    } finally {
      setLoadingVideos((prev) => { const s = new Set(prev); s.delete(playlistId); return s })
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function togglePl(id: string) {
    setSelected((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  async function startTransferPlaylists() {
    const toTransfer = playlists.filter((p) => selected.has(p.playlistId))
    if (toTransfer.length === 0) return

    abortRef.current = false
    pauseRef.current = false
    setTransferring(true)
    setTransferDone(false)
    setTransferLog([])
    setQuotaHit(false)
    setTransferProgress({ done: 0, total: toTransfer.length })

    try {
      for await (const event of transferPlaylists(toTransfer)) {
        if (abortRef.current) break
        while (pauseRef.current && !abortRef.current) {
          await new Promise((r) => setTimeout(r, 200))
        }
        if (abortRef.current) break

        if (event.type === 'playlist_created') {
          setCurrentAction(`Creating "${event.title}"...`)
        } else if (event.type === 'playlist_fetched') {
          setCurrentAction(`Copying ${event.videoCount} videos to "${event.title}"...`)
        } else if (event.type === 'playlist_done') {
          const e = event as PlaylistDoneEvent
          setTransferLog((prev) => [...prev, e])
          setTransferProgress((prev) => ({ ...prev, done: e.index }))
          setCurrentAction('')
        } else if (event.type === 'quota_exceeded') {
          setQuotaHit(true)
          setTransferDone(true)
          setTransferring(false)
        } else if (event.type === 'done') {
          setTransferDone(true)
          setTransferring(false)
        }
      }
      if (abortRef.current) { setTransferDone(true); setTransferring(false) }
    } catch (err: any) {
      setError(err.message || 'Transfer failed')
      setTransferring(false)
    }
  }

  const totalVideos = playlists
    .filter((p) => selected.has(p.playlistId))
    .reduce((sum, p) => sum + p.videoCount, 0)

  // Quota estimate: 50 units per playlist create + 50 per video
  const quotaEstimate = selected.size * 50 + totalVideos * 50
  const quotaPercent = Math.min(100, Math.round((quotaEstimate / 10000) * 100))

  return (
    <div>
      {/* Header */}
      <div className="flex-row mb-16" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Playlists</div>
          <div className="text-muted" style={{ marginTop: 2 }}>
            {playlists.length > 0
              ? `${playlists.length} playlists from your source account`
              : 'Fetch your created playlists from the source account'}
          </div>
        </div>
        <div className="ml-auto flex-row" style={{ gap: 8 }}>
          {!transferring && !transferDone && (
            <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
              {loading ? <><span className="spinner" /> Fetching...</> : playlists.length > 0 ? '↺ Refresh' : 'Fetch Playlists'}
            </button>
          )}
          {!transferring && !transferDone && playlists.length > 0 && (
            <button
              className="btn btn-accent"
              onClick={startTransferPlaylists}
              disabled={selected.size === 0}
            >
              Transfer {selected.size} playlist{selected.size !== 1 ? 's' : ''}
            </button>
          )}
          {transferring && (
            <>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--warning)', color: '#fff', border: 'none', fontWeight: 600 }}
                onClick={() => { pauseRef.current = !pauseRef.current; setPaused(p => !p) }}
              >
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--error)', color: '#fff', border: 'none', fontWeight: 600 }}
                onClick={() => { abortRef.current = true }}
              >
                Stop
              </button>
            </>
          )}
          {transferDone && (
            <button className="btn btn-outline btn-sm" onClick={() => { setTransferDone(false); setTransferLog([]); }}>
              Reset
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="info-box" style={{ background: 'var(--error-light)', color: 'var(--error)', border: '1px solid #ffc9c9' }}>
          <span>x</span><span>{error}</span>
        </div>
      )}

      {/* Quota estimate warning */}
      {!transferring && !transferDone && playlists.length > 0 && selected.size > 0 && (
        <div className="info-box info-box-note mb-16">
          <span>i</span>
          <div>
            <strong>Quota estimate:</strong> Transferring {selected.size} playlist{selected.size > 1 ? 's' : ''} with ~{totalVideos} videos
            will use approximately <strong>{quotaEstimate.toLocaleString()} units</strong> ({quotaPercent}% of daily limit).
            {quotaEstimate > 10000 && (
              <span style={{ color: 'var(--warning)', display: 'block', marginTop: 4 }}>
                <strong>Warning:</strong> This exceeds the daily quota. The transfer will stop when the limit is hit and resume where it left off tomorrow.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Transfer progress */}
      {(transferring || transferDone) && (
        <div style={{ marginBottom: 20 }}>
          {quotaHit && (
            <div className="info-box info-box-warn mb-16">
              <span>!</span>
              <span><strong>Quota limit hit.</strong> Come back tomorrow and run again.</span>
            </div>
          )}
          {currentAction && (
            <div className="flex-row mb-8" style={{ fontSize: 13, color: 'var(--gray-500)' }}>
              <span className="spinner" />
              <span>{currentAction}</span>
            </div>
          )}
          <MiniProgress done={transferProgress.done} total={transferProgress.total} paused={paused} />
          {transferLog.length > 0 && (
            <div className="log-list" style={{ marginTop: 12 }}>
              {[...transferLog].reverse().map((ev, i) => (
                <div key={`${ev.title}-${i}`} className="log-item">
                  <div className="log-status-icon">
                    {ev.status === 'success' ? (
                      <span style={{ color: 'var(--success)' }}>✓</span>
                    ) : (
                      <span style={{ color: 'var(--error)' }}>✗</span>
                    )}
                  </div>
                  <div className="log-channel">{ev.title}</div>
                  {ev.status === 'success' ? (
                    <div className="log-reason">{ev.videoSucceeded} videos copied</div>
                  ) : (
                    <div className="log-reason" style={{ color: 'var(--error)' }}>{ev.reason}</div>
                  )}
                  {ev.newPlaylistId && (
                    <a
                      href={`https://www.youtube.com/playlist?list=${ev.newPlaylistId}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: 'var(--accent)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Done button */}
      {transferDone && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Done - Back to Home</button>
        </div>
      )}

      {/* Playlist list */}
      {!transferring && !transferDone && playlists.length > 0 && (
        <div className="table-wrapper">
          <div className="table-toolbar">
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set(playlists.map((p) => p.playlistId)))}>
              Select all
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>
              Deselect all
            </button>
            <span className="ml-auto text-muted">{selected.size} selected</span>
          </div>
          <table>
            <thead>
              <tr>
                <th></th>
                <th></th>
                <th>Playlist</th>
                <th>Videos</th>
                <th>Privacy</th>
                <th>Link</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {playlists.map((pl) => (
                <>
                  <tr
                    key={pl.playlistId}
                    className={selected.has(pl.playlistId) ? 'selected' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={() => togglePl(pl.playlistId)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(pl.playlistId)} onChange={() => togglePl(pl.playlistId)} />
                    </td>
                    <td>
                      {pl.thumbnail ? (
                        <img
                          src={pl.thumbnail}
                          alt={pl.title}
                          referrerPolicy="no-referrer"
                          style={{ width: 56, height: 32, objectFit: 'cover', borderRadius: 2, border: 'var(--border)' }}
                        />
                      ) : (
                        <div style={{ width: 56, height: 32, background: 'var(--gray-100)', borderRadius: 2 }} />
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{pl.title}</span>
                      {pl.description && (
                        <div style={{ fontSize: 11, color: 'var(--gray-500)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pl.description}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>{pl.videoCount}</td>
                    <td>
                      <span
                        style={{
                          fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
                          background: pl.privacy === 'private' ? 'var(--gray-100)' : 'var(--success-light)',
                          color: pl.privacy === 'private' ? 'var(--gray-500)' : 'var(--success)',
                        }}
                      >
                        {pl.privacy}
                      </span>
                    </td>
                    <td>
                      <a href={pl.playlistUrl} target="_blank" rel="noreferrer" className="channel-url" onClick={(e) => e.stopPropagation()}>
                        {pl.playlistUrl}
                      </a>
                    </td>
                    <td>
                      <div className="flex-row" style={{ gap: 4 }}>
                        <CopyBtn text={pl.playlistUrl} />
                        <button
                          className="btn btn-ghost btn-sm"
                          title={expanded.has(pl.playlistId) ? 'Hide videos' : 'Preview videos'}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!pl.videos && !loadingVideos.has(pl.playlistId)) {
                              loadVideos(pl.playlistId)
                            } else {
                              toggleExpand(pl.playlistId)
                            }
                          }}
                          style={{ fontSize: 11 }}
                        >
                          {loadingVideos.has(pl.playlistId) ? (
                            <span className="spinner" />
                          ) : expanded.has(pl.playlistId) ? '▲' : '▼ Videos'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded.has(pl.playlistId) && pl.videos && (
                    <tr key={`${pl.playlistId}-videos`}>
                      <td colSpan={7} style={{ padding: 0, background: '#fafafa' }}>
                        <div style={{ padding: '8px 16px 12px 64px', maxHeight: 240, overflowY: 'auto' }}>
                          {pl.videos.map((v) => (
                            <div
                              key={v.videoId}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--gray-100)' }}
                            >
                              <span style={{ fontSize: 11, color: 'var(--gray-300)', minWidth: 20, textAlign: 'right' }}>
                                {v.position !== undefined ? v.position + 1 : ''}
                              </span>
                              <span style={{ fontSize: 13, flex: 1 }}>{v.title}</span>
                              <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{v.channelTitle}</span>
                              <a href={v.videoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)' }}>Watch</a>
                              <CopyBtn text={v.videoUrl} />
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && playlists.length === 0 && !transferring && (
        <div className="empty-state">
          <div className="empty-state-title">No playlists loaded</div>
          <div className="empty-state-sub">Click "Fetch Playlists" to load your created playlists</div>
        </div>
      )}
    </div>
  )
}

// ── Content Page ──────────────────────────────────────────────────────────────

type ContentTab = 'watchlater' | 'playlists'

export default function Content() {
  const [tab, setTab] = useState<ContentTab>('playlists')

  return (
    <>
      <Topbar active="content" />
      <main className="layout page">
        <div className="page-title">My Content</div>
        <div className="page-subtitle">
          Transfer your Watch Later videos and created playlists to your new account.
        </div>

        {/* Tab switcher */}
        <div className="content-tabs mb-24">
          <button
            className={`content-tab ${tab === 'playlists' ? 'active' : ''}`}
            onClick={() => setTab('playlists')}
          >
            Playlists
          </button>
          <button
            className={`content-tab ${tab === 'watchlater' ? 'active' : ''}`}
            onClick={() => setTab('watchlater')}
          >
            Watch Later
          </button>
        </div>

        {tab === 'playlists' && <PlaylistsTab />}
        {tab === 'watchlater' && <WatchLaterTab />}
      </main>
    </>
  )
}
