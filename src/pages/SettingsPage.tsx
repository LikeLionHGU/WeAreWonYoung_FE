function SettingsRow({
  title,
  description,
  action,
  tone = 'default',
  compact = false,
}: {
  title: string
  description?: string
  action?: string
  tone?: 'default' | 'danger'
  compact?: boolean
}) {
  return (
    <div className={`settings-row ${compact ? 'settings-row-compact' : ''}`}>
      <div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {action && (
        <button type="button" disabled className={`settings-action settings-action-${tone}`}>
          {action}
        </button>
      )}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <main className="settings-page">
      <h1>설정</h1>
      <p className="settings-intro">
        공개 전 영상을 다루는 서비스이므로 데이터 보관 정책을 먼저 확인해 주세요.
      </p>
      <section className="settings-group settings-data-group">
        <h2>데이터</h2>
        <div className="settings-row-list">
          <SettingsRow
            title="원본 영상 보관"
            description="분석 완료 후 24시간 내 자동 삭제 · 변경할 수 없습니다"
          />
          <SettingsRow title="리포트 보관 기간" description="90일 후 자동 삭제" action="변경" />
          <SettingsRow
            title="모델 학습 사용"
            description="사용하지 않습니다 · 변경할 수 없습니다"
          />
          <SettingsRow
            title="모든 리포트 삭제"
            description="되돌릴 수 없습니다"
            action="전체 삭제"
            tone="danger"
          />
        </div>
      </section>
      <section className="settings-group settings-billing-group">
        <h2>플랜 · 결제</h2>
        <div className="settings-plan-card">
          <div>
            <div className="settings-plan-title">
              <strong>무료 체험</strong>
            </div>
            <p>현재 베타에서는 무료로 체험이 가능합니다.</p>
          </div>
          <button type="button" disabled className="settings-action settings-action-primary">
            플랜 변경
          </button>
        </div>
        <div className="settings-row-list settings-payment-list">
          <SettingsRow title="결제 수단" description="등록된 카드 없음" action="카드 등록" />
          <SettingsRow title="영수증" description="최근 결제 내역 없음" />
        </div>
      </section>
      <section className="settings-group settings-account-group">
        <h2>계정</h2>
        <div className="settings-row-list">
          <SettingsRow title="이메일" description="로그인 계정이 연결되면 표시됩니다" />
          <SettingsRow title="로그아웃" action="로그아웃" compact />
        </div>
      </section>
    </main>
  )
}
