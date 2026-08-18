export function LandingKicker({ label }: { label: string }) {
  return (
    <div className="landing-kicker">
      <strong>{label}</strong>
      <span className="landing-kicker-line" />
      <i />
      <i />
      <i className="active" />
    </div>
  )
}
