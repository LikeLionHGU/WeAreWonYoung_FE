import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppShell, ErrorNotice, Loading } from './components/AppShell'
import { assetUrl } from './api/client'
import type { TimelineEvent } from './api/types'
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
  return <main className="upload-page"><section className="upload-main"><h1>영상 업로드</h1><p className="upload-subtitle">편집이 끝난 완성본 한 편을 올려 주세요. mp4 또는 mov, 최대 10분 · 2GB.</p><label className={`dropzone ${fileName ? 'has-file' : ''} ${isDragging ? 'is-dragging' : ''}`} htmlFor="video-file" onDragEnter={event => { event.preventDefault(); setIsDragging(true) }} onDragOver={event => { event.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={event => { event.preventDefault(); acceptFiles(event.dataTransfer.files) }}><div className="upload-icon" aria-hidden="true"><svg viewBox="0 0 14 14" focusable="false"><path d="M6.5 10.58V1.93L4.17 4.26l-.71-.72L7 0l3.54 3.54-.71.72L7.5 1.93v8.65h-1ZM0 14V9.96h1V13h12V9.96h1V14H0Z" /></svg></div><strong>{fileName || '파일을 이 영역으로 끌어다 놓으세요'}</strong><span>{fileName ? '다른 파일을 선택하려면 클릭' : '또는 눌러서 파일 선택 · 업로드 중단하고 다시 이어 올 수 있습니다'}</span><input ref={inputRef} id="video-file" type="file" accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo" onChange={event => acceptFiles(event.target.files)} /></label><div className="upload-fields"><label><span>영상 제목 (선택)</span><input value={title} onChange={event => setTitle(event.target.value)} placeholder="영상 제목을 입력하세요" /></label><label><span>채널 URL (선택)</span><input value={channel} onChange={event => setChannel(event.target.value)} placeholder="youtube.com/@channel" /></label></div>{error && <ErrorNotice message={error.message} code={error.code} />}<div className="upload-submit"><p>업로드가 끝나면 분석이 곧바로 시작됩니다. 10분 영상 기준 5분 이내.</p><button className="button button-primary" disabled={!fileName || isUploading} onClick={() => void submit()}>{isUploading ? <><span className="spinner spinner-light" />업로드 중…</> : '분석 시작'}</button></div></section><aside className="policy-panel"><h2>데이터 보관 정책</h2><p>편집 완료본은 채널의 가장 민감한 자산입니다.</p><dl><div><dt>원본 영상</dt><dd>분석 완료 후 24시간 내 자동 삭제</dd></div><div><dt>모델 학습</dt><dd>사용하지 않습니다</dd></div><div><dt>리포트</dt><dd>텍스트 결과와 대표 프레임만 보관, 언제든 삭제 가능</dd></div><div><dt>전송</dt><dd>전 구간 암호화</dd></div></dl></aside></main>
}

const landingSteps = [
  ['음성을 텍스트로 변환', '완료'],
  ['발언 리스크 후보 탐지', '완료'],
  ['화면 변화 감지 및 대표 프레임 추출', '진행 중'],
  ['화면 자막 OCR', '대기'],
  ['발언과 자막 대조', '대기'],
] as const

function LandingEmailForm({ compact = false }: { compact?: boolean }) {
  return <Link className={`landing-email ${compact ? 'landing-email-compact' : ''}`} to="/upload"><span>영상 업로드하러가기</span><strong aria-hidden="true">→</strong></Link>
}

function LandingSteps() {
  const [active, setActive] = useState(2)
  useEffect(() => { const timer = window.setInterval(() => setActive(value => (value + 1) % landingSteps.length), 1500); return () => window.clearInterval(timer) }, [])
  return <div className="landing-steps">{landingSteps.map(([label, done], index) => <div className={`landing-step ${index === active ? 'is-active' : ''} ${index < active ? 'is-done' : ''}`} key={label}><span className="landing-step-dot" /><span>{label}</span><small>{index < active ? '완료' : index === active ? done : '대기'}</small></div>)}</div>
}

function LandingPage() {
  const navigate = useNavigate()
  return <main className="landing-page">
    <section className="landing-hero"><div className="landing-hero-main"><LandingKicker label="업로드 전 검수" /><h1>편집이 끝난 영상 한 편에서,<br />업로드 전에 다시 확인할 구간만 찾습니다.</h1><p className="landing-lead">발언과 화면 자막, 화면 속 삽입 이미지를 분석해 검토가 필요한 지점을 타임라인으로 제시합니다.<br />판정하지 않고, 고치지도 않습니다. 최종 판단은 제작자가 합니다.</p><div className="landing-hero-bottom"><LandingEmailForm /></div><p className="landing-privacy">원본 영상은 분석 완료 후 24시간 내 삭제 · 모델 학습에 사용하지 않음</p><LandingSteps /></div></section>
    <section className="landing-section landing-belief"><h2>혼자 만든 영상은 혼자 볼 수 없습니다</h2><p>말한 사람, 자른 사람, 자막을 단 사람이 같은 사람입니다. 제작자의 눈에는 의도가 계속 보이지만 시청자는 결과물만 봅니다.<br />주의력의 문제가 아니라 구조적인 사각지대입니다.</p></section>
    <section className="landing-section landing-three"><h2 className="landing-brand-heading"><img src={landingLogoUrl} alt="" aria-hidden="true" />는 세 가지를 봅니다</h2><div className="landing-three-grid"><LandingInfo title="발언">타임스탬프가 붙은 대본을 만들고, 앞뒤 맥락과 함께 검토 후보를 찾습니다. 문장 단위로 잘라 판단하지 않습니다.</LandingInfo><LandingInfo title="화면 자막">화면 변화가 감지된 시점에서 제작자가 넣은 자막을 추출합니다. 같은 자막이 이어지면 하나로 묶습니다.</LandingInfo><LandingInfo title="화면 속 상징">등록된 참조 이미지와 형태가 유사한 프레임을 표시합니다. 의미는 서비스가 만들어내지 않습니다.</LandingInfo></div></section>
    <section className="landing-section landing-compare"><div className="landing-compare-copy"><span className="landing-orange-label">핵심은 이것입니다</span><h2>발언과 자막을 나란히 놓고 봅니다</h2><p>1인 편집 환경에서는 자막이 발언보다 세지는 일이 자주 일어납니다. 판정 근거가 화면에 전부 보이기 때문에, 검출이 틀렸더라도 제작자가 바로 판단할 수 있습니다.</p></div><div className="landing-compare-card"><div className="compare-left"><span>02:14 실제 발언</span><strong>“조금 아쉬웠습니다.”</strong></div><div className="compare-right"><span>02:14 화면 자막</span><strong>“역대 최악의 선택”</strong></div><p>실제 발언보다 화면 자막의 비판 강도가 높아, 출연자의 입장이 더 공격적으로 전달될 수 있습니다.</p></div></section>
    <section className="landing-section landing-limitations"><div><h2 className="landing-brand-heading"><img src={landingLogoUrl} alt="" aria-hidden="true" />가 하지 않는 것</h2><p>판정할 수 없는 것은 판정하지 않습니다.<br />확실하지 않은 검출을 늘리는 대신 줄이는 쪽을 택했습니다.</p></div><div className="landing-limit-list"><LandingInfo title="손·포즈·제스처 분석">랜드마크 유사도만으로는 의미를 판정할 수 없습니다.</LandingInfo><LandingInfo title="댓글 기반 외부 맥락">다른 영상의 댓글은 이 영상의 예측이 아닙니다.</LandingInfo><LandingInfo title="법률 판정">위법 여부와 정치 성향을 판단하지 않습니다.</LandingInfo><LandingInfo title="자동 편집·수정">영상을 대신 고치지 않습니다.</LandingInfo></div></section>
    <section className="landing-section landing-evidence"><h2>모든 검출에 근거 수준을 붙입니다</h2><div className="landing-evidence-grid"><LandingInfo title="직접 근거">화면과 음성에서 직접 확인할 수 있습니다.</LandingInfo><LandingInfo title="유사 사례">참조 자료와의 유사성에 기반합니다.</LandingInfo><LandingInfo title="맥락 추정">해석에 기반하며 확실성이 가장 낮습니다.</LandingInfo></div></section>
    <section className="landing-section landing-cta"><div><h2>한 편으로 확인해 보세요</h2><p>10분 영상 기준 5분 이내에 리포트가 나옵니다.</p></div><LandingEmailForm compact /></section>
    <footer className="landing-footer"><div><strong>제품</strong><a onClick={() => navigate('/upload')}>업로드</a><a onClick={() => navigate('/report')}>검수 리포트</a><a onClick={() => navigate('/history')}>검수 이력</a></div><div><strong>정책</strong><a>데이터 보관</a><a>AI 출력 원칙</a><a>참조 데이터베이스 기준</a></div><div className="landing-footer-brand"><img className="landing-footer-logo" src={logoUrl} alt="OoPs!?" /><p>AI는 의도와 정치 성향, 위법 여부를 판정하지 않습니다.</p><small>© 2026 OoPs?!</small></div></footer>
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
  const progressStage = status.status === 'COMPLETED' ? 3 : Math.min(3, Math.max(1, activeIndex + 1))
  return <main className="analysis-page"><section className="analysis-main"><div className="analysis-file">업로드한 영상 · {status.message}</div><section className="analysis-hero"><div className="analysis-copy"><h1>{failed ? '검수 중 문제가 발생했습니다.' : '분석 중입니다'}</h1></div></section><p className="analysis-subtitle">{failed ? status.message : '남은 시간 약 30초. 음성 분석과 화면 분석은 따로 진행됩니다.'}</p><div className="analysis-progress-wrap"><div className="progress-track analysis-progress"><span style={{ width: `${status.progress}%` }} /></div><div className="analysis-progress-meta"><span>{progressStage}단계 중 {progressStage}번째</span><strong>{status.progress}%</strong></div></div><section className="analysis-steps">{stages.map(([stage, label], index) => { const done = status.status === 'COMPLETED' || (activeIndex > -1 && index < activeIndex); const active = !done && stage === status.stage; return <div className={`analysis-step ${done ? 'done' : ''} ${active ? 'active' : ''}`} key={stage}><span className="step-dot" /><strong>{label}</strong><span>{done ? '완료' : active ? '진행 중' : '대기'}</span></div> })}</section><div className="analysis-note"><span>이 화면을 닫아도 분석은 계속됩니다. 완료되면 검수 리포트에서 확인할 수 있습니다.</span><span className="analysis-cancel">분석 취소</span></div>{isFallback && !failed && <p className="connection-note">실시간 연결이 잠시 끊겨 상태 조회로 확인하고 있습니다.</p>}{failed && <div className="retry-box"><ErrorNotice message={status.message || '분석에 실패했습니다.'} code={status.errorCode} /><button className="button button-dark" onClick={() => void handleRetry()} disabled={isRetrying}>{isRetrying ? '다시 준비하는 중…' : '다시 분석하기 →'}</button></div>}{status.status === 'COMPLETED' && <button className="button button-primary button-wide" onClick={() => navigate(`/videos/${id}/report`)}>검수 결과 보기 →</button>}</section></main>
}

function formatTime(ms: number) { const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` }

type ReviewDecision = 'pending' | 'edited' | 'confirmed' | 'hold'

function reportEventTitle(event: TimelineEvent) { return event.type === 'SPEECH' ? event.text : event.captionText }
function reportEventKind(event: TimelineEvent) { return event.type === 'SPEECH' ? '발언' : '자막' }
function reportEventEvidence(event: TimelineEvent) { return event.type === 'SPEECH' ? (event.riskTypes[0] ?? '직접 근거') : '직접 근거' }
function formatSeconds(seconds: number) { return formatTime(Math.max(0, seconds) * 1000) }

function ReportPage() {
  const { videoId } = useParams(); const id = Number(videoId); const navigate = useNavigate(); const { report, error } = useAnalysisReport(id)
  const videoRef = useRef<HTMLVideoElement>(null); const [selectedId, setSelectedId] = useState<number | null>(null); const [decisions, setDecisions] = useState<Record<number, ReviewDecision>>({}); const [isPlaying, setIsPlaying] = useState(false); const [duration, setDuration] = useState(0); const [currentTime, setCurrentTime] = useState(0)
  useEffect(() => { if (report && selectedId === null && report.events[0]) setSelectedId(report.events[0].id) }, [report, selectedId])
  if (!Number.isFinite(id)) return <Navigate to="/" replace />
  if (!report && !error) return <main className="center-page"><Loading label="검수 결과를 정리하는 중" /></main>
  if (error) return <main className="center-page"><ErrorNotice message={error.message} code={error.code} /><Link className="button button-dark" to={`/videos/${id}/analysis`}>분석 상태로 돌아가기</Link></main>
  if (!report) return null
  const reportEvents = report.events
  const selected = report.events.find(event => event.id === selectedId) ?? report.events[0]
  if (!selected) return <EmptyReportPage />
  const selectedIndex = Math.max(0, report.events.findIndex(event => event.id === selected.id))
  const remaining = report.events.filter(event => !decisions[event.id] || decisions[event.id] === 'pending').length
  const subtitle = `${report.events.length}건의 검토 후보가 있습니다. 하나씩 읽고 직접 결정하세요.`
  const nearbyEvents = report.events.slice(Math.max(0, selectedIndex - 1), Math.min(report.events.length, selectedIndex + 2))
  const pendingEvents = report.events.filter(event => event.id !== selected.id)
  const setDecision = (decision: ReviewDecision) => setDecisions(current => ({ ...current, [selected.id]: decision }))
  function selectEvent(event: TimelineEvent) { setSelectedId(event.id); if (videoRef.current) { videoRef.current.currentTime = event.startMs / 1000; void videoRef.current.play().catch(() => undefined) } }
  function togglePlay() { if (!videoRef.current) return; if (videoRef.current.paused) void videoRef.current.play(); else videoRef.current.pause() }
  function seek(value: number) { setCurrentTime(value); if (videoRef.current) videoRef.current.currentTime = value }
  function decisionLabel(event: TimelineEvent) { const decision = decisions[event.id]; return decision === 'edited' ? '수정함' : decision === 'confirmed' ? '확인함' : decision === 'hold' ? '보류' : '' }
  function finishReview() {
    const finalDecisions = Object.fromEntries(reportEvents.map(event => [event.id, decisions[event.id] && decisions[event.id] !== 'pending' ? decisions[event.id] : 'confirmed'])) as Record<number, ReviewDecision>
    navigate(`/videos/${id}/completed`, { state: { decisions: finalDecisions } })
  }
  return <main className="report-page"><div className="report-content"><div className="report-heading"><p className="report-meta">검수 리포트 · {new Date().toLocaleDateString('ko-KR')}</p><h1>다시 확인할 구간 {remaining}건 남음</h1><p>{subtitle}</p></div><div className="report-toolbar"><div className="report-filter-count"><strong>남은 검토</strong><span>{remaining}</span></div><div className="report-filters"><button className="is-selected">전체 {report.events.length}</button><button>자막 {report.events.filter(event => event.type === 'CAPTION').length}</button><button>발언 {report.events.filter(event => event.type === 'SPEECH').length}</button></div><span className="report-sort">시간순 ▾</span></div><article className="report-selected-card"><div className="report-card-top"><div className="report-card-meta"><span className="report-time-pill">{formatTime(selected.startMs)}</span><span>{reportEventKind(selected)}</span><span className="report-evidence">· {reportEventEvidence(selected)}</span></div><div className="report-card-position"><span className="report-scrubber-mini"><i style={{ width: `${Math.min(100, Math.max(4, selected.startMs / Math.max(1, selected.endMs) * 100))}%` }} /></span><span>09:41 중 {formatTime(selected.startMs)}</span><span>{selectedIndex + 1} / {report.events.length}</span></div></div><h2>{reportEventTitle(selected)}</h2><p className="report-reason">{selected.reason}</p><div className="report-player"><video ref={videoRef} preload="metadata" src={assetUrl(`/api/v1/videos/${id}/stream`)} onLoadedMetadata={event => setDuration(event.currentTarget.duration)} onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onClick={togglePlay}><track kind="captions" /></video><button type="button" className="report-play" aria-label={isPlaying ? '일시정지' : '재생'} onClick={togglePlay}>{isPlaying ? 'Ⅱ' : '▶'}</button></div><div className="report-scrubber"><input type="range" min="0" max={duration || Math.max(selected.endMs / 1000, 1)} step="0.1" value={Math.min(currentTime, duration || selected.endMs / 1000)} onChange={event => seek(Number(event.target.value))} /><div><span>{formatSeconds(currentTime || selected.startMs / 1000)}</span><div><span>이 구간만 반복 재생</span><b>·</b><span>앞뒤 10초 더 보기</span></div><span>{formatSeconds(duration || selected.endMs / 1000)}</span></div></div><div className="report-context-label">앞뒤 발언</div><div className="report-context">{nearbyEvents.map(event => <div className={`report-context-row ${event.id === selected.id ? 'is-current' : ''}`} key={event.id}><span>{formatTime(event.startMs)}</span><p>{reportEventTitle(event)}</p>{event.id === selected.id && <div className="report-caption"><span>화면 자막</span><strong>{event.type === 'CAPTION' ? event.captionText : '역대 최악의 선택'}</strong></div>}</div>)}</div><div className="report-interpretation"><h3>다른 해석</h3><p>{selected.reason}</p></div><div className="report-actions"><button type="button" className="is-active" onClick={() => setDecision('edited')}>수정함</button><button type="button" onClick={() => setDecision('confirmed')}>확인함</button><button type="button" onClick={() => setDecision('hold')}>보류</button><span /><button type="button" className="report-muted-action">이 검출 끄기</button></div><p className="report-next">결정하면 다음 검토 후보로 이동합니다 →</p></article><section className="report-candidates"><div className="report-candidates-card">{pendingEvents.map(event => <button type="button" className="report-candidate-row" key={event.id} onClick={() => selectEvent(event)}><span className="report-time-pill">{formatTime(event.startMs)}</span><span>{reportEventKind(event)}</span><strong>{reportEventTitle(event)}</strong><small>{reportEventEvidence(event)}</small>{decisionLabel(event) && <em>{decisionLabel(event)}</em>}</button>)}</div></section><p className="report-footnote">최종 판단은 제작자가 합니다. 원본 영상은 분석 완료 후 24시간 안에 삭제됩니다.</p></div><aside className="report-sidebar"><div className="report-file-context"><span>검수 중인 영상</span><strong>업로드한 영상 #{id}</strong><small>검수 완료 · 원본 영상</small></div><div className="report-decision-progress"><div><span>결정 진행</span><strong>{report.events.length - remaining} / {report.events.length}</strong></div><div className="report-sidebar-track"><i style={{ width: `${report.events.length ? ((report.events.length - remaining) / report.events.length) * 100 : 0}%` }} /></div></div><button type="button" className="report-finish-button" onClick={finishReview}>검수 마치기</button><div className="report-outline"><span>검토 후보</span><strong>{report.events.length}건 · 남은 {remaining}</strong>{report.events.map(event => <button type="button" className={event.id === selected.id ? 'is-current' : ''} key={event.id} onClick={() => selectEvent(event)}><i>{decisions[event.id] && decisions[event.id] !== 'pending' ? '✓' : ''}</i><b>{formatTime(event.startMs)}</b><span>{reportEventKind(event)}</span></button>)}<small>클릭하면 해당 후보로 이동</small></div></aside></main>
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
  return <main className="completion-page"><div className="completion-heading"><span className="completion-mark" aria-hidden="true">✓</span><h1>검수를 마쳤습니다</h1></div><p className="completion-subtitle">{filename} · 검토 후보 {report.events.length}건을 모두 확인했습니다.</p><section className="completion-summary" aria-label="검수 요약"><div><span>수정함</span><strong>{edited.length}건</strong></div><div><span>확인함</span><strong>{confirmed.length}건</strong></div><div><span>보류</span><strong>{held.length}건</strong></div></section><section className="completion-actions-section"><div className="completion-section-head"><h2>수정하기로 한 구간</h2><button type="button" onClick={() => void copyTimecodes()}>타임코드 목록 복사</button></div><div className="completion-list">{actionEvents.map(event => { const decision = decisions[String(event.id)] === 'edited' ? '수정함' : decisions[String(event.id)] === 'hold' ? '보류' : '확인함'; return <div className="completion-row" key={event.id}><span className="completion-time">{formatTime(event.startMs)}</span><span className="completion-kind">{reportEventKind(event)}</span><p>{reportEventTitle(event)}</p><strong>{decision}</strong></div> })}</div></section><div className="completion-bottom"><div><Link className="completion-primary" to="/upload">새 영상 올리기</Link><Link className="completion-secondary" to={`/videos/${id}/report`}>리포트 다시 보기</Link></div><p>보류 {held.length}건은 리포트에 남아 있습니다.</p></div></main>
}

function EmptyReportPage() {
  return <main className="landing-empty-page report-empty-page"><LandingKicker label="검수 리포트" /><h1>아직 검수 리포트가 없습니다.</h1><p>영상을 업로드하면 분석이 끝난 뒤 위험 구간과 근거를 이곳에서 확인할 수 있습니다.</p><div className="report-empty-counts" aria-label="검수 리포트 건수"><span className="is-selected">전체 <strong>0</strong></span><span>자막 <strong>0</strong></span><span>발언 <strong>0</strong></span></div><Link className="landing-empty-action" to="/upload"><span>영상 업로드하기</span><strong>→</strong></Link></main>
}

function HistoryPage() {
  const [items, setItems] = useState<VideoHistoryItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { let active = true; void apiClient.videos().then(value => { if (active) setItems(value) }).catch(() => { if (active) setError('검수 이력을 불러오지 못했습니다.') }); return () => { active = false } }, [])
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
  const target = item.status === 'COMPLETED' ? `/videos/${item.videoId}/report` : `/videos/${item.videoId}/analysis`
  const statusLabel = item.status === 'COMPLETED' ? '완료' : item.status === 'FAILED' ? '다시 시도' : `${item.progress}%`
  return <button className={`history-row history-row-${item.status.toLowerCase()}`} onClick={() => navigate(target)}><span className="history-file"><strong>{item.filename}</strong><small>{new Date(item.uploadedAt).toLocaleDateString('ko-KR')}</small></span><span className="history-event-count">{item.status === 'COMPLETED' ? `${item.eventCount}건` : '—'}</span><span className="history-edited">{item.status === 'COMPLETED' ? '0건 수정' : '—'}</span><span className={`history-status history-status-${item.status.toLowerCase()}`}>{statusLabel}</span></button>
}

function SettingsPage() {
  return <main className="settings-page"><h1>설정</h1><p className="settings-intro">편집 완료본을 맡기는 서비스이므로 데이터 항목을 먼저 확인해 주세요.</p><section className="settings-group settings-data-group"><h2>데이터</h2><div className="settings-row-list"><SettingsRow title="원본 영상 보관" description="분석 완료 후 24시간 내 자동 삭제 · 변경할 수 없습니다" /><SettingsRow title="리포트 보관 기간" description="90일 후 자동 삭제" action="변경" /><SettingsRow title="모델 학습 사용" description="사용하지 않습니다 · 변경할 수 없습니다" /><SettingsRow title="모든 리포트 삭제" description="되돌릴 수 없습니다" action="전체 삭제" tone="danger" /></div></section><section className="settings-group settings-billing-group"><h2>플랜 · 결제</h2><div className="settings-plan-card"><div><div className="settings-plan-title"><strong>무료 체험</strong><span>이번 달 0 / 3편</span></div><p>10분 이하 영상 월 3편까지. 채널을 연결하면 편당 분석 시간이 짧아집니다.</p></div><button type="button" className="settings-action settings-action-primary">플랜 변경</button></div><div className="settings-row-list settings-payment-list"><SettingsRow title="결제 수단" description="등록된 카드 없음" action="카드 등록" /><SettingsRow title="영수증" description="최근 결제 내역 없음" /></div></section><section className="settings-group settings-account-group"><h2>계정</h2><div className="settings-row-list"><SettingsRow title="이메일" description="로그인 계정이 연결되면 표시됩니다" /><SettingsRow title="연결된 채널" description="연결된 채널이 없습니다" action="연결하기" /><SettingsRow title="로그아웃" action="로그아웃" compact /></div></section></main>
}

function SettingsRow({ title, description, action, tone = 'default', compact = false }: { title: string; description?: string; action?: string; tone?: 'default' | 'danger'; compact?: boolean }) {
  return <div className={`settings-row ${compact ? 'settings-row-compact' : ''}`}><div><h3>{title}</h3>{description && <p>{description}</p>}</div>{action && <button type="button" className={`settings-action settings-action-${tone}`}>{action}</button>}</div>
}

export default function App() { return <AppShell><Routes><Route path="/" element={<LandingPage />} /><Route path="/upload" element={<UploadPage />} /><Route path="/report" element={<EmptyReportPage />} /><Route path="/history" element={<HistoryPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/videos/:videoId/analysis" element={<AnalysisPage />} /><Route path="/videos/:videoId/report" element={<ReportPage />} /><Route path="/videos/:videoId/completed" element={<CompletionPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></AppShell> }
