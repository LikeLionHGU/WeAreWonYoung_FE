import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loading } from '../components/AppShell'
import { apiClient } from '../api/client'
import type { VideoHistoryItem } from '../api/types'
import EmptyReportPage from './EmptyReportPage'

export default function ReportRedirectPage() {
  const [target, setTarget] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let active = true
    void apiClient.history('COMPLETED', 0, 1).then(res => {
      if (!active) return
      const latest = res.items[0] as VideoHistoryItem | undefined
      if (latest) {
        setTarget(`/videos/${latest.videoId}/report`)
      }
      setChecked(true)
    }).catch(() => {
      if (active) setChecked(true)
    })
    return () => { active = false }
  }, [])

  if (!checked) {
    return (
      <main className="center-page">
        <Loading label="검수 리포트를 찾는 중" />
      </main>
    )
  }

  if (target) return <Navigate to={target} replace />

  return <EmptyReportPage />
}
