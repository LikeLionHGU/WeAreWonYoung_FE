import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppShell, ErrorNotice, Loading } from './components/AppShell'
import { assetUrl, hasConfiguredApi } from './api/client'
import type { CandidateType, TimelineEvent } from './api/types'
import type { VideoHistoryItem } from './api/types'
import { apiClient } from './api/client'
import { useAnalysisProgress } from './hooks/useAnalysisProgress'
import { useAnalysisReport } from './hooks/useAnalysisReport'
import { useAnalysisRetry } from './hooks/useAnalysisRetry'
import { useVideoUpload } from './hooks/useVideoUpload'
import logoUrl from './assets/logo/oops-logo.svg'
import landingLogoUrl from './assets/logo/oops-landing-logo.svg'

function UploadPage() {
  const navigate = useNavigate(); const inputRef = useRef<HTMLInputElement>(null); const { upload, isUploading, error } = useVideoUpload(); const [fileName, setFileName] = useState(''); const [isDragging, setIsDragging] = useState(false); const [title, setTitle] = useState(''); const [channel, setChannel] = useState('')
  async function submit() { const file = inputRef.current?.files?.[0]; if (!file) return; const result = await upload(file); if (result) navigate(`/videos/${result.videoId}/analysis`) }
  function acceptFiles(files: FileList | null) { const file = files?.[0]; if (file) { setFileName(file.name); if (inputRef.current) { const transfer = new DataTransfer(); transfer.items.add(file); inputRef.current.files = transfer.files } } setIsDragging(false) }
  return <main className="upload-page"><section className="upload-main"><h1>영상 업로드</h1><p className="upload-subtitle">공개 전 다시 확인하고 싶은 영상 한 편을 올려 주세요. (mp4 또는 mov)</p><label className={`dropzone ${fileName ? 'has-file' : ''} ${isDragging ? 'is-dragging' : ''}`} htmlFor="video-file" onDragEnter={event => { event.preventDefault(); setIsDragging(true) }} onDragOver={event => { event.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={event => { event.preventDefault(); acceptFiles(event.dataTransfer.files) }}><div className="upload-icon" aria-hidden="true"><svg viewBox="0 0 14 14" focusable="false"><path d="M6.5 10.58V1.93L4.17 4.26l-.71-.72L7 0l3.54 3.54-.71.72L7.5 1.93v8.65h-1ZM0 14V9.96h1V13h12V9.96h1V14H0Z" /></svg></div><strong>{fileName || '파일을 이 영역으로 끌어다 놓으세요'}</strong><span>{fileName ? '다른 파일을 선택하려면 클릭' : '또는 눌러서 파일 선택 · 업로드 중 중단하고 다시 이어 올릴 수 있습니다'}</span><input ref={inputRef} id="video-file" type="file" accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo" onChange={event => acceptFiles(event.target.files)} /></label><div className="upload-fields"><label><span>영상 제목 (선택)</span><input value={title} onChange={event => setTitle(event.target.value)} placeholder="8월 3주차 시사 해설" /></label><label><span>채널 URL (선택)</span><input value={channel} onChange={event => setChannel(event.target.value)} placeholder="youtube.com/@channel" /></label></div>{error && <ErrorNotice message={error.message} code={error.code} />}<div className="upload-submit"><p>업로드가 끝나면 분석이 곧바로 시작됩니다.</p><button className="button button-primary" disabled={!fileName || isUploading} onClick={() => void submit()}>{isUploading ? <><span className="spinner spinner-light" />업로드 중…</> : '분석 시작'}</button></div></section><aside className="policy-panel"><h2>데이터 보관 정책</h2><p>공개 전 영상은 채널의 민감한 자산입니다.</p><dl><div><dt>원본 영상</dt><dd>분석 완료 후 24시간 내 자동 삭제</dd></div><div><dt>모델 학습</dt><dd>사용하지 않습니다</dd></div><div><dt>리포트</dt><dd>텍스트 결과와 대표 프레임만 보관, 언제든 삭제 가능</dd></div><div><dt>전송</dt><dd>전송 구간 암호화</dd></div></dl></aside></main>
}

const landingSteps = [
  ['음성을 텍스트로 변환', '완료'],
  ['발언 검토 후보 분석', '완료'],
  ['사실 정보 확인', '진행 중'],
  ['관련 맥락 확인', '대기'],
  ['검토 후보와 근거 정리', '대기'],
] as const

function LandingEmailForm({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  return <form className={`landing-email ${compact ? 'landing-email-compact' : ''}`} onSubmit={event => { event.preventDefault(); navigate('/upload') }}>
    <input type="email" aria-label="이메일 주소" placeholder="이메일 주소" />
    <button type="submit">이메일 보내기</button>
  </form>
}

function LandingSteps() {
  const [active, setActive] = useState(2)
  useEffect(() => { const timer = window.setInterval(() => setActive(value => (value + 1) % landingSteps.length), 1500); return () => window.clearInterval(timer) }, [])
  return <div className="landing-steps">{landingSteps.map(([label, done], index) => <div className={`landing-step ${index === active ? 'is-active' : ''} ${index < active ? 'is-done' : ''}`} key={label}><span className="landing-step-dot" /><span>{label}</span><small>{index < active ? '완료' : index === active ? done : '대기'}</small></div>)}</div>
}

function LandingPage() {
  const navigate = useNavigate()
  return <main className="landing-page">
    <section className="landing-hero"><div className="landing-hero-main"><LandingKicker label="업로드 전 검수" /><h1>공개 전 영상에서, 다시 확인할 구간과 근거를 먼저 보여드립니다</h1><p className="landing-lead">발언, 사실 정보, 관련 맥락을 분석해 사람이 다시 확인할 지점을 타임라인으로 제시합니다.<br />판정하거나 고치지 않습니다. 최종 판단은 제작자가 합니다.</p><div className="landing-hero-bottom"><LandingEmailForm /></div><p className="landing-privacy">원본 영상은 분석 완료 후 24시간 내 삭제 · 모델 학습에 사용하지 않음</p><LandingSteps /></div></section>
    <section className="landing-section landing-belief"><h2>긴 영상과 분업된 제작 과정에는 다시 확인할 지점이 남습니다</h2><p>Creator와 Editor는 이미 영상을 반복해서 검수합니다. 그러나 긴 영상에는 발언, 사실 정보, 외부 맥락 등 여러 요소가 함께 존재해 모든 부분을 동시에 확인하기 어렵습니다. oops는 사람이 다시 볼 가치가 있는 지점을 먼저 좁혀줍니다.</p></section>
    <section className="landing-section landing-three"><h2 className="landing-brand-heading"><img src={landingLogoUrl} alt="" aria-hidden="true" />는 세 가지를 봅니다</h2><div className="landing-three-grid"><LandingInfo title="발언">영상 속 발언에서 다시 확인할 가치가 있는 표현과 주장을 찾습니다. 특정 대상에 대한 단정적인 표현이나 일반화, 확인이 필요한 발언 등을 검토 후보로 보여드립니다.</LandingInfo><LandingInfo title="사실 확인">화면 자막과 발언에서 인물명, 기업명, 날짜, 숫자, 통계처럼 확인 가능한 정보를 찾고, 필요한 경우 관련 근거를 함께 제공합니다.</LandingInfo><LandingInfo title="맥락 참고">제작 과정에서 놓쳤을 수 있는 사회적·문화적·역사적 배경이나 특정 표현과 관련된 맥락을 찾아 참고 자료와 함께 보여드립니다.</LandingInfo></div></section>
    <section className="landing-section landing-compare"><div className="landing-compare-copy"><span className="landing-orange-label">핵심은 이것입니다</span><h2>근거를 함께 보여드립니다.</h2><p>해당 구간이 왜 검토 후보로 선정되었는지, 실제 발언이나 화면 문구는 무엇인지, 필요한 경우 관련 외부 자료까지 함께 보여줍니다. 사용자는 AI의 판단을 그대로 따르는 대신, 제공된 근거를 직접 확인하고 수정할지 유지할지 스스로 결정할 수 있습니다.</p></div><div className="landing-compare-card"><div className="compare-left"><span>02:14 실제 발언</span><strong>“00회사는 2019년도에 설립되었습니다.”</strong></div><div className="compare-right"><span>02:14 사실확인</span><strong>“00회사 공식 자료”</strong><button type="button">원문 확인 <b aria-hidden="true">→</b></button><p>검출마다 이렇게 근거 자료로 바로 이동할 수 있습니다</p></div></div></section>
    <section className="landing-section landing-limitations"><div><h2 className="landing-brand-heading"><img src={landingLogoUrl} alt="" aria-hidden="true" />가 하지 않는 것</h2><p>판정할 수 없는 것은 판정하지 않습니다.<br />확실하지 않은 검출을 늘리는 대신 줄이는 쪽을 택했습니다.</p></div><div className="landing-limit-list"><LandingInfo title="손·포즈·제스처 분석">랜드마크 유사도만으로는 의미를 판정할 수 없습니다.</LandingInfo><LandingInfo title="댓글 기반 외부 맥락">다른 영상의 댓글은 이 영상의 예측이 아닙니다.</LandingInfo><LandingInfo title="법률 판정">위법 여부와 정치 성향을 판단하지 않습니다.</LandingInfo><LandingInfo title="자동 편집·수정">영상을 대신 고치지 않습니다.</LandingInfo></div></section>
    <section className="landing-section landing-evidence"><h2>모든 검토 후보에 근거를 함께 제공합니다</h2><div className="landing-evidence-grid"><LandingInfo title="직접 근거">실제 발언이나 화면 정보를 직접 확인할 수 있습니다.</LandingInfo><LandingInfo title="외부 자료">공식 자료나 관련 Source를 함께 확인할 수 있습니다.</LandingInfo><LandingInfo title="관련 맥락">판단에 참고할 사회·문화·역사적 배경을 제공합니다.</LandingInfo></div></section>
    <section className="landing-section landing-cta"><div><h2>한 편으로 확인해 보세요</h2><p>10분 영상 기준 5분 이내에 리포트가 나옵니다.</p></div><LandingEmailForm compact /></section>
    <footer className="landing-footer"><div><strong>제품</strong><a onClick={() => navigate('/upload')}>업로드</a><a onClick={() => navigate('/report')}>검수 리포트</a><a onClick={() => navigate('/history')}>검수 이력</a></div><div><strong>정책</strong><a>데이터 보관</a><a>AI 출력 원칙</a><a>참조 데이터베이스 기준</a></div><div className="landing-footer-brand"><img className="landing-footer-logo" src={logoUrl} alt="OoPs!?" /><p>AI는 의도와 정치 성향, 위법 여부를 판정하지 않습니다.</p><small>© 2026 OoPs?!</small></div></footer>
  </main>
}

function LandingInfo({ title, children }: { title: string; children: React.ReactNode }) { return <article className="landing-info"><h3>{title}</h3><p>{children}</p></article> }

function AnalysisPage() {
  const { videoId } = useParams(); const id = Number(videoId); const navigate = useNavigate(); const { status, isFallback } = useAnalysisProgress(id); const { retry, isRetrying } = useAnalysisRetry()
  useEffect(() => {
    if (status?.status !== 'COMPLETED') return
    const timer = window.setTimeout(() => navigate(`/videos/${id}/report`, { replace: true }), 650)
    return () => window.clearTimeout(timer)
  }, [id, navigate, status?.status])
  if (!Number.isFinite(id)) return <Navigate to="/" replace />
  if (!status) return <main className="center-page"><Loading label="검수 작업을 불러오는 중" /></main>
  const failed = status.status === 'FAILED'
  async function handleRetry() { const result = await retry(id); if (result) window.location.reload() }
  const stages = [
    ['STT', '음성을 텍스트로 변환'],
    ['TEXT_RISK', '발언 검토 후보 분석'],
    ['SCENE_DETECTION', '사실 정보 확인'],
    ['OCR', '관련 맥락 확인'],
    ['MULTIMODAL', '검토 후보와 근거 정리'],
  ] as const
  const stageStep: Record<string, number> = { UPLOAD: 1, STT: 1, TEXT_RISK: 2, SCENE_DETECTION: 3, OCR: 4, MULTIMODAL: 5, FINALIZING: 5, COMPLETED: 5 }
  const completed = status.status === 'COMPLETED'
  const fallbackStep = Math.min(5, Math.max(1, Math.ceil(status.progress / 20)))
  const currentStep = completed ? 5 : stageStep[status.stage] ?? fallbackStep
  const title = failed ? '검수 중 문제가 발생했습니다.' : completed ? '분석이 완료되었습니다.' : '분석 중입니다'
  const subtitle = failed ? status.message : completed ? '검수 리포트를 준비했습니다. 잠시 후 결과 화면으로 이동합니다.' : '발언과 화면 정보를 분석해 다시 확인할 검토 후보를 정리합니다.'
  return <main className={`analysis-page ${completed ? 'is-completing' : ''}`}><section className="analysis-main"><div className="analysis-file">업로드한 영상 · {status.message}</div><section className="analysis-hero"><div className="analysis-copy"><h1>{title}</h1></div></section><p className="analysis-subtitle">{subtitle}</p><div className="analysis-progress-wrap"><div className="progress-track analysis-progress"><span style={{ width: `${completed ? 100 : status.progress}%` }} /></div><div className="analysis-progress-meta"><span>5단계 중 {currentStep}번째</span><strong>{completed ? 100 : status.progress}%</strong></div></div><section className="analysis-steps">{stages.map(([stage, label], index) => { const done = completed || index < currentStep - 1; const active = !completed && !failed && index === currentStep - 1; return <div className={`analysis-step ${done ? 'done' : ''} ${active ? 'active' : ''} ${failed && index === currentStep - 1 ? 'failed' : ''}`} key={stage}><span className="step-dot" aria-hidden="true" /><strong>{label}</strong><span>{done ? '완료' : failed && index === currentStep - 1 ? '확인 필요' : active ? '진행 중' : '대기'}</span></div> })}</section><div className="analysis-note"><span>이 화면을 닫아도 분석은 계속됩니다. 완료되면 검수 리포트에서 확인할 수 있습니다.</span><span className="analysis-cancel">분석 취소</span></div>{isFallback && !failed && !completed && <p className="connection-note">실시간 연결이 잠시 끊겨 상태 조회로 확인하고 있습니다.</p>}{failed && <div className="retry-box"><ErrorNotice message={status.message || '분석에 실패했습니다.'} code={status.errorCode} /><button className="button button-dark" onClick={() => void handleRetry()} disabled={isRetrying}>{isRetrying ? '다시 준비하는 중…' : '다시 분석하기 →'}</button></div>}</section></main>
}

function formatTime(ms: number) { const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` }

type ReviewDecision = 'pending' | 'edited' | 'confirmed' | 'hold'
type ReportFilter = 'ALL' | 'CAPTION' | 'SPEECH'
type ReportSort = 'ASC' | 'DESC'

function reportEventTitle(event: TimelineEvent) { return event.type === 'SPEECH' ? event.text : event.captionText }
function reportEventKind(event: TimelineEvent) { return event.type === 'SPEECH' ? '발언' : '자막' }
const candidateLabels: Record<CandidateType, string> = { SPEECH_REVIEW: '발언 검토', SCREEN_TEXT_REVIEW: '화면 자막 검토', FACT_ENTITY: '사실·대상 확인', CONTEXT_REFERENCE: '맥락 참고', VISUAL_REFERENCE: '화면 참고', CAPTION_CONSISTENCY: '자막 일관성' }
function reportEventEvidence(event: TimelineEvent) { return event.candidateType ? candidateLabels[event.candidateType] : event.type === 'SPEECH' ? (event.riskTypes[0] ?? '직접 근거') : '직접 근거' }
function formatSeconds(seconds: number) { return formatTime(Math.max(0, seconds) * 1000) }

function ReportPage() {
  const { videoId } = useParams(); const id = Number(videoId); const navigate = useNavigate(); const { report: reportResponse, error } = useAnalysisReport(id)
  const videoRef = useRef<HTMLVideoElement>(null); const selectedCardRef = useRef<HTMLElement>(null); const [selectedId, setSelectedId] = useState<number | null>(null); const [decisions, setDecisions] = useState<Record<number, ReviewDecision>>({}); const [isPlaying, setIsPlaying] = useState(false); const [duration, setDuration] = useState(0); const [currentTime, setCurrentTime] = useState(0); const [filter, setFilter] = useState<ReportFilter>('ALL'); const [sort, setSort] = useState<ReportSort>('ASC'); const [sortOpen, setSortOpen] = useState(false)
  useEffect(() => { if (reportResponse && selectedId === null && reportResponse.events[0]) setSelectedId(reportResponse.events[0].id) }, [reportResponse, selectedId])
  if (!Number.isFinite(id)) return <Navigate to="/" replace />
  if (!reportResponse && !error) return <main className="center-page"><Loading label="검수 결과를 정리하는 중" /></main>
  if (error) return <main className="center-page"><ErrorNotice message={error.message} code={error.code} /><Link className="button button-dark" to={`/videos/${id}/analysis`}>분석 상태로 돌아가기</Link></main>
  if (!reportResponse) return null
  const report = reportResponse
  const reportEvents = report.events
  const filteredEvents = reportEvents.filter(event => filter === 'ALL' || event.type === filter)
  const orderedEvents = [...filteredEvents].sort((left, right) => sort === 'ASC' ? left.startMs - right.startMs : right.startMs - left.startMs)
  const selected = orderedEvents.find(event => event.id === selectedId) ?? orderedEvents[0]
  if (!selected) return <EmptyReportPage />
  const selectedIndex = Math.max(0, report.events.findIndex(event => event.id === selected.id))
  const remaining = report.events.filter(event => !decisions[event.id] || decisions[event.id] === 'pending').length
  const subtitle = `${report.events.length}건의 검토 후보가 있습니다. 하나씩 읽고 직접 결정하세요.`
  const nearbyEvents = report.events.slice(Math.max(0, selectedIndex - 1), Math.min(report.events.length, selectedIndex + 2))
  function chooseFilter(nextFilter: ReportFilter) { setFilter(nextFilter); setSelectedId(null) }
  function chooseSort(nextSort: ReportSort) { setSort(nextSort); setSortOpen(false); setSelectedId(null) }
  function setDecision(decision: ReviewDecision) { setDecisions(current => ({ ...current, [selected.id]: decision })); const currentIndex = orderedEvents.findIndex(event => event.id === selected.id); const nextEvent = orderedEvents[currentIndex + 1]; if (nextEvent) setSelectedId(nextEvent.id) }
  function selectEvent(event: TimelineEvent) { setSelectedId(event.id); const nextTime = event.startMs / 1000; setCurrentTime(nextTime); if (videoRef.current) { videoRef.current.currentTime = nextTime; void videoRef.current.play().catch(() => undefined) } window.requestAnimationFrame(() => selectedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }
  function togglePlay() { if (!videoRef.current) return; if (videoRef.current.paused) void videoRef.current.play(); else videoRef.current.pause() }
  function seek(value: number) { setCurrentTime(value); if (videoRef.current) videoRef.current.currentTime = value }
  function decisionLabel(event: TimelineEvent) { const decision = decisions[event.id]; return decision === 'edited' ? '수정함' : decision === 'confirmed' ? '확인함' : decision === 'hold' ? '보류' : '' }
  function finishReview() {
    const finalDecisions = Object.fromEntries(reportEvents.map(event => [event.id, decisions[event.id] && decisions[event.id] !== 'pending' ? decisions[event.id] : 'confirmed'])) as Record<number, ReviewDecision>
    navigate(`/videos/${id}/completed`, { state: { decisions: finalDecisions } })
  }
  const mediaDuration = Number.isFinite(duration) && duration > 0 ? duration : 0
  const scrubberMax = mediaDuration || Math.max(selected.endMs / 1000, 1)
  const scrubberValue = Math.min(currentTime, scrubberMax)
  const durationLabel = mediaDuration ? formatSeconds(mediaDuration) : '--:--'
  const selectedDecision = decisions[selected.id]
  const filterLabel = filter === 'CAPTION' ? '자막' : '발언'

  return <main className="report-page">
    <div className="report-content">
      <div className="report-heading"><p className="report-meta">검수 리포트 · {new Date().toLocaleDateString('ko-KR')}</p><h1>다시 확인할 구간 {remaining}건 남음</h1><p>{subtitle}</p>{report.warnings && report.warnings.length > 0 && <div className="report-warnings" role="status"><strong>일부 분석 안내</strong>{report.warnings.map(warning => <p key={`${warning.stage}-${warning.code}`}>{warning.message}</p>)}</div>}</div>
      <div className="report-toolbar"><div className="report-filter-count"><strong>남은 검토</strong><span>{remaining}</span></div><div className="report-filters" aria-label="검토 후보 유형"><button type="button" className={filter === 'ALL' ? 'is-selected' : ''} onClick={() => chooseFilter('ALL')}>전체 {report.events.length}</button><button type="button" className={filter === 'CAPTION' ? 'is-selected' : ''} onClick={() => chooseFilter('CAPTION')}>자막 {report.events.filter(event => event.type === 'CAPTION').length}</button><button type="button" className={filter === 'SPEECH' ? 'is-selected' : ''} onClick={() => chooseFilter('SPEECH')}>발언 {report.events.filter(event => event.type === 'SPEECH').length}</button></div><div className="report-sort-wrap"><button type="button" className="report-sort" aria-expanded={sortOpen} onClick={() => setSortOpen(value => !value)}>{sort === 'ASC' ? '시간순' : '최신순'} ▾</button>{sortOpen && <div className="report-sort-menu" role="menu"><button type="button" className={sort === 'ASC' ? 'is-selected' : ''} onClick={() => chooseSort('ASC')}>시간순</button><button type="button" className={sort === 'DESC' ? 'is-selected' : ''} onClick={() => chooseSort('DESC')}>최신순</button></div>}</div></div>
      {filter !== 'ALL' && <section className="report-filter-results" aria-label={`${filterLabel} 검토 후보`}><div className="report-filter-results-head"><strong>{filterLabel} 검토 후보</strong><span>{orderedEvents.length}건</span></div><div className="report-filter-results-list">{orderedEvents.map(event => <button type="button" className={`report-filter-result ${event.id === selected.id ? 'is-current' : ''}`} key={event.id} onClick={() => selectEvent(event)}><span className="report-time-pill">{formatTime(event.startMs)}</span><span>{reportEventKind(event)}</span><strong>{reportEventTitle(event)}</strong><small>{reportEventEvidence(event)}</small>{decisionLabel(event) && <em>{decisionLabel(event)}</em>}</button>)}</div></section>}
      <article ref={selectedCardRef} className="report-selected-card"><div className="report-card-top"><div className="report-card-meta"><span className="report-time-pill">{formatTime(selected.startMs)}</span><span>{reportEventKind(selected)}</span><span className="report-evidence">· {reportEventEvidence(selected)}</span></div><div className="report-card-position"><span className="report-scrubber-mini"><i style={{ width: `${mediaDuration ? Math.min(100, Math.max(4, selected.startMs / mediaDuration * 100)) : 0}%` }} /></span><span>{durationLabel} 중 {formatTime(selected.startMs)}</span><span>{selectedIndex + 1} / {report.events.length}</span></div></div><h2>{reportEventTitle(selected)}</h2><p className="report-reason">{selected.reason}</p>{selected.references && selected.references.length > 0 && <div className="report-references"><h3>참고 자료</h3>{selected.references.map(reference => <a href={reference.url} target="_blank" rel="noreferrer" key={`${reference.url}-${reference.title}`}><strong>{reference.title}</strong><span>{reference.provider ?? '외부 자료'}{reference.publishedAt ? ` · ${reference.publishedAt}` : ''}</span>{reference.snippet && <small>{reference.snippet}</small>}</a>)}</div>}<div className="report-player"><video ref={videoRef} preload="metadata" poster={selected.frameUrl ? assetUrl(selected.frameUrl) : undefined} src={assetUrl(`/api/v1/videos/${id}/stream`)} onLoadedMetadata={event => setDuration(event.currentTarget.duration)} onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onClick={togglePlay}><track kind="captions" /></video><button type="button" className="report-play" aria-label={isPlaying ? '일시정지' : '재생'} onClick={togglePlay}>{isPlaying ? 'Ⅱ' : '▶'}</button></div><div className="report-scrubber"><input type="range" min="0" max={scrubberMax} step="0.1" value={scrubberValue} onChange={event => seek(Number(event.target.value))} /><div><span>{formatSeconds(currentTime || selected.startMs / 1000)}</span><div><span>이 구간만 반복 재생</span><b>·</b><span>앞뒤 10초 더 보기</span></div><span>{durationLabel}</span></div></div><div className="report-context-label">앞뒤 발언</div><div className="report-context">{nearbyEvents.map(event => <div className={`report-context-row ${event.id === selected.id ? 'is-current' : ''}`} key={event.id}><span>{formatTime(event.startMs)}</span><p>{reportEventTitle(event)}</p>{event.id === selected.id && event.type === 'CAPTION' && <div className="report-caption"><span>화면 자막</span><strong>{event.captionText}</strong></div>}</div>)}</div><div className="report-interpretation"><h3>다른 해석</h3><p>{selected.reason}</p></div><div className="report-actions"><button type="button" className={selectedDecision === 'edited' ? 'is-active' : ''} onClick={() => setDecision('edited')}>수정함</button><button type="button" className={selectedDecision === 'confirmed' ? 'is-active' : ''} onClick={() => setDecision('confirmed')}>확인함</button><button type="button" className={selectedDecision === 'hold' ? 'is-active' : ''} onClick={() => setDecision('hold')}>보류</button><span /><button type="button" className="report-muted-action">이 검출 끄기</button></div><p className="report-next">결정하면 다음 검토 후보로 이동합니다 →</p></article>
      <section className="report-candidates"><div className="report-candidates-card">{orderedEvents.map(event => <button type="button" className={`report-candidate-row ${event.id === selected.id ? 'is-current' : ''}`} key={event.id} onClick={() => selectEvent(event)}><span className="report-time-pill">{formatTime(event.startMs)}</span><span>{reportEventKind(event)}</span><strong>{reportEventTitle(event)}</strong><small>{reportEventEvidence(event)}</small>{decisionLabel(event) && <em>{decisionLabel(event)}</em>}</button>)}</div></section><p className="report-footnote">최종 판단은 제작자가 합니다. 원본 영상은 분석 완료 후 24시간 안에 삭제됩니다.</p>
    </div>
    <aside className="report-sidebar"><div className="report-file-context"><span>검수 중인 영상</span><strong>업로드한 영상 #{id}</strong><small>검수 완료 · 원본 영상</small></div><div className="report-decision-progress"><div><span>결정 진행</span><strong>{report.events.length - remaining} / {report.events.length}</strong></div><div className="report-sidebar-track"><i style={{ width: `${report.events.length ? ((report.events.length - remaining) / report.events.length) * 100 : 0}%` }} /></div></div><button type="button" className="report-finish-button" onClick={finishReview}>검수 마치기</button><div className="report-outline"><span>검토 후보</span><strong>{report.events.length}건 · 남은 {remaining}</strong>{report.events.map(event => <button type="button" className={event.id === selected.id ? 'is-current' : ''} key={event.id} onClick={() => selectEvent(event)}><i>{decisions[event.id] && decisions[event.id] !== 'pending' ? '✓' : ''}</i><b>{formatTime(event.startMs)}</b><span>{reportEventKind(event)}</span></button>)}<small>클릭하면 해당 후보로 이동</small></div></aside>
  </main>
}

function CompletionPage() {
  const { videoId } = useParams()
  const id = Number(videoId)
  const location = useLocation()
  const { report, error } = useAnalysisReport(id)
  const [filename, setFilename] = useState('업로드한 영상')
  useEffect(() => {
    let active = true
    void apiClient.videos().then(items => {
      const item = items.find(value => value.videoId === id)
      if (active && item) setFilename(item.filename)
    }).catch(() => undefined)
    return () => { active = false }
  }, [id])
  if (!Number.isFinite(id)) return <Navigate to="/" replace />
  if (!report && !error) return <main className="center-page"><Loading label="검수 완료 화면을 준비하는 중" /></main>
  if (error) return <main className="center-page"><ErrorNotice message={error.message} code={error.code} /><Link className="button button-dark" to={`/videos/${id}/report`}>리포트로 돌아가기</Link></main>
  if (!report) return null
  const state = location.state as { decisions?: Record<string, ReviewDecision> } | null
  const decisions = state?.decisions ?? {}
  const edited = report.events.filter(event => decisions[String(event.id)] === 'edited')
  const held = report.events.filter(event => decisions[String(event.id)] === 'hold')
  const confirmed = report.events.filter(event => decisions[String(event.id)] !== 'edited' && decisions[String(event.id)] !== 'hold')
  const actionEvents = edited.length > 0 ? edited : report.events
  async function copyTimecodes() {
    const text = actionEvents.map(event => formatTime(event.startMs)).join('\n')
    try { await navigator.clipboard?.writeText(text) } catch { /* clipboard may be unavailable in preview */ }
  }
  return <main className="completion-page"><div className="completion-heading"><span className="completion-mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="m4 12.5 5 5L20 6.5" /></svg></span><h1>검수를 마쳤습니다</h1></div><p className="completion-subtitle">{filename} · 검토 후보 {report.events.length}건을 모두 확인했습니다.</p><section className="completion-summary" aria-label="검수 요약"><div><span>수정함</span><strong>{edited.length}건</strong></div><div><span>확인함</span><strong>{confirmed.length}건</strong></div><div><span>보류</span><strong>{held.length}건</strong></div></section><section className="completion-actions-section"><div className="completion-section-head"><h2>수정하기로 한 구간</h2><button type="button" onClick={() => void copyTimecodes()}>타임코드 목록 복사</button></div><div className="completion-list">{actionEvents.map(event => { const decision = decisions[String(event.id)] === 'edited' ? '수정함' : decisions[String(event.id)] === 'hold' ? '보류' : '확인함'; return <div className="completion-row" key={event.id}><span className="completion-time">{formatTime(event.startMs)}</span><span className="completion-kind">{reportEventKind(event)}</span><p>{reportEventTitle(event)}</p><strong>{decision}</strong></div> })}</div></section><div className="completion-bottom"><div><Link className="completion-primary" to="/upload">새 영상 올리기</Link><Link className="completion-secondary" to={`/videos/${id}/report`}>리포트 다시 보기</Link></div><p>보류 {held.length}건은 리포트에 남아 있습니다.</p></div></main>
}

function EmptyReportPage() {
  return <main className="landing-empty-page report-empty-page"><LandingKicker label="검수 리포트" /><h1>아직 검수 리포트가 없습니다.</h1><p>첫 영상을 업로드하면 분석이 끝난 뒤 검수 후보와 근거가 이곳에 쌓입니다.</p><Link className="landing-empty-action" to="/upload"><span>영상 업로드하기</span><strong>→</strong></Link></main>
}

function HistoryPage() {
  const [items, setItems] = useState<VideoHistoryItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { let active = true; void apiClient.videos().then(value => { if (active) setItems(value) }).catch(() => { if (!active) return; if (hasConfiguredApi()) setError('검수 이력을 불러오지 못했습니다.'); else setItems([]) }); return () => { active = false } }, [])
  if (error) return <EmptyUploadPage eyebrow="검수 이력" title="아직 검수 이력이 없습니다." description="첫 영상을 업로드하면 진행 중인 작업과 완료된 리포트가 이곳에 쌓입니다." notice="검수 이력 서버가 연결되지 않았습니다." />
  if (items === null) return <main className="center-page"><Loading label="검수 이력을 불러오는 중" /></main>
  const completedCount = items.filter(item => item.status === 'COMPLETED').length
  const failedCount = items.filter(item => item.status === 'FAILED').length
  return <main className="history-page"><h1>검수 이력</h1><p className="history-intro">직접 업로드하고 검수를 시작한 영상만 이곳에 표시됩니다.</p><div className="history-filters"><button className="is-selected">전체 {items.length}</button><button>완료 {completedCount}</button><button>실패 {failedCount}</button></div><div className="history-card">{items.length > 0 ? items.map(item => <HistoryRow item={item} key={item.videoId} />) : <div className="history-empty"><p>아직 업로드한 영상이 없습니다.</p><Link to="/upload">영상 업로드하기 →</Link></div>}</div></main>
}

function EmptyUploadPage({ eyebrow, title, description, notice }: { eyebrow: string; title: string; description: string; notice?: string }) {
  return <main className="landing-empty-page"><LandingKicker label={eyebrow} /><h1>{title}</h1><p>{description}</p>{notice && <ErrorNotice message={notice} />}<Link className="landing-empty-action" to="/upload"><span>영상 업로드하기</span><strong>→</strong></Link></main>
}

function LandingKicker({ label }: { label: string }) {
  return <div className="landing-kicker"><strong>{label}</strong><span className="landing-kicker-line" /><i /><i /><i className="active" /></div>
}

function HistoryRow({ item }: { item: VideoHistoryItem }) {
  const navigate = useNavigate()
  const completed = item.status === 'COMPLETED'
  const target = completed ? `/videos/${item.videoId}/report` : `/videos/${item.videoId}/analysis`
  const statusLabel = completed ? '완료' : item.status === 'FAILED' ? '다시 시도' : `${item.progress}%`
  return <button className={`history-row history-row-${item.status.toLowerCase()}`} onClick={() => navigate(target)}><span className="history-file"><strong>{item.filename}</strong><small>{new Date(item.uploadedAt).toLocaleDateString('ko-KR')}</small></span><span className="history-event-count">{completed ? `${item.eventCount}건` : '—'}</span><span className="history-edited">{completed ? '0건 수정' : '—'}</span><span className={`history-status history-status-${item.status.toLowerCase()}`}>{statusLabel}</span></button>
}

function SettingsPage() {
  return <main className="settings-page"><h1>설정</h1><p className="settings-intro">편집 완료본을 맡기는 서비스이므로 데이터 항목을 먼저 확인해 주세요.</p><section className="settings-group settings-data-group"><h2>데이터</h2><div className="settings-row-list"><SettingsRow title="원본 영상 보관" description="분석 완료 후 24시간 내 자동 삭제 · 변경할 수 없습니다" /><SettingsRow title="리포트 보관 기간" description="90일 후 자동 삭제" action="변경" /><SettingsRow title="모델 학습 사용" description="사용하지 않습니다 · 변경할 수 없습니다" /><SettingsRow title="모든 리포트 삭제" description="되돌릴 수 없습니다" action="전체 삭제" tone="danger" /></div></section><section className="settings-group settings-billing-group"><h2>플랜 · 결제</h2><div className="settings-plan-card"><div><div className="settings-plan-title"><strong>무료 체험</strong><span>이번 달 0 / 3편</span></div><p>10분 이하 영상 월 3편까지. 채널을 연결하면 편당 분석 시간이 짧아집니다.</p></div><button type="button" className="settings-action settings-action-primary">플랜 변경</button></div><div className="settings-row-list settings-payment-list"><SettingsRow title="결제 수단" description="등록된 카드 없음" action="카드 등록" /><SettingsRow title="영수증" description="최근 결제 내역 없음" /></div></section><section className="settings-group settings-account-group"><h2>계정</h2><div className="settings-row-list"><SettingsRow title="이메일" description="로그인 계정이 연결되면 표시됩니다" /><SettingsRow title="연결된 채널" description="연결된 채널이 없습니다" action="연결하기" /><SettingsRow title="로그아웃" action="로그아웃" compact /></div></section></main>
}

function SettingsRow({ title, description, action, tone = 'default', compact = false }: { title: string; description?: string; action?: string; tone?: 'default' | 'danger'; compact?: boolean }) {
  return <div className={`settings-row ${compact ? 'settings-row-compact' : ''}`}><div><h3>{title}</h3>{description && <p>{description}</p>}</div>{action && <button type="button" className={`settings-action settings-action-${tone}`}>{action}</button>}</div>
}

export default function App() { return <AppShell><Routes><Route path="/" element={<LandingPage />} /><Route path="/upload" element={<UploadPage />} /><Route path="/report" element={<EmptyReportPage />} /><Route path="/history" element={<HistoryPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/videos/:videoId/analysis" element={<AnalysisPage />} /><Route path="/videos/:videoId/report" element={<ReportPage />} /><Route path="/videos/:videoId/completed" element={<CompletionPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></AppShell> }
