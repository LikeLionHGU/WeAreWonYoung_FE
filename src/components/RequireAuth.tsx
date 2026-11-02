import { Navigate, Outlet } from 'react-router-dom'
import { ErrorNotice, Loading } from './AppShell'
import { useAuth } from '../hooks/useAuth'

export function RequireAuth() {
  const { status, user, retry } = useAuth()

  if (status === 'loading') {
    return (
      <main className="center-page">
        <Loading label="로그인 상태를 확인하는 중" />
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="center-page">
        <ErrorNotice message="로그인 상태를 확인하지 못했습니다." />
        <button type="button" className="button button-outline" onClick={retry}>
          다시 시도
        </button>
      </main>
    )
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}
