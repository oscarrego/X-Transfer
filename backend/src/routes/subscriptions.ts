import { Router, Request, Response } from 'express'
import { google } from 'googleapis'

const router = Router()

function getSourceClient(req: Request) {
  if (!req.session.sourceTokens) return null
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials(req.session.sourceTokens)
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
    res.status(500).json({ error: 'Failed to fetch subscriptions' })
  }
})

export default router
