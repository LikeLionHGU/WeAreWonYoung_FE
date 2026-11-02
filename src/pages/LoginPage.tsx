import { Navigate, useSearchParams } from 'react-router-dom'
import { ErrorNotice, Loading } from '../components/AppShell'
import { LandingKicker } from '../components/LandingKicker'
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

  if (user) return <Navigate to="/upload" replace />

  return (
    <main className="landing-empty-page">
      <LandingKicker label="로그인" />
      <h1>로그인하고 검수를 시작하세요</h1>
      <p>Google 계정으로 로그인하면 내가 올린 영상과 검수 이력을 볼 수 있습니다.</p>
      {notice && <ErrorNotice message={notice} />}
      <a className="landing-empty-action" href={loginHref}>
        <span>Google로 로그인</span>
        <strong>→</strong>
      </a>
    </main>
  )
}
