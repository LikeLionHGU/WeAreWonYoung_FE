import { Navigate, useSearchParams } from 'react-router-dom'
import { ErrorNotice, Loading, Logo } from '../components/AppShell'
import { useAuth } from '../hooks/useAuth'

const loginErrors = new Map([
  ['failed', '로그인에 실패했습니다. 다시 시도해 주세요.'],
  ['blocked', '이용이 제한된 계정입니다.'],
])

export default function LoginPage() {
  const { status, user, loginHref } = useAuth()
  const [params] = useSearchParams()
  const notice = loginErrors.get(params.get('login') ?? '')

  if (status === 'loading') {
    return (
      <main className="center-page">
        <Loading label="로그인 상태를 확인하는 중" />
      </main>
    )
  }

  if (user) return <Navigate to="/" replace />

  return (
    <main className="login-page">
      <h1>
        <Logo />
      </h1>
      {notice && <ErrorNotice message={notice} />}
      <a className="login-action" href={loginHref}>
        Google로 로그인
      </a>
    </main>
  )
}
