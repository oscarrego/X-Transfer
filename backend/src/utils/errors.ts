export interface CleanErrorResponse {
  status: number
  body: {
    error: 'quota_exceeded' | 'api_limitation' | 'api_error'
    message: string
    isQuota?: boolean
  }
}

export function handleYouTubeError(err: any, fallbackMessage: string): CleanErrorResponse {
  const reason = err?.errors?.[0]?.reason || ''
  const message: string = err?.message || ''
  const code = err?.code || err?.status

  // Check for quota limits
  const isQuota =
    reason === 'quotaExceeded' ||
    reason === 'dailyLimitExceeded' ||
    reason === 'rateLimitExceeded' ||
    message.toLowerCase().includes('quota')

  if (isQuota) {
    return {
      status: 429,
      body: {
        error: 'quota_exceeded',
        isQuota: true,
        message: 'YouTube daily transfer quota reached. Quota resets daily at midnight PT.',
      },
    }
  }

  // Strip any raw HTML tags from Google error message
  const cleanMessage = message.replace(/<[^>]*>?/gm, '').trim() || fallbackMessage

  return {
    status: typeof code === 'number' && code >= 400 && code < 600 ? code : 500,
    body: {
      error: 'api_error',
      isQuota: false,
      message: cleanMessage,
    },
  }
}
