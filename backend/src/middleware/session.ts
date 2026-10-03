import session from 'express-session'

declare module 'express-session' {
  interface SessionData {
    sourceTokens?: {
      access_token: string
      refresh_token?: string | null
      expiry_date?: number | null
    }
    targetTokens?: {
      access_token: string
      refresh_token?: string | null
      expiry_date?: number | null
    }
    sourceProfile?: {
      id: string
      email: string
      name: string
      picture: string
    }
    targetProfile?: {
      id: string
      email: string
      name: string
      picture: string
    }
  }
}

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
    sameSite: 'lax',
  },
})
