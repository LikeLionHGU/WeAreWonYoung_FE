import { Link } from 'react-router-dom'
import { LandingKicker } from '../components/LandingKicker'

export default function EmptyReportPage() {
  return <main className="landing-empty-page report-empty-page"><LandingKicker label="검수 리포트" /><h1>아직 검수 리포트가 없습니다.</h1><p>첫 영상을 업로드하면 분석이 끝난 뒤 검수 후보와 근거가 이곳에 쌓입니다.</p><Link className="landing-empty-action" to="/upload"><span>영상 업로드하기</span><strong>→</strong></Link></main>
}
