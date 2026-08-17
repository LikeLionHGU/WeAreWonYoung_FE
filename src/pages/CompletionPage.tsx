import { Link, Navigate, useParams } from 'react-router-dom'
import { ErrorNotice, Loading } from '../components/AppShell'
import { useAnalysisReport } from '../hooks/useAnalysisReport'
import { formatTime, reportEventTitle, reportEventKind } from '../utils/format'

export default function CompletionPage() {
  const { videoId } = useParams()
  const id = videoId ?? ''
  const { report, error } = useAnalysisReport(id)
  if (!id) return <Navigate to="/" replace />
  if (!report && !error) return <main className="center-page"><Loading label="검수 완료 화면을 준비하는 중" /></main>
  if (error) return <main className="center-page"><ErrorNotice message={error.message} code={error.code} /><Link className="button button-dark" to={`/videos/${id}/report`}>리포트로 돌아가기</Link></main>
  if (!report) return null
  const edited = report.events.filter(event => event.reviewAction === 'EDITED')
  const held = report.events.filter(event => event.reviewAction === 'HOLD')
  const kept = report.events.filter(event => event.reviewAction === 'CONFIRMED')
  const actionEvents = edited
  async function copyTimecodes() {
    const text = actionEvents.map(event => formatTime(event.startMs)).join('\n')
    try { await navigator.clipboard?.writeText(text) } catch { /* clipboard may be unavailable in preview */ }
  }
  return <main className="completion-page"><div className="completion-heading"><span className="completion-mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="m4 12.5 5 5L20 6.5" /></svg></span><h1>검수를 마쳤습니다</h1></div><p className="completion-subtitle">{report.filename} · 검토 후보 {report.events.length}건을 모두 확인했습니다.</p><section className="completion-summary" aria-label="검수 요약"><div><span>수정함</span><strong>{edited.length}건</strong></div><div><span>유지함</span><strong>{kept.length}건</strong></div><div><span>보류</span><strong>{held.length}건</strong></div></section><section className="completion-actions-section"><div className="completion-section-head"><h2>수정하기로 한 구간</h2><button type="button" onClick={() => void copyTimecodes()} disabled={actionEvents.length === 0}>타임코드 목록 복사</button></div><div className="completion-list">{actionEvents.length > 0 ? actionEvents.map(event => <div className="completion-row" key={event.id}><span className="completion-time">{formatTime(event.startMs)}</span><span className="completion-kind">{reportEventKind(event)}</span><p>{reportEventTitle(event)}</p><strong>수정함</strong></div>) : <div className="history-empty"><p>수정하기로 한 구간이 없습니다.</p></div>}</div></section><div className="completion-bottom"><div><Link className="completion-primary" to="/upload">새 영상 올리기</Link><Link className="completion-secondary" to={`/videos/${id}/report`}>리포트 다시 보기</Link></div><p>보류 {held.length}건은 리포트에 남아 있습니다.</p></div></main>
}
