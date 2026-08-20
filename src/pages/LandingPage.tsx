import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import logoUrl from '../assets/logo/oops-logo.svg'
import landingLogoUrl from '../assets/logo/oops-landing-logo.svg'
import { LandingKicker } from '../components/LandingKicker'
export { LandingKicker }

const landingSteps = [
  ['음성을 텍스트로 변환', '완료'],
  ['발언 검토 후보 분석', '완료'],
  ['사실 정보 확인', '진행 중'],
  ['관련 맥락 확인', '대기'],
  ['검토 후보와 근거 정리', '대기'],
] as const

function LandingUploadCta({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`landing-upload-cta ${compact ? 'landing-upload-cta-compact' : ''}`}>
      <Link className="landing-upload-button" to="/upload">
        <span>영상 업로드하러가기</span>
        <strong aria-hidden="true">→</strong>
      </Link>
    </div>
  )
}

function LandingSteps() {
  const [active, setActive] = useState(2)
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return
    const timer = window.setInterval(
      () => setActive(value => (value + 1) % landingSteps.length),
      1500,
    )
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div className="landing-steps">
      {landingSteps.map(([label, done], index) => (
        <div
          className={`landing-step ${index === active ? 'is-active' : ''} ${index < active ? 'is-done' : ''}`}
          key={label}
        >
          <span className="landing-step-dot" />
          <span>{label}</span>
          <small>{index < active ? '완료' : index === active ? done : '대기'}</small>
        </div>
      ))}
    </div>
  )
}

function LandingInfo({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="landing-info">
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  )
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-main">
          <LandingKicker label="업로드 전 검수" />
          <h1>공개 전 영상에서, 다시 확인할 구간과 근거를 먼저 보여드립니다</h1>
          <p className="landing-lead">
            발언, 사실 정보, 관련 맥락을 분석해 사람이 다시 확인할 지점을 타임라인으로 제시합니다.
            <br />
            판정하거나 고치지 않습니다. 최종 판단은 제작자가 합니다.
          </p>
          <div className="landing-hero-bottom">
            <LandingUploadCta />
          </div>
          <p className="landing-privacy">
            원본 영상은 분석 완료 후 24시간 내 삭제 · 모델 학습에 사용하지 않음
          </p>
          <LandingSteps />
        </div>
      </section>
      <section className="landing-section landing-belief">
        <h2>긴 영상과 분업된 제작 과정에는 다시 확인할 지점이 남습니다</h2>
        <p>
          Creator와 Editor는 이미 영상을 반복해서 검수합니다. 그러나 긴 영상에는 발언, 사실 정보,
          외부 맥락 등 여러 요소가 함께 존재해 모든 부분을 동시에 확인하기 어렵습니다. oops는 사람이
          다시 볼 가치가 있는 지점을 먼저 좁혀줍니다.
        </p>
      </section>
      <section className="landing-section landing-three">
        <h2 className="landing-brand-heading">
          <img src={landingLogoUrl} alt="" aria-hidden="true" />는 세 가지를 봅니다
        </h2>
        <div className="landing-three-grid">
          <LandingInfo title="발언">
            영상 속 발언에서 다시 확인할 가치가 있는 표현과 주장을 찾습니다. 특정 대상에 대한
            단정적인 표현이나 일반화, 확인이 필요한 발언 등을 검토 후보로 보여드립니다.
          </LandingInfo>
          <LandingInfo title="사실 확인">
            화면 자막과 발언에서 인물명, 기업명, 날짜, 숫자, 통계처럼 확인 가능한 정보를 찾고,
            필요한 경우 관련 근거를 함께 제공합니다.
          </LandingInfo>
          <LandingInfo title="맥락 참고">
            제작 과정에서 놓쳤을 수 있는 사회적·문화적·역사적 배경이나 특정 표현과 관련된 맥락을
            찾아 참고 자료와 함께 보여드립니다.
          </LandingInfo>
        </div>
      </section>
      <section className="landing-section landing-compare">
        <div className="landing-compare-copy">
          <span className="landing-orange-label">핵심은 이것입니다</span>
          <h2>근거를 함께 보여드립니다.</h2>
          <p>
            해당 구간이 왜 검토 후보로 선정되었는지, 실제 발언이나 화면 문구는 무엇인지, 필요한 경우
            관련 외부 자료까지 함께 보여줍니다. 사용자는 AI의 판단을 그대로 따르는 대신, 제공된
            근거를 직접 확인하고 수정할지 유지할지 스스로 결정할 수 있습니다.
          </p>
        </div>
        <div className="landing-compare-card">
          <div className="compare-left">
            <span>02:14 실제 발언</span>
            <strong>"00회사는 2019년도에 설립되었습니다."</strong>
          </div>
          <div className="compare-right">
            <span>02:14 사실확인</span>
            <strong>"00회사 공식 자료"</strong>
            <button type="button">
              원문 확인 <b aria-hidden="true">→</b>
            </button>
            <p>검출마다 이렇게 근거 자료로 바로 이동할 수 있습니다</p>
          </div>
        </div>
      </section>
      <section className="landing-section landing-limitations">
        <div>
          <h2 className="landing-brand-heading">
            <img src={landingLogoUrl} alt="" aria-hidden="true" />가 하지 않는 것
          </h2>
          <p>
            판정할 수 없는 것은 판정하지 않습니다.
            <br />
            확실하지 않은 검출을 늘리는 대신 줄이는 쪽을 택했습니다.
          </p>
        </div>
        <div className="landing-limit-list">
          <LandingInfo title="손·포즈·제스처 분석">
            랜드마크 유사도만으로는 의미를 판정할 수 없습니다.
          </LandingInfo>
          <LandingInfo title="댓글 기반 외부 맥락">
            다른 영상의 댓글은 이 영상의 예측이 아닙니다.
          </LandingInfo>
          <LandingInfo title="법률 판정">위법 여부와 정치 성향을 판단하지 않습니다.</LandingInfo>
          <LandingInfo title="자동 편집·수정">영상을 대신 고치지 않습니다.</LandingInfo>
        </div>
      </section>
      <section className="landing-section landing-evidence">
        <h2>모든 검토 후보에 근거를 함께 제공합니다</h2>
        <div className="landing-evidence-grid">
          <LandingInfo title="직접 근거">
            실제 발언이나 화면 정보를 직접 확인할 수 있습니다.
          </LandingInfo>
          <LandingInfo title="외부 자료">
            공식 자료나 관련 Source를 함께 확인할 수 있습니다.
          </LandingInfo>
          <LandingInfo title="관련 맥락">
            판단에 참고할 사회·문화·역사적 배경을 제공합니다.
          </LandingInfo>
        </div>
      </section>
      <section className="landing-section landing-cta">
        <div>
          <h2>한 편으로 확인해 보세요</h2>
          <p>10분 영상 기준 5분 이내에 리포트가 나옵니다.</p>
        </div>
        <LandingUploadCta compact />
      </section>
      <footer className="landing-footer">
        <div>
          <strong>제품</strong>
          <Link to="/upload">업로드</Link>
          <Link to="/report">검수 리포트</Link>
          <Link to="/history">검수 이력</Link>
        </div>
        <div>
          <strong>정책</strong>
          <button type="button" className="footer-link">
            데이터 보관
          </button>
          <button type="button" className="footer-link">
            AI 출력 원칙
          </button>
          <button type="button" className="footer-link">
            참조 데이터베이스 기준
          </button>
        </div>
        <div className="landing-footer-brand">
          <img className="landing-footer-logo" src={logoUrl} alt="OoPs!?" />
          <p>AI는 의도와 정치 성향, 위법 여부를 판정하지 않습니다.</p>
          <small>© 2026 OoPs?!</small>
        </div>
      </footer>
    </main>
  )
}
