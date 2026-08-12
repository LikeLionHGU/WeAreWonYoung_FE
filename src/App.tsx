import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { AppShell, ErrorNotice, Loading, StatusPill } from './components/AppShell'
import { assetUrl } from './api/client'
import type { AnalysisReportResponse, TimelineEvent } from './api/types'
import type { VideoHistoryItem } from './api/types'
import { apiClient } from './api/client'
import { useAnalysisProgress } from './hooks/useAnalysisProgress'
import { useAnalysisReport } from './hooks/useAnalysisReport'
import { useAnalysisRetry } from './hooks/useAnalysisRetry'
import { useVideoUpload } from './hooks/useVideoUpload'
import logoUrl from './assets/logo/oops-logo.svg'

function UploadPage() {
  const navigate = useNavigate(); const inputRef = useRef<HTMLInputElement>(null); const { upload, isUploading, error } = useVideoUpload(); const [fileName, setFileName] = useState(''); const [isDragging, setIsDragging] = useState(false); const [title, setTitle] = useState(''); const [channel, setChannel] = useState('')
  async function submit() { const file = inputRef.current?.files?.[0]; if (!file) return; const result = await upload(file); if (result) navigate(`/videos/${result.videoId}/analysis`) }
  function acceptFiles(files: FileList | null) { const file = files?.[0]; if (file) { setFileName(file.name); if (inputRef.current) { const transfer = new DataTransfer(); transfer.items.add(file); inputRef.current.files = transfer.files } } setIsDragging(false) }
  return <main className="upload-page"><section className="upload-main"><h1>영상 업로드</h1><p className="upload-subtitle">// 문구수정필 편집이 끝난 완성본 한 편을 올려 주세요. mp4 또는 mov, 최대 10분 · 2GB.</p><label className={`dropzone ${fileName ? 'has-file' : ''} ${isDragging ? 'is-dragging' : ''}`} htmlFor="video-file" onDragEnter={event => { event.preventDefault(); setIsDragging(true) }} onDragOver={event => { event.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={event => { event.preventDefault(); acceptFiles(event.dataTransfer.files) }}><strong>{fileName || '파일을 이 영역으로 끌어다 놓으세요'}</strong><span>{fileName ? '다른 파일을 선택하려면 클릭' : '또는 눌러서 파일 선택 · 업로드 중 중단하고 다시 이어서 올릴 수 있습니다'}</span><div className="upload-icon" aria-hidden="true"><svg viewBox="0 0 14 14" focusable="false"><path d="M6.5 10.58V1.93L4.17 4.26l-.71-.72L7 0l3.54 3.54-.71.72L7.5 1.93v8.65h-1ZM0 14V9.96h1V13h12V9.96h1V14H0Z" /></svg></div><input ref={inputRef} id="video-file" type="file" accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo" onChange={event => acceptFiles(event.target.files)} /></label><div className="upload-fields"><label><span>영상 제목 (선택)</span><input value={title} onChange={event => setTitle(event.target.value)} placeholder="영상 제목을 입력하세요" /></label><label><span>채널 URL (선택)</span><input value={channel} onChange={event => setChannel(event.target.value)} placeholder="youtube.com/@channel" /></label></div>{error && <ErrorNotice message={error.message} code={error.code} />}<div className="upload-submit"><p>//문구 수정필 업로드가 끝나면 분석이 곧바로 시작됩니다. 10분 영상 기준 5분 이내에 리포트가 나옵니다.</p><button className="button button-primary" disabled={!fileName || isUploading} onClick={() => void submit()}>{isUploading ? <><span className="spinner spinner-light" />업로드 중…</> : '분석 시작'}</button></div></section><aside className="policy-panel"><h2>데이터 보관 정책</h2><p>편집 완료본은 채널의 가장 민감한 자산입니다.</p><dl><div><dt>원본 영상</dt><dd>분석 완료 후 24시간 내 자동 삭제</dd></div><div><dt>모델 학습</dt><dd>사용하지 않습니다</dd></div><div><dt>리포트</dt><dd>텍스트 결과와 대표 프레임만 보관, 언제든 삭제 가능</dd></div><div><dt>전송</dt><dd>전 구간 암호화</dd></div></dl></aside></main>
}

const landingSteps = [
  ['음성을 텍스트로 변환', '완료'],
  ['발언 리스크 후보 탐지', '완료'],
  ['화면 변화 감지 및 대표 프레임 추출', '진행 중'],
  ['화면 자막 OCR', '대기'],
  ['발언과 자막 대조', '대기'],
] as const

function LandingEmailForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  function submit(event: React.FormEvent) { event.preventDefault(); if (!email.trim()) return; setSent(true); setEmail('') }
  return <form className={`landing-email ${compact ? 'landing-email-compact' : ''}`} onSubmit={submit}><input aria-label="이메일 입력" value={email} onChange={event => { setEmail(event.target.value); setSent(false) }} placeholder={sent ? '설문 메일을 보냈습니다' : '이메일 입력 칸'} type="email" required /><button aria-label="이메일 제출" type="submit">›</button></form>
}

function LandingSteps() {
  const [active, setActive] = useState(2)
  useEffect(() => { const timer = window.setInterval(() => setActive(value => (value + 1) % landingSteps.length), 1500); return () => window.clearInterval(timer) }, [])
  return <div className="landing-steps">{landingSteps.map(([label, done], index) => <div className={`landing-step ${index === active ? 'is-active' : ''} ${index < active ? 'is-done' : ''}`} key={label}><span className="landing-step-dot" /><span>{label}</span><small>{index < active ? '완료' : index === active ? done : '대기'}</small></div>)}</div>
}

function LandingPage() {
  const navigate = useNavigate()
  return <main className="landing-page">
    <section className="landing-hero"><div className="landing-hero-main"><div className="landing-kicker"><strong>업로드 전 검수</strong><span className="landing-kicker-line" /><i /><i /><i className="active" /></div><h1>편집이 끝난 영상 한 편에서,<br />업로드 전에 다시 확인할 구간만 찾습니다.</h1><p className="landing-lead">발언과 화면 자막, 화면 속 삽입 이미지를 분석해 검토가 필요한 지점을 타임라인으로 제시합니다.<br />판정하지 않고, 고치지도 않습니다. 직접 판단할 제작자가 합니다.</p><div className="landing-hero-bottom"><LandingEmailForm /><LandingSteps /></div></div><div className="landing-blue-panel" aria-hidden="true"><span>Oo</span><span>Ps</span></div></section>
    <section className="landing-section landing-belief"><h2>혼자 만든 영상은 혼자 볼 수 없습니다</h2><p>말한 사람, 자른 사람, 자막을 단 사람이 같은 사람입니다. 제작자의 눈에는 의도가 계속 보이지만 시청자는 결과물만 봅니다.<br />주의력의 문제가 아니라 구조적인 사각지대입니다.</p></section>
    <section className="landing-section landing-three"><h2>OoPs!?는 세 가지를 봅니다</h2><div className="landing-three-grid"><LandingInfo title="발언">타임스탬프가 붙은 대본을 만들고, 앞뒤 맥락과 함께 검토 후보를 찾습니다. 문장 단위로 잘라 판단하지 않습니다.</LandingInfo><LandingInfo title="화면 자막">화면 변화가 감지된 시점에서 제작자가 넣은 자막을 추출합니다. 같은 자막이 이어지면 하나로 묶습니다.</LandingInfo><LandingInfo title="화면 속 상징">등록된 참조 이미지와 형태가 유사한 프레임을 표시합니다. 의미는 서비스가 만들어내지 않습니다.</LandingInfo></div></section>
    <section className="landing-section landing-compare"><div className="landing-compare-copy"><span className="landing-orange-label">핵심은 이것입니다</span><h2>발언과 자막을 나란히 놓고 봅니다</h2><p>1인 편집 환경에서는 자막이 발언보다 세지는 일이 자주 일어납니다. 판정 근거가 화면에 전부 보이기 때문에, 검출이 틀렸더라도 제작자가 바로 판단할 수 있습니다.</p></div><div className="landing-compare-card"><div><span>실제 발언</span><strong>“조금 아쉬웠습니다.”</strong></div><div><span>화면 자막</span><strong>“역대 최악의 선택”</strong></div><p>실제 발언보다 화면 자막의 비판 강도가 높아, 출연자의 입장이 더 공격적으로 전달될 수 있습니다.</p></div></section>
    <section className="landing-section landing-limitations"><div><h2>OoPs!?가 하지 않는 것</h2><p>판정할 수 없는 것은 판정하지 않습니다.<br />확실하지 않은 검출을 늘리는 대신 줄이는 쪽을 택했습니다.</p></div><div className="landing-limit-list"><LandingInfo title="손·포즈·제스처 분석">랜드마크 유사도만으로는 의미를 판정할 수 없습니다.</LandingInfo><LandingInfo title="댓글 기반 외부 맥락">다른 영상의 댓글은 이 영상의 예측이 아닙니다.</LandingInfo><LandingInfo title="법률 판정">위법 여부와 정치 성향을 판단하지 않습니다.</LandingInfo><LandingInfo title="자동 편집·수정">영상을 대신 고치지 않습니다.</LandingInfo></div></section>
    <section className="landing-section landing-evidence"><h2>모든 검출에 근거 수준을 붙입니다</h2><div className="landing-evidence-grid"><LandingInfo title="직접 근거">화면과 음성에서 직접 확인할 수 있습니다.</LandingInfo><LandingInfo title="유사 사례">참조 자료와의 유사성에 기반합니다.</LandingInfo><LandingInfo title="맥락 추정">해석에 기반하며 확실성이 가장 낮습니다.</LandingInfo></div></section>
    <section className="landing-section landing-cta"><div><h2>한 편으로 확인해 보세요</h2><p>원본 영상은 분석 완료 후 24시간 안에 자동 삭제되며, 모델 학습에 사용하지 않습니다.</p></div><LandingEmailForm compact /></section>
    <footer className="landing-footer"><div><strong>제품</strong><a onClick={() => navigate('/upload')}>업로드</a><a onClick={() => navigate('/report')}>검수 리포트</a><a onClick={() => navigate('/history')}>검수 이력</a></div><div><strong>정책</strong><a>데이터 보관</a><a>AI 출력 원칙</a><a>참조 데이터베이스 기준</a></div><div className="landing-footer-brand"><img className="landing-footer-logo" src={logoUrl} alt="OoPs!?" /><p>AI는 의도와 정치 성향, 법률 위반을 판정하지 않습니다.<br />다시 확인할 구간만 제시합니다.</p><small>원본 영상 24시간 내 자동 삭제 · 모델 학습 미사용 · 전 구간 암호화<br />© 2026 OoPs!?</small></div></footer>
  </main>
}

function LandingInfo({ title, children }: { title: string; children: React.ReactNode }) { return <article className="landing-info"><h3>{title}</h3><p>{children}</p></article> }

function AnalysisPage() {
  const { videoId } = useParams(); const id = Number(videoId); const navigate = useNavigate(); const { status, isFallback } = useAnalysisProgress(id); const { retry, isRetrying } = useAnalysisRetry()
  useEffect(() => { if (status?.status === 'COMPLETED') navigate(`/videos/${id}/report`, { replace: true }) }, [id, navigate, status?.status])
  if (!Number.isFinite(id)) return <Navigate to="/" replace />
  if (!status) return <main className="center-page"><Loading label="검수 작업을 불러오는 중" /></main>
  const failed = status.status === 'FAILED'
  async function handleRetry() { const result = await retry(id); if (result) window.location.reload() }
  const stages = [['STT', '음성을 텍스트로 변환'], ['TEXT_RISK', '발언 리스크 후보 탐지'], ['SCENE_DETECTION', '화면 변화 감지 및 대표 프레임 추출'], ['OCR', '화면 자막 OCR'], ['MULTIMODAL', '발언과 자막 대조']] as const
  const activeIndex = stages.findIndex(([stage]) => stage === status.stage)
  return <main className="analysis-page"><section className="analysis-main"><div className="page-kicker"><Link to="/">← 새 영상 검수</Link><StatusPill status={status.status} /></div><div className="analysis-file">업로드한 영상 · {status.message}</div><section className="analysis-hero"><div className="analysis-copy"><p className="eyebrow">STEP 02 / ANALYSIS</p><h1>{failed ? '검수 중 문제가 발생했습니다.' : '분석 중입니다'}</h1><p>{failed ? status.message : '남은 시간은 분석 단계에 따라 달라집니다. 음성 분석과 화면 분석은 따로 진행됩니다.'}</p></div></section><div className="progress-track analysis-progress"><span style={{ width: `${status.progress}%` }} /></div><section className="analysis-steps">{stages.map(([stage, label], index) => { const done = status.status === 'COMPLETED' || (activeIndex > -1 && index < activeIndex); const active = !done && stage === status.stage; return <div className={`analysis-step ${done ? 'done' : ''} ${active ? 'active' : ''}`} key={stage}><span className="step-dot" /><strong>{label}</strong><span>{done ? '완료' : active ? '진행 중' : '대기'}</span></div> })}</section>{isFallback && !failed && <p className="connection-note">실시간 연결이 잠시 끊겨 상태 조회로 확인하고 있습니다.</p>}{failed && <div className="retry-box"><ErrorNotice message={status.message || '분석에 실패했습니다.'} code={status.errorCode} /><button className="button button-dark" onClick={() => void handleRetry()} disabled={isRetrying}>{isRetrying ? '다시 준비하는 중…' : '다시 분석하기 →'}</button></div>}{status.status === 'COMPLETED' && <button className="button button-primary button-wide" onClick={() => navigate(`/videos/${id}/report`)}>검수 결과 보기 →</button>}</section><aside className="analysis-brand-panel" aria-hidden="true"><span>Oo</span><span>Ps</span></aside></main>
}

function SeveritySummary({ report }: { report: AnalysisReportResponse }) { return <div className="summary-grid">{(['high', 'medium', 'low'] as const).map(level => <div className={`summary-card summary-${level}`} key={level}><span>{level === 'high' ? '높은 위험' : level === 'medium' ? '검토 권장' : '낮은 위험'}</span><strong>{report.summary[level]}</strong><small>개 구간</small></div>)}</div> }

function EventCard({ event, selected, onSelect }: { event: TimelineEvent; selected: boolean; onSelect: () => void }) { const title = event.type === 'SPEECH' ? event.text : event.captionText; const meta = event.type === 'SPEECH' ? event.riskTypes.join(' · ') : '자막과 발언 불일치'; return <button className={`event-card severity-${event.severity.toLowerCase()} ${selected ? 'selected' : ''}`} onClick={onSelect}><span className="event-time">{formatTime(event.startMs)} — {formatTime(event.endMs)}</span><span className="event-type">{event.type === 'SPEECH' ? '발언' : '자막'} · {meta}</span><strong>{title}</strong><span className="event-reason">{event.reason}</span></button> }
function formatTime(ms: number) { const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` }

function ReportPage() {
  const { videoId } = useParams(); const id = Number(videoId); const { report, error } = useAnalysisReport(id); const videoRef = useRef<HTMLVideoElement>(null); const [selected, setSelected] = useState<TimelineEvent | null>(null)
  if (!Number.isFinite(id)) return <Navigate to="/" replace />
  if (!report && !error) return <main className="center-page"><Loading label="검수 결과를 정리하는 중" /></main>
  if (error) return <main className="center-page"><ErrorNotice message={error.message} code={error.code} /><Link className="button button-dark" to={`/videos/${id}/analysis`}>분석 상태로 돌아가기</Link></main>
  if (!report) return null
  function selectEvent(event: TimelineEvent) { setSelected(event); if (videoRef.current) { videoRef.current.currentTime = event.startMs / 1000; void videoRef.current.play().catch(() => undefined) } }
  return <main className="report-page"><div className="page-kicker"><Link to="/">← 새 영상 검수</Link><StatusPill status="COMPLETED" /></div><div className="report-title"><div><p className="eyebrow">STEP 03 / REPORT</p><h1>검수 결과를 확인하세요.</h1><p>위험도가 높은 구간부터 확인하고, 게시 전 필요한 검토를 남겨보세요.</p></div><button className="button button-outline" onClick={() => window.print()}>리포트 인쇄</button></div><SeveritySummary report={report} /><section className="review-grid"><div className="video-panel"><div className="video-wrap"><video ref={videoRef} controls preload="metadata" src={assetUrl(`/api/v1/videos/${id}/stream`)}><track kind="captions" /></video><span className="video-label">원본 영상</span></div>{selected ? <div className="selected-detail"><div><span className={`severity-label severity-label-${selected.severity.toLowerCase()}`}>{selected.severity} RISK</span><h2>{selected.type === 'SPEECH' ? selected.text : selected.captionText}</h2></div><p>{selected.reason}</p>{selected.frameUrl && <img src={assetUrl(selected.frameUrl)} alt="분석된 영상 프레임" />}</div> : <div className="empty-detail"><span>↖</span><p>타임라인의 구간을 선택하면<br />영상이 해당 시점으로 이동합니다.</p></div>}</div><aside className="timeline-panel"><div className="panel-heading"><div><p className="eyebrow">TIMELINE</p><h2>검토가 필요한 순간</h2></div><span>{report.events.length}개</span></div><div className="event-list">{report.events.map(event => <EventCard key={event.id} event={event} selected={selected?.id === event.id} onSelect={() => selectEvent(event)} />)}</div></aside></section></main>
}

function EmptyReportPage() {
  return <EmptyUploadPage eyebrow="검수 리포트" title="아직 검수 리포트가 없습니다." description="영상을 업로드하면 분석이 끝난 뒤 위험 구간과 근거를 이곳에서 확인할 수 있습니다." />
}

function HistoryPage() {
  const [items, setItems] = useState<VideoHistoryItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { let active = true; void apiClient.videos().then(value => { if (active) setItems(value) }).catch(() => { if (active) setError('검수 이력을 불러오지 못했습니다.') }); return () => { active = false } }, [])
  if (items?.length === 0 && !error) return <EmptyUploadPage eyebrow="검수 이력" title="아직 검수 이력이 없습니다." description="첫 영상을 업로드하면 진행 중인 작업과 완료된 리포트가 이곳에 쌓입니다." />
  return <main className="data-page"><p className="eyebrow">검수 이력</p><h1>업로드한 영상의 검수 기록</h1><p className="data-page-copy">직접 업로드하고 검수를 시작한 영상만 이곳에 표시됩니다.</p>{error && <ErrorNotice message={error} />}{items === null && !error ? <Loading label="검수 이력을 불러오는 중" /> : <div className="history-list">{items?.map(item => <HistoryRow item={item} key={item.videoId} />)}</div>}</main>
}

function EmptyUploadPage({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <main className="landing-empty-page"><div className="landing-empty-kicker"><strong>{eyebrow}</strong><span className="landing-empty-kicker-line" /><i /><i /><i className="active" /></div><h1>{title}</h1><p>{description}</p><Link className="landing-empty-action" to="/upload"><span>영상 업로드하기</span><strong>→</strong></Link></main>
}

function HistoryRow({ item }: { item: VideoHistoryItem }) {
  const navigate = useNavigate()
  const target = item.status === 'COMPLETED' ? `/videos/${item.videoId}/report` : `/videos/${item.videoId}/analysis`
  return <button className="history-row" onClick={() => navigate(target)}><span className="history-file"><strong>{item.filename}</strong><small>{new Date(item.uploadedAt).toLocaleDateString('ko-KR')}</small></span><span>{item.status === 'COMPLETED' ? `${item.eventCount}건` : item.status === 'FAILED' ? '실패' : `${item.progress}%`}</span><StatusPill status={item.status} /></button>
}

function SettingsPage() {
  return <main className="settings-page"><h1>설정 · 결제</h1><section className="settings-section settings-plan"><h2>요금제</h2><div className="settings-plan-grid"><article><h3>크리에이터 요금제</h3><strong>0원</strong><p>무료입니다.</p></article><article><h3>스튜디오 요금제</h3><strong>0원</strong><p>무료입니다.</p></article></div></section><section className="settings-section settings-data"><h2>데이터</h2><div className="settings-data-list"><div><div><h3>보관 중인 원본 영상</h3><p>0건 · 업로드 후 자동 삭제 일정이 표시됩니다.</p></div><button disabled>지금 삭제</button></div><div><div><h3>리포트 기록</h3><p>0건 · 업로드 후 텍스트 결과와 대표 프레임이 표시됩니다.</p></div><button disabled>전체 삭제</button></div></div></section><section className="settings-section settings-scope"><h2>분석 범위</h2><p>발언 · 화면 자막 · 발언과 자막 비교가 켜져 있습니다. 화면 속 상징 유사도 탐지는 참조 데이터베이스 연결 후 활성화됩니다. 분석 범위는 결과 리포트에서 확인할 수 있습니다.</p></section></main>
}

export default function App() { return <AppShell><Routes><Route path="/" element={<LandingPage />} /><Route path="/upload" element={<UploadPage />} /><Route path="/report" element={<EmptyReportPage />} /><Route path="/history" element={<HistoryPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/videos/:videoId/analysis" element={<AnalysisPage />} /><Route path="/videos/:videoId/report" element={<ReportPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></AppShell> }
