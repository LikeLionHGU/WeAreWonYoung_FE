import { Link, NavLink, useLocation } from 'react-router-dom'
import logoUrl from '../assets/logo/oops-logo.svg'

export function Logo() {
  return <img className="brand-logo" src={logoUrl} alt="OoPs!?" />
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const shellPage = pathname === '/' ? 'shell-landing' : pathname === '/upload' ? 'shell-upload' : pathname === '/report' || pathname.startsWith('/videos/') && pathname.endsWith('/report') ? 'shell-report' : pathname.startsWith('/videos/') && pathname.endsWith('/analysis') ? 'shell-analysis' : ''
  return <div className={`shell ${shellPage}`}><header className="topbar"><Link className="brand" to="/"><Logo /></Link><nav className="main-nav" aria-label="주요 메뉴"><NavLink to="/upload">업로드</NavLink><NavLink to="/report">검수 리포트</NavLink><NavLink to="/history">검수 이력</NavLink><NavLink to="/settings">설정</NavLink>{pathname === '/' && <Link className="topbar-start" to="/upload">시작하기</Link>}</nav></header>{children}</div>
}

export function StatusPill({ status }: { status: string }) {
  const labels: Record<string, string> = { PENDING: '대기 중', PROCESSING: '분석 중', COMPLETED: '검수 완료', FAILED: '분석 실패' }
  return <span className={`status-pill status-${status.toLowerCase()}`}><span className="status-dot" />{labels[status] ?? status}</span>
}

export function ErrorNotice({ message, code }: { message: string; code?: string }) {
  return <div className="notice notice-error" role="alert"><span className="notice-icon">!</span><div><strong>{message}</strong>{code && <small>{code}</small>}</div></div>
}

export function Loading({ label = '불러오는 중' }: { label?: string }) { return <div className="loading"><span className="spinner" />{label}</div> }
