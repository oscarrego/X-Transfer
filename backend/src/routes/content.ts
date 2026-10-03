import { Router, Request, Response } from 'express'
import { google } from 'googleapis'
import { getPersistentAuth } from '../utils/persistentAuth'
import { handleYouTubeError } from '../utils/errors'

const router = Router()
const RATE_LIMIT_MS = 1200

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getSourceClient(req: Request) {
  const tokens = req.session.sourceTokens || getPersistentAuth().sourceTokens
  if (!tokens) return null
  req.session.sourceTokens = tokens

  const c = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  c.setCredentials(tokens)
  return c
}

function getTargetClient(req: Request) {
  const tokens = req.session.targetTokens || getPersistentAuth().targetTokens
  if (!tokens) return null
  req.session.targetTokens = tokens

  const c = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  c.setCredentials(tokens)
  return c
}

// ── GET /api/content/watchlater ───────────────────────────────────────────────
// NOTE: YouTube Data API does NOT officially support Watch Later (playlistId=WL).
// This endpoint tries it anyway and returns a proper error if blocked.
router.get('/watchlater', async (req: Request, res: Response) => {
  const auth = getSourceClient(req)
  if (!auth) return res.status(401).json({ error: 'Source account not connected' })

  try {
    const youtube = google.youtube({ version: 'v3', auth })
    const videos: object[] = []
    let pageToken: string | undefined

    do {
      const response = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: 'WL',
        maxResults: 50,
        pageToken,
      })

      for (const item of response.data.items || []) {
        const snippet = item.snippet
        if (!snippet) continue
        videos.push({
          videoId: snippet.resourceId?.videoId,
          title: snippet.title,
          channelTitle: snippet.videoOwnerChannelTitle || '',
          thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
          videoUrl: `https://www.youtube.com/watch?v=${snippet.resourceId?.videoId}`,
          addedAt: snippet.publishedAt,
        })
      }

      pageToken = response.data.nextPageToken ?? undefined
    } while (pageToken)

    res.json({ videos, total: videos.length })
  } catch (err: any) {
    const reason = err?.errors?.[0]?.reason || ''
    if (reason === 'forbidden' || err?.code === 403) {
      return res.status(403).json({
        error: 'api_limitation',
        message:
          'YouTube does not allow access to Watch Later via its API. This is an official YouTube API limitation that cannot be bypassed.',
      })
    }
    console.error('Watch Later fetch error:', err?.message)
    const clean = handleYouTubeError(err, 'Failed to fetch Watch Later')
    res.status(clean.status).json(clean.body)
  }
})

// ── GET /api/content/playlists ────────────────────────────────────────────────
router.get('/playlists', async (req: Request, res: Response) => {
  const auth = getSourceClient(req)
  if (!auth) return res.status(401).json({ error: 'Source account not connected' })

  try {
    const youtube = google.youtube({ version: 'v3', auth })
    const playlists: object[] = []
    let pageToken: string | undefined

    do {
      const response = await youtube.playlists.list({
        part: ['snippet', 'contentDetails', 'status'],
        mine: true,
        maxResults: 50,
        pageToken,
      })

      for (const item of response.data.items || []) {
        // Skip system playlists (Watch Later, Liked Videos, Favorites)
        if (!item.id || ['WL', 'LL', 'FL', 'LM'].includes(item.id)) continue

        playlists.push({
          playlistId: item.id,
          title: item.snippet?.title || 'Untitled',
          description: item.snippet?.description || '',
          thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
          videoCount: item.contentDetails?.itemCount || 0,
          privacy: item.status?.privacyStatus || 'public',
          playlistUrl: `https://www.youtube.com/playlist?list=${item.id}`,
        })
      }

      pageToken = response.data.nextPageToken ?? undefined
    } while (pageToken)

    res.json({ playlists, total: playlists.length })
  } catch (err: any) {
    console.error('Playlists fetch error:', err?.message)
    const clean = handleYouTubeError(err, 'Failed to fetch playlists')
    res.status(clean.status).json(clean.body)
  }
})

// ── GET /api/content/playlists/:id/videos ────────────────────────────────────
router.get('/playlists/:id/videos', async (req: Request, res: Response) => {
  const auth = getSourceClient(req)
  if (!auth) return res.status(401).json({ error: 'Source account not connected' })

  const { id } = req.params

  try {
    const youtube = google.youtube({ version: 'v3', auth })
    const videos: object[] = []
    let pageToken: string | undefined

    do {
      const response = await youtube.playlistItems.list({
        part: ['snippet'],
        playlistId: id,
        maxResults: 50,
        pageToken,
      })

      for (const item of response.data.items || []) {
        const snippet = item.snippet
        if (!snippet) continue
        videos.push({
          videoId: snippet.resourceId?.videoId,
          title: snippet.title,
          channelTitle: snippet.videoOwnerChannelTitle || '',
          thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
          videoUrl: `https://www.youtube.com/watch?v=${snippet.resourceId?.videoId}`,
          position: snippet.position,
        })
      }

      pageToken = response.data.nextPageToken ?? undefined
    } while (pageToken)

    res.json({ videos, total: videos.length })
  } catch (err: any) {
    console.error('Playlist videos fetch error:', err?.message)
    const clean = handleYouTubeError(err, 'Failed to fetch playlist videos')
    res.status(clean.status).json(clean.body)
  }
})

// ── POST /api/content/watchlater/transfer ─────────────────────────────────────
// Streams NDJSON progress while adding videos to target account's Watch Later
router.post('/watchlater/transfer', async (req: Request, res: Response) => {
  const auth = getTargetClient(req)
  if (!auth) return res.status(401).json({ error: 'Target account not connected' })

  const { videoIds } = req.body as { videoIds?: string[] }
  if (!videoIds || videoIds.length === 0)
    return res.status(400).json({ error: 'videoIds array required' })

  res.setHeader('Content-Type', 'application/x-ndjson')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.setHeader('Cache-Control', 'no-cache')
  res.flushHeaders()

  const youtube = google.youtube({ version: 'v3', auth })
  const send = (data: object) => res.write(JSON.stringify(data) + '\n')

  send({ type: 'start', total: videoIds.length })

  let succeeded = 0, skipped = 0, failed = 0

  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i]
    try {
      await youtube.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId: 'WL',
            resourceId: { kind: 'youtube#video', videoId },
          },
        },
      })
      succeeded++
      send({ type: 'progress', index: i + 1, total: videoIds.length, itemId: videoId, status: 'success' })
    } catch (err: any) {
      const reason = err?.errors?.[0]?.reason || err?.message || 'unknown'
      if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
        send({ type: 'quota_exceeded', index: i + 1, total: videoIds.length, remaining: videoIds.length - i })
        break
      } else if (reason === 'duplicate' || reason === 'playlistItemsNotAccessible') {
        skipped++
        send({ type: 'progress', index: i + 1, total: videoIds.length, itemId: videoId, status: 'skipped', reason: 'Already in Watch Later' })
      } else {
        failed++
        send({ type: 'progress', index: i + 1, total: videoIds.length, itemId: videoId, status: 'error', reason })
      }
    }
    if (i < videoIds.length - 1) await sleep(RATE_LIMIT_MS)
  }

  send({ type: 'done', succeeded, skipped, failed, total: videoIds.length })
  res.end()
})

// ── POST /api/content/playlists/transfer ──────────────────────────────────────
// Creates playlists on target account and copies all videos from source
router.post('/playlists/transfer', async (req: Request, res: Response) => {
  const sourceAuth = getSourceClient(req)
  const targetAuth = getTargetClient(req)
  if (!sourceAuth) return res.status(401).json({ error: 'Source account not connected' })
  if (!targetAuth) return res.status(401).json({ error: 'Target account not connected' })

  const { playlists } = req.body as {
    playlists?: Array<{
      playlistId: string
      title: string
      description: string
      privacy: string
      videoCount: number
    }>
  }
  if (!playlists || playlists.length === 0)
    return res.status(400).json({ error: 'playlists array required' })

  res.setHeader('Content-Type', 'application/x-ndjson')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.setHeader('Cache-Control', 'no-cache')
  res.flushHeaders()

  const sourceYT = google.youtube({ version: 'v3', auth: sourceAuth })
  const targetYT = google.youtube({ version: 'v3', auth: targetAuth })
  const send = (data: object) => res.write(JSON.stringify(data) + '\n')

  send({ type: 'start', total: playlists.length })

  let succeeded = 0, failed = 0

  for (let i = 0; i < playlists.length; i++) {
    const pl = playlists[i]

    try {
      // Step 1 — Create the playlist on target
      const created = await targetYT.playlists.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: { title: pl.title, description: pl.description || '' },
          status: { privacyStatus: pl.privacy === 'private' ? 'private' : 'public' },
        },
      })
      const newPlaylistId = created.data.id!

      send({ type: 'playlist_created', index: i + 1, total: playlists.length, title: pl.title, newPlaylistId })

      // Step 2 — Fetch all videos from source playlist
      const videoIds: string[] = []
      let pageToken: string | undefined
      do {
        const r = await sourceYT.playlistItems.list({ part: ['snippet'], playlistId: pl.playlistId, maxResults: 50, pageToken })
        for (const item of r.data.items || []) {
          const vid = item.snippet?.resourceId?.videoId
          if (vid) videoIds.push(vid)
        }
        pageToken = r.data.nextPageToken ?? undefined
      } while (pageToken)

      send({ type: 'playlist_fetched', title: pl.title, videoCount: videoIds.length })

      // Step 3 — Copy each video into the new playlist
      let vOk = 0, vFail = 0
      for (let j = 0; j < videoIds.length; j++) {
        try {
          await targetYT.playlistItems.insert({
            part: ['snippet'],
            requestBody: {
              snippet: {
                playlistId: newPlaylistId,
                resourceId: { kind: 'youtube#video', videoId: videoIds[j] },
              },
            },
          })
          vOk++
        } catch (err: any) {
          const r = err?.errors?.[0]?.reason || ''
          if (r === 'quotaExceeded' || r === 'dailyLimitExceeded') {
            send({ type: 'quota_exceeded', index: i + 1, total: playlists.length, remaining: playlists.length - i })
            res.end()
            return
          }
          vFail++
        }
        await sleep(RATE_LIMIT_MS)
      }

      succeeded++
      send({
        type: 'playlist_done',
        index: i + 1,
        total: playlists.length,
        title: pl.title,
        newPlaylistId,
        videoSucceeded: vOk,
        videoFailed: vFail,
        status: 'success',
      })
    } catch (err: any) {
      failed++
      const reason = err?.errors?.[0]?.reason || err?.message || 'unknown'
      if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
        send({ type: 'quota_exceeded', index: i + 1, total: playlists.length, remaining: playlists.length - i })
        break
      }
      send({ type: 'playlist_done', index: i + 1, total: playlists.length, title: pl.title, status: 'error', reason })
    }

    await sleep(RATE_LIMIT_MS)
  }

  send({ type: 'done', succeeded, failed, total: playlists.length })
  res.end()
})

export default router
