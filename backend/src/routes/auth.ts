import { Router, Request, Response } from 'express'
import { google } from 'googleapis'

const router = Router()

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const PORT = process.env.PORT || 3001
const BASE_URL = `http://localhost:${PORT}`

function createOAuthClient(role: 'source' | 'target') {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${BASE_URL}/auth/google/${role}/callback`
  )
}

const SCOPES_SOURCE = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/youtube.readonly',
]

const SCOPES_TARGET = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/youtube',
]

// ── /auth/google/source ───────────────────────────────────────────────────────
// Initiates OAuth for the SOURCE account (read-only)
router.get('/google/source', (_req: Request, res: Response) => {
  const oauth2Client = createOAuthClient('source')

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES_SOURCE,
    prompt: 'select_account consent',
  })
  res.redirect(url)
})

router.get('/google/source/callback', async (req: Request, res: Response) => {
  const { code } = req.query as { code?: string }
  if (!code) return res.redirect(`${FRONTEND_URL}/?error=no_code`)

  try {
    const oauth2Client = createOAuthClient('source')

    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: profile } = await oauth2.userinfo.get()

    req.session.sourceTokens = {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    }
    req.session.sourceProfile = {
      id: profile.id!,
      email: profile.email!,
      name: profile.name!,
      picture: profile.picture!,
    }

    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve()))
    )
    res.redirect(`${FRONTEND_URL}/`)
  } catch (err) {
    console.error('Source OAuth error:', err)
    res.redirect(`${FRONTEND_URL}/?error=auth_failed`)
  }
})

// ── /auth/google/target ───────────────────────────────────────────────────────
// Initiates OAuth for the TARGET account (read+write)
router.get('/google/target', (_req: Request, res: Response) => {
  const oauth2Client = createOAuthClient('target')

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES_TARGET,
    prompt: 'select_account consent',
  })
  res.redirect(url)
})

router.get('/google/target/callback', async (req: Request, res: Response) => {
  const { code } = req.query as { code?: string }
  if (!code) return res.redirect(`${FRONTEND_URL}/?error=no_code`)

  try {
    const oauth2Client = createOAuthClient('target')

    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: profile } = await oauth2.userinfo.get()

    req.session.targetTokens = {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    }
    req.session.targetProfile = {
      id: profile.id!,
      email: profile.email!,
      name: profile.name!,
      picture: profile.picture!,
    }

    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve()))
    )
    res.redirect(`${FRONTEND_URL}/`)
  } catch (err) {
    console.error('Target OAuth error:', err)
    res.redirect(`${FRONTEND_URL}/?error=auth_failed`)
  }
})

// ── /auth/status ──────────────────────────────────────────────────────────────
// Returns current session state for both accounts
router.get('/status', (req: Request, res: Response) => {
  res.json({
    source: req.session.sourceProfile
      ? { ...req.session.sourceProfile, connected: true }
      : { connected: false },
    target: req.session.targetProfile
      ? { ...req.session.targetProfile, connected: true }
      : { connected: false },
  })
})

// ── /auth/logout ──────────────────────────────────────────────────────────────
router.post('/logout/:role', (req: Request, res: Response) => {
  const { role } = req.params
  if (role === 'source') {
    delete req.session.sourceTokens
    delete req.session.sourceProfile
  } else if (role === 'target') {
    delete req.session.targetTokens
    delete req.session.targetProfile
  }
  req.session.save(() => res.json({ ok: true }))
})

router.post('/logout/all', (req: Request, res: Response) => {
  req.session.destroy(() => res.json({ ok: true }))
})

export default router
