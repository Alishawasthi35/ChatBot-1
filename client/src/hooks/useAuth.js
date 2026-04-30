import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'

const TOKEN_KEY = 'authToken'
const USER_KEY = 'authUser'

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(readStoredUser)
  const [status, setStatus] = useState(() => (localStorage.getItem(TOKEN_KEY) ? 'checking' : 'signedOut'))
  const [error, setError] = useState('')

  const storeSession = useCallback((session) => {
    localStorage.setItem(TOKEN_KEY, session.token)
    localStorage.setItem(USER_KEY, JSON.stringify(session.user))
    setToken(session.token)
    setUser(session.user)
    setStatus('signedIn')
    setError('')
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
    setStatus('signedOut')
  }, [])

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    async function verifySession() {
      try {
        const data = await apiRequest('/api/me', { token })

        if (!cancelled) {
          localStorage.setItem(USER_KEY, JSON.stringify(data.user))
          setUser(data.user)
          setStatus('signedIn')
        }
      } catch {
        if (!cancelled) {
          clearSession()
        }
      }
    }

    verifySession()

    return () => {
      cancelled = true
    }
  }, [clearSession, token])

  const login = useCallback(
    async ({ email, password }) => {
      setError('')
      const session = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      storeSession(session)
    },
    [storeSession],
  )

  const register = useCallback(
    async ({ name, email, password }) => {
      setError('')
      const session = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: { name, email, password },
      })
      storeSession(session)
    },
    [storeSession],
  )

  const logout = useCallback(async () => {
    try {
      if (token) {
        await apiRequest('/api/auth/logout', { method: 'POST', token })
      }
    } finally {
      clearSession()
    }
  }, [clearSession, token])

  return {
    token,
    user,
    status,
    error,
    setError,
    login,
    register,
    logout,
  }
}
