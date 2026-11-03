import { Link } from 'react-router-dom'
import type { AnalysisReportResponse, AnalysisWarning } from '../../api/types'
import { formatTime } from '../../utils/format'

interface EmptyReportResultProps {
  report: AnalysisReportResponse
  generatedLabel: string
  warnings: AnalysisWarning[]
}

const checks = [
  ['발언 검토', '단정적인 표현, 일반화, 다시 확인이 필요한 주장'],
  ['사실 확인', '인물명, 기업명, 날짜, 숫자, 통계처럼 확인 가능한 정보'],
] as const

export default function EmptyReportResult({
  report,
  generatedLabel,
  warnings,
}: EmptyReportResultProps) {
  const analyzed = report.coverage.speechAnalyzed
  return (
    <div className="report-content report-empty">
      <div className="report-heading">
        <p className="report-meta">검수 리포트 · {generatedLabel}</p>
        <h1>다시 확인할 구간을 찾지 못했습니다</h1>
        <p>아래 항목을 모두 살펴봤지만 검토 후보로 올릴 구간이 없었습니다.</p>
      </div>

      <section className="report-empty-checks" aria-label="분석한 항목">
        <div className="report-empty-checks-head">
          <strong>분석한 항목</strong>
          {report.durationMs > 0 && <span>영상 길이 {formatTime(report.durationMs)}</span>}
        </div>
        <ul>
          {checks.map(([title, description]) => (
            <li key={title} className={analyzed ? 'is-done' : 'is-skipped'}>
              <i aria-hidden="true">{analyzed ? '✓' : '–'}</i>
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
              <span>{analyzed ? '후보 0건' : '분석하지 못함'}</span>
            </li>
          ))}
        </ul>
      </section>

      {warnings.length > 0 && (
        <div className="report-warnings" role="status">
          <strong>분석 안내</strong>
          {warnings.map(warning => (
            <p key={`${warning.stage}-${warning.code}`}>{warning.message}</p>
          ))}
        </div>
      )}

      <p className="report-empty-note">
        후보가 없다는 것은 문제가 없다는 판정이 아닙니다. 공개 전 최종 판단은 제작자가 합니다.
      </p>

      <div className="report-empty-actions">
        <Link className="button button-dark" to="/upload">
          다른 영상 검수하기
        </Link>
        <Link className="button button-outline" to="/history">
          검수 이력 보기
        </Link>
      </div>
    </div>
  )
}
