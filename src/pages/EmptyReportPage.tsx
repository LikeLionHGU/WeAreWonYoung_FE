import { Link } from 'react-router-dom'

export default function EmptyReportPage() {
  return (
    <main className="empty-report-page">
      <div className="empty-report-content">
        <div className="empty-report-icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none" focusable="false">
            <rect
              x="8"
              y="12"
              width="48"
              height="40"
              rx="6"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <path
              d="M20 28h24M20 36h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="48" cy="16" r="8" fill="#2e7df7" opacity=".15" />
            <circle cx="48" cy="16" r="4" fill="#2e7df7" />
          </svg>
        </div>
        <h1>아직 검수 리포트가 없습니다</h1>
        <p>
          첫 영상을 업로드하면 분석이 끝난 뒤<br />
          검수 후보와 근거가 이곳에 쌓입니다.
        </p>
        <Link className="empty-report-cta" to="/upload">
          <span>영상 업로드하기</span>
          <svg viewBox="0 0 20 20" fill="none" focusable="false">
            <path
              d="M4 10h12M12 6l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <Link className="empty-report-secondary" to="/history">
          검수 이력 보기
        </Link>
      </div>
    </main>
  )
}
