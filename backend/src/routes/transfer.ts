import { Router, Request, Response } from 'express'
import { google } from 'googleapis'

const router = Router()

// Quota: each subscription insert = 50 units. Default daily quota = 10,000 units.
// Max safe transfers per day = 200
const RATE_LIMIT_MS = 1200 // ~50/min to stay safe

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getTargetClient(req: Request) {
  if (!req.session.targetTokens) return null
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials(req.session.targetTokens)
  return oauth2Client
}

// ── POST /api/transfer ────────────────────────────────────────────────────────
// Body: { channelIds: string[] }
// Subscribes the TARGET account to each provided channelId
// Returns a streaming NDJSON response (one JSON object per line) for live progress
router.post('/', async (req: Request, res: Response) => {
  const auth = getTargetClient(req)
  if (!auth) {
    return res.status(401).json({ error: 'Target account not connected' })
  }

  const { channelIds } = req.body as { channelIds?: string[] }
  if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
    return res.status(400).json({ error: 'channelIds array required' })
  }

  // Stream NDJSON for real-time progress
  res.setHeader('Content-Type', 'application/x-ndjson')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.setHeader('Cache-Control', 'no-cache')
  res.flushHeaders()

  const youtube = google.youtube({ version: 'v3', auth })

  const send = (data: object) => {
    res.write(JSON.stringify(data) + '\n')
  }

  send({ type: 'start', total: channelIds.length })

  let succeeded = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < channelIds.length; i++) {
    const channelId = channelIds[i]

    try {
      await youtube.subscriptions.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            resourceId: {
              kind: 'youtube#channel',
              channelId,
            },
          },
        },
      })

      succeeded++
      send({
        type: 'progress',
        index: i + 1,
        total: channelIds.length,
        channelId,
        status: 'success',
      })
    } catch (err: any) {
      const reason: string = err?.errors?.[0]?.reason || err?.message || 'unknown'

      if (reason === 'subscriptionDuplicate') {
        skipped++
        send({
          type: 'progress',
          index: i + 1,
          total: channelIds.length,
          channelId,
          status: 'skipped',
          reason: 'Already subscribed',
        })
      } else {
        failed++
        send({
          type: 'progress',
          index: i + 1,
          total: channelIds.length,
          channelId,
          status: 'error',
          reason,
        })
      }
    }

    // Rate limiting — avoid hitting quota
    if (i < channelIds.length - 1) {
      await sleep(RATE_LIMIT_MS)
    }
  }

  send({ type: 'done', succeeded, skipped, failed, total: channelIds.length })
  res.end()
})

// ── GET /api/transfer/quota ───────────────────────────────────────────────────
// Returns quota estimate info
router.get('/quota', (_req: Request, res: Response) => {
  res.json({
    unitsPerInsert: 50,
    defaultDailyQuota: 10000,
    maxTransfersPerDay: 200,
    rateLimitMs: RATE_LIMIT_MS,
    note: 'If you have more than 200 subscriptions, the transfer will pause for 24h after hitting the quota. Request a quota increase at console.cloud.google.com',
  })
})

export default router
