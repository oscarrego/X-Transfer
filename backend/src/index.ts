import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import passport from 'passport'
import { sessionMiddleware } from './middleware/session'
import authRouter from './routes/auth'
import subscriptionsRouter from './routes/subscriptions'
import transferRouter from './routes/transfer'

const app = express()
const PORT = process.env.PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
)
app.use(express.json())
app.use(sessionMiddleware)
app.use(passport.initialize())
app.use(passport.session())

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authRouter)
app.use('/api/subscriptions', subscriptionsRouter)
app.use('/api/transfer', transferRouter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ✓  X Transfer backend running at http://localhost:${PORT}\n`)
})
