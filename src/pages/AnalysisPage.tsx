import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ErrorNotice, Loading } from '../components/AppShell'
import { apiClient } from '../api/client'
import { useAnalysisProgress } from '../hooks/useAnalysisProgress'
import { useAnalysisRetry } from '../hooks/useAnalysisRetry'

export default function AnalysisPage() {
  const { videoId } = useParams()
  const id = videoId ?? ''
  const navigate = useNavigate()
  const { status, isFallback, refresh } = useAnalysisProgress(id)
  const { retry, isRetrying, error: retryError } = useAnalysisRetry()
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  useEffect(() => {
    if (status?.status !== 'COMPLETED') return
    const timer = window.setTimeout(() => navigate(`/videos/${id}/report`, { replace: true }), 650)
    return () => window.clearTimeout(timer)
  }, [id, navigate, status?.status])
  if (!id) return <Navigate to="/" replace />
  if (!status)
    return (
      <main className="center-page">
        <Loading label="검수 작업을 불러오는 중" />
      </main>
    )
  const failed = status.status === 'FAILED'
  const cancelled = status.status === 'CANCELLED'
  async function handleRetry() {
    const result = await retry(id)
    if (result) {
      await refresh()
    }
  }
  async function handleCancel() {
    setIsCancelling(true)
    setCancelError(null)
    try {
      await apiClient.cancel(id)
      await refresh()
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : '분석을 취소하지 못했습니다.')
    } finally {
      setIsCancelling(false)
    }
  }
  const stages = [
    ['STT', '음성을 텍스트로 변환'],
    ['TEXT_RISK', '발언 검토 후보 분석'],
    ['SCENE_DETECTION', '사실 정보 확인'],
    ['OCR', '관련 맥락 확인'],
    ['MULTIMODAL', '검토 후보와 근거 정리'],
  ] as const
  const stageStep: Record<string, number> = {
    UPLOAD: 1,
    STT: 1,
    TEXT_RISK: 2,
    SCENE_DETECTION: 3,
    OCR: 4,
    MULTIMODAL: 5,
    FINALIZING: 5,
    COMPLETED: 5,
  }
  const completed = status.status === 'COMPLETED'
  const fallbackStep = Math.min(5, Math.max(1, Math.ceil(status.progress / 20)))
  const currentStep = completed ? 5 : (stageStep[status.stage] ?? fallbackStep)
  const title = failed
    ? '검수 중 문제가 발생했습니다.'
    : cancelled
      ? '분석이 취소되었습니다.'
      : completed
        ? '분석이 완료되었습니다.'
        : '분석 중입니다'
  const subtitle = failed
    ? (status.failure?.message ?? status.message)
    : cancelled
      ? '필요할 때 같은 영상으로 분석을 다시 시작할 수 있습니다.'
      : completed
        ? '검수 리포트를 준비했습니다. 잠시 후 결과 화면으로 이동합니다.'
        : '발언과 화면 정보를 분석해 다시 확인할 검토 후보를 정리합니다.'
  return (
    <main className={`analysis-page ${completed ? 'is-completing' : ''}`}>
      <section className="analysis-main">
        <div className="analysis-file">
          {status.filename} · {status.message}
        </div>
        <section className="analysis-hero">
          <div className="analysis-copy">
            <h1>{title}</h1>
          </div>
        </section>
        <p className="analysis-subtitle">{subtitle}</p>
        <div className="analysis-progress-wrap">
          <div className="progress-track analysis-progress">
            <span style={{ width: `${completed ? 100 : status.progress}%` }} />
          </div>
          <div className="analysis-progress-meta">
            <span>5단계 중 {currentStep}번째</span>
            <strong>{completed ? 100 : status.progress}%</strong>
          </div>
        </div>
        <section className="analysis-steps">
          {stages.map(([stage, label], index) => {
            const done = completed || index < currentStep - 1
            const active = !completed && !failed && !cancelled && index === currentStep - 1
            return (
              <div
                className={`analysis-step ${done ? 'done' : ''} ${active ? 'active' : ''} ${(failed || cancelled) && index === currentStep - 1 ? 'failed' : ''}`}
                key={stage}
              >
                <span className="step-dot" aria-hidden="true" />
                <strong>{label}</strong>
                <span>
                  {done
                    ? '완료'
                    : failed && index === currentStep - 1
                      ? '확인 필요'
                      : cancelled && index === currentStep - 1
                        ? '취소됨'
                        : active
                          ? '진행 중'
                          : '대기'}
                </span>
              </div>
            )
          })}
        </section>
        <div className="analysis-note">
          <span>
            이 화면을 닫아도 분석은 계속됩니다. 완료되면 검수 리포트에서 확인할 수 있습니다.
          </span>
          {!failed && !cancelled && !completed && (
            <button
              type="button"
              className="analysis-cancel"
              onClick={() => void handleCancel()}
              disabled={isCancelling}
            >
              {isCancelling ? '취소 중…' : '분석 취소'}
            </button>
          )}
        </div>
        {cancelError && <ErrorNotice message={cancelError} />}
        {isFallback && !failed && !cancelled && !completed && (
          <p className="connection-note">실시간 연결이 잠시 끊겨 상태 조회로 확인하고 있습니다.</p>
        )}
        {(failed || cancelled) && (
          <div className="retry-box">
            <ErrorNotice
              message={
                failed ? (status.failure?.message ?? status.message) : '분석이 취소되었습니다.'
              }
              code={status.failure?.code}
            />
            {retryError && <ErrorNotice message={retryError.message} code={retryError.code} />}
            <button
              className="button button-dark"
              onClick={() => void handleRetry()}
              disabled={isRetrying}
            >
              {isRetrying ? '다시 준비하는 중…' : '다시 분석하기 →'}
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
