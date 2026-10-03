import { Router, Request, Response } from 'express'
import { google } from 'googleapis'
import { getPersistentAuth } from '../utils/persistentAuth'
import { handleYouTubeError } from '../utils/errors'

const router = Router()

function getSourceClient(req: Request) {
  const tokens = req.session.sourceTokens || getPersistentAuth().sourceTokens
  if (!tokens) return null

  // Ensure session has it
  req.session.sourceTokens = tokens

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials(tokens)
  return oauth2Client
}

// ── GET /api/subscriptions ────────────────────────────────────────────────────
// Fetches all subscriptions for the SOURCE account with full pagination
router.get('/', async (req: Request, res: Response) => {
  const auth = getSourceClient(req)
  if (!auth) {
    return res.status(401).json({ error: 'Source account not connected' })
  }

  try {
    const youtube = google.youtube({ version: 'v3', auth })
    const allItems: object[] = []
    let pageToken: string | undefined

    do {
      const response = await youtube.subscriptions.list({
        part: ['snippet', 'contentDetails'],
        mine: true,
        maxResults: 50,
        order: 'alphabetical',
        pageToken,
      })

      const items = response.data.items || []
      for (const item of items) {
        const snippet = item.snippet
        if (!snippet) continue
        allItems.push({
          channelId: snippet.resourceId?.channelId,
          title: snippet.title,
          description: snippet.description,
          thumbnail:
            snippet.thumbnails?.default?.url ||
            snippet.thumbnails?.medium?.url ||
            '',
          channelUrl: `https://www.youtube.com/channel/${snippet.resourceId?.channelId}`,
          publishedAt: snippet.publishedAt,
        })
      }

      pageToken = response.data.nextPageToken ?? undefined
    } while (pageToken)

    res.json({ subscriptions: allItems, total: allItems.length })
  } catch (err: any) {
    console.error('Subscriptions fetch error:', err?.message)
    const clean = handleYouTubeError(err, 'Failed to fetch subscriptions')
    res.status(clean.status).json(clean.body)
  }
})

export default router
