import { useState } from 'react'
import { Channel, copyToClipboard } from '../lib/api'

interface ChannelTableProps {
  channels: Channel[]
  selected: Set<string>
  onToggle: (channelId: string) => void
  onToggleAll: (checked: boolean) => void
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  )
}

function CopyCell({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      className="btn btn-ghost btn-sm copy-btn"
      onClick={handleCopy}
      title="Copy channel URL"
      style={{ color: copied ? 'var(--success)' : undefined }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}

export default function ChannelTable({ channels, selected, onToggle, onToggleAll }: ChannelTableProps) {
  const [query, setQuery] = useState('')
  const [copiedAll, setCopiedAll] = useState(false)

  const filtered = query.trim()
    ? channels.filter((c) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.channelUrl.toLowerCase().includes(query.toLowerCase())
      )
    : channels

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.channelId))
  const someSelected = filtered.some((c) => selected.has(c.channelId))
  const selectedCount = channels.filter((c) => selected.has(c.channelId)).length

  async function handleCopySelected() {
    const links = channels
      .filter((c) => selected.has(c.channelId))
      .map((c) => c.channelUrl)
      .join('\n')
    await copyToClipboard(links)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  async function handleCopyAll() {
    const links = channels.map((c) => c.channelUrl).join('\n')
    await copyToClipboard(links)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  return (
    <div className="table-wrapper">
      <div className="table-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search channels…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {selectedCount > 0 && (
          <button className="btn btn-outline btn-sm" onClick={handleCopySelected}>
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
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected
                  }}
                  onChange={(e) => onToggleAll(e.target.checked)}
                  title={allSelected ? 'Deselect all' : 'Select all'}
                />
              </th>
              <th>Channel</th>
              <th>URL</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
                  {query ? 'No channels match your search' : 'No channels'}
                </td>
              </tr>
            ) : (
              filtered.map((channel) => (
                <tr
                  key={channel.channelId}
                  className={selected.has(channel.channelId) ? 'selected' : ''}
                  onClick={() => onToggle(channel.channelId)}
                  style={{ cursor: 'pointer' }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(channel.channelId)}
                      onChange={() => onToggle(channel.channelId)}
                    />
                  </td>
                  <td>
                    <div className="channel-cell">
                      {channel.thumbnail ? (
                        <img
                          className="channel-thumb"
                          src={channel.thumbnail}
                          alt={channel.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="channel-thumb" />
                      )}
                      <span className="channel-name">{channel.title}</span>
                    </div>
                  </td>
                  <td>
                    <a
                      href={channel.channelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="channel-url"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {channel.channelUrl}
                    </a>
                  </td>
                  <td>
                    <CopyCell text={channel.channelUrl} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>
          {filtered.length} channel{filtered.length !== 1 ? 's' : ''}
          {query && ` matching "${query}"`}
        </span>
        {selectedCount > 0 && (
          <span style={{ color: 'var(--accent)', fontWeight: 500 }}>
            {selectedCount} selected
          </span>
        )}
      </div>
    </div>
  )
}
