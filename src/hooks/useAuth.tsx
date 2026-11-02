import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiClient, loginHref, setUnauthorizedHandler } from '../api/client'
import type { AuthMeResponse, AuthUser } from '../api/types'

type AuthStatus = 'loading' | 'ready' | 'error'

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  authEnabled: boolean
  loginHref: string
  retry: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [me, setMe] = useState<AuthMeResponse | null>(null)
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    let active = true
    void apiClient
      .me()
      .then(value => {
        if (!active) return
        setMe(value)
        setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [fetchKey])

  const markLoggedOut = useCallback(() => {
    setMe(current => current && { ...current, loggedIn: false, user: null })
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(markLoggedOut)
    return () => setUnauthorizedHandler(null)
  }, [markLoggedOut])

  const retry = useCallback(() => {
    setStatus('loading')
    setFetchKey(key => key + 1)
  }, [])

  const signOut = useCallback(async () => {
    await apiClient.logout()
    markLoggedOut()
  }, [markLoggedOut])

  const value = useMemo(
    () => ({
      status,
      user: me?.loggedIn ? me.user : null,
      authEnabled: me?.authEnabled ?? true,
      loginHref: loginHref(me?.loginUrl),
      retry,
      signOut,
    }),
    [me, retry, signOut, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
