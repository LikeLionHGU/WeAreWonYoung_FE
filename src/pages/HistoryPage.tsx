import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNotice, Loading } from '../components/AppShell'
import { apiClient, hasConfiguredApi } from '../api/client'
import type { VideoHistoryItem } from '../api/types'
import { formatHistoryDate } from '../utils/format'
import { LandingKicker } from '../components/LandingKicker'

function EmptyUploadPage({
  eyebrow,
  title,
  description,
  notice,
}: {
  eyebrow: string
  title: string
  description: string
  notice?: string
}) {
  return (
    <main className="landing-empty-page">
      <LandingKicker label={eyebrow} />
      <h1>{title}</h1>
      <p>{description}</p>
      {notice && <ErrorNotice message={notice} />}
      <Link className="landing-empty-action" to="/upload">
        <span>영상 업로드하기</span>
        <strong>→</strong>
      </Link>
    </main>
  )
}

function HistoryRow({ item }: { item: VideoHistoryItem }) {
  const completed = item.analysisStatus === 'COMPLETED'
  const target = completed ? `/videos/${item.videoId}/report` : `/videos/${item.videoId}/analysis`
  const statusLabel =
    item.analysisStatus === 'FAILED'
      ? '다시 시도'
      : item.analysisStatus === 'CANCELLED'
        ? '취소됨'
        : !completed
          ? '분석 중'
          : item.reviewStatus === 'COMPLETED'
            ? '완료'
            : item.reviewStatus === 'IN_REVIEW'
              ? '검수 중'
              : item.eventCount === 0
                ? '검출 없음'
                : '검수 필요'
  return (
    <Link className={`history-row history-row-${item.analysisStatus.toLowerCase()}`} to={target}>
      <span className="history-file">
        <strong>{item.filename}</strong>
      </span>
      <span className="history-uploaded-at">{formatHistoryDate(item.uploadedAt)}</span>
      <span className="history-event-count">{completed ? `${item.eventCount}건` : '—'}</span>
      <span className="history-edited">{completed ? `${item.editedCount}건 수정` : '—'}</span>
      <span className={`history-status history-status-${item.analysisStatus.toLowerCase()}`}>
        {statusLabel}
      </span>
    </Link>
  )
}

export default function HistoryPage() {
  const [items, setItems] = useState<VideoHistoryItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'COMPLETED' | 'FAILED'>('ALL')
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const pageSize = 20

  useEffect(() => {
    let active = true
    void apiClient
      .history('ALL', 0, pageSize)
      .then(value => {
        if (active) {
          setItems(value.items)
          setHasMore(value.totalPages > 1)
        }
      })
      .catch(e => {
        if (!active) return
        if (hasConfiguredApi())
          setError(e instanceof Error ? e.message : '검수 이력을 불러오지 못했습니다.')
        else setItems([])
      })
    return () => {
      active = false
    }
  }, [])

  async function loadMore() {
    const nextPage = page + 1
    setIsLoadingMore(true)
    try {
      const res = await apiClient.history('ALL', nextPage, pageSize)
      setItems(prev => [...(prev ?? []), ...res.items])
      setPage(nextPage)
      setHasMore(nextPage + 1 < res.totalPages)
    } catch {
      /* silent — existing items stay */
    } finally {
      setIsLoadingMore(false)
    }
  }
  if (error)
    return (
      <EmptyUploadPage
        eyebrow="검수 이력"
        title="이력을 불러오지 못했습니다"
        description="서버 연결을 확인하고 새로고침해 주세요."
        notice={error}
      />
    )
  if (items === null)
    return (
      <main className="center-page">
        <Loading label="검수 이력을 불러오는 중" />
      </main>
    )
  const completedCount = items.filter(item => item.analysisStatus === 'COMPLETED').length
  const failedCount = items.filter(item => item.analysisStatus === 'FAILED').length
  const visibleItems = items.filter(item => filter === 'ALL' || item.analysisStatus === filter)
  return (
    <main className="history-page">
      <h1>검수 이력</h1>
      <p className="history-intro">직접 업로드하고 검수를 시작한 영상만 이곳에 표시됩니다.</p>
      <div className="history-filters" role="group" aria-label="상태 필터">
        <button
          type="button"
          aria-pressed={filter === 'ALL'}
          className={filter === 'ALL' ? 'is-selected' : ''}
          onClick={() => setFilter('ALL')}
        >
          전체 {items.length}
        </button>
        <button
          type="button"
          aria-pressed={filter === 'COMPLETED'}
          className={filter === 'COMPLETED' ? 'is-selected' : ''}
          onClick={() => setFilter('COMPLETED')}
        >
          완료 {completedCount}
        </button>
        <button
          type="button"
          aria-pressed={filter === 'FAILED'}
          className={filter === 'FAILED' ? 'is-selected' : ''}
          onClick={() => setFilter('FAILED')}
        >
          실패 {failedCount}
        </button>
      </div>
      <div className="history-card">
        {visibleItems.length > 0 ? (
          visibleItems.map(item => <HistoryRow item={item} key={item.videoId} />)
        ) : (
          <div className="history-empty">
            <p>이 상태의 검수 이력이 없습니다.</p>
          </div>
        )}
      </div>
      {hasMore && filter === 'ALL' && (
        <button
          type="button"
          className="history-load-more"
          onClick={() => void loadMore()}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? '불러오는 중…' : '이전 이력 더 보기'}
        </button>
      )}
    </main>
  )
}
