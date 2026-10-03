import fs from 'fs'
import path from 'path'

export interface AccountTokens {
  access_token: string
  refresh_token?: string | null
  expiry_date?: number | null
}

export interface AccountProfile {
  id: string
  email: string
  name: string
  picture: string
}

export interface PersistentAuthState {
  sourceTokens?: AccountTokens
  sourceProfile?: AccountProfile
  targetTokens?: AccountTokens
  targetProfile?: AccountProfile
}

const STORAGE_PATH = path.join(__dirname, '../../.session-data.json')

export function getPersistentAuth(): PersistentAuthState {
  try {
    if (fs.existsSync(STORAGE_PATH)) {
      const data = fs.readFileSync(STORAGE_PATH, 'utf-8')
      return JSON.parse(data) as PersistentAuthState
    }
  } catch (err) {
    console.error('Error reading persistent auth state:', err)
  }
  return {}
}

function writePersistentAuth(state: PersistentAuthState): void {
  try {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(state, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing persistent auth state:', err)
  }
}

export function saveSourceAuth(tokens: AccountTokens, profile: AccountProfile): void {
  const current = getPersistentAuth()
  current.sourceTokens = tokens
  current.sourceProfile = profile
  writePersistentAuth(current)
}

export function saveTargetAuth(tokens: AccountTokens, profile: AccountProfile): void {
  const current = getPersistentAuth()
  current.targetTokens = tokens
  current.targetProfile = profile
  writePersistentAuth(current)
}

export function clearRoleAuth(role: 'source' | 'target'): void {
  const current = getPersistentAuth()
  if (role === 'source') {
    delete current.sourceTokens
    delete current.sourceProfile
  } else {
    delete current.targetTokens
    delete current.targetProfile
  }
  writePersistentAuth(current)
}

export function clearAllAuth(): void {
  try {
    if (fs.existsSync(STORAGE_PATH)) {
      fs.unlinkSync(STORAGE_PATH)
    }
  } catch (err) {
    console.error('Error clearing persistent auth:', err)
  }
}
