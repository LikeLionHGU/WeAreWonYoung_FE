import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorNotice } from '../components/AppShell'
import { useVideoUpload } from '../hooks/useVideoUpload'

type UploadMode = 'file' | 'script'
const MAX_SCRIPT_LENGTH = 500_000

export default function UploadPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const { upload, registerScript, isUploading, progress, error } = useVideoUpload()
  const [mode, setMode] = useState<UploadMode>('file')
  const [fileName, setFileName] = useState('')
  const [script, setScript] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [scriptError, setScriptError] = useState<string | null>(null)

  useEffect(() => {
    if (!isUploading) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isUploading])

  const canSubmit = mode === 'file' ? Boolean(fileName) : Boolean(script.trim()) && !scriptError

  async function submit() {
    if (mode === 'file') {
      const file = inputRef.current?.files?.[0]
      if (!file) return
      const result = await upload(file)
      if (result) navigate(`/videos/${result.videoId}/analysis`)
    } else {
      const trimmed = script.trim()
      if (!trimmed) {
        setScriptError('스크립트를 입력해 주세요.')
        return
      }
      setScriptError(null)
      const result = await registerScript(trimmed)
      if (result) navigate(`/videos/${result.videoId}/analysis`)
    }
  }

  function acceptFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) {
      setFileName(file.name)
      setMode('file')
      setScript('')
      setScriptError(null)
      if (inputRef.current) {
        const transfer = new DataTransfer()
        transfer.items.add(file)
        inputRef.current.files = transfer.files
      }
    }
    setIsDragging(false)
  }

  function handleScriptChange(value: string) {
    setScript(value)
    setMode('script')
    setScriptError(null)
    if (fileName) setFileName('')
  }

  function switchToFile() {
    setMode('file')
    setScript('')
    setScriptError(null)
  }

  function switchToScript() {
    setMode('script')
    setScriptError(null)
    setFileName('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <main className="upload-page">
      <section className="upload-main">
        <h1>영상 업로드</h1>
        <p className="upload-subtitle">
          공개 전 다시 확인하고 싶은 영상을 올리거나, STT 스크립트를 붙여넣어 주세요.
        </p>

        <div className="upload-mode-tabs" role="tablist" aria-label="업로드 방식">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'file'}
            className={mode === 'file' ? 'is-active' : ''}
            onClick={switchToFile}
          >
            파일 업로드
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'script'}
            className={mode === 'script' ? 'is-active' : ''}
            onClick={switchToScript}
          >
            스크립트 입력
          </button>
        </div>

        {mode === 'file' && (
          <div role="tabpanel" aria-label="파일 업로드">
            <label
              className={`dropzone ${fileName ? 'has-file' : ''} ${isDragging ? 'is-dragging' : ''}`}
              htmlFor="video-file"
              onDragEnter={event => {
                event.preventDefault()
                setIsDragging(true)
              }}
              onDragOver={event => {
                event.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={event => {
                event.preventDefault()
                acceptFiles(event.dataTransfer.files)
              }}
            >
              <div className="upload-icon" aria-hidden="true">
                <svg viewBox="0 0 14 14" focusable="false">
                  <path d="M6.5 10.58V1.93L4.17 4.26l-.71-.72L7 0l3.54 3.54-.71.72L7.5 1.93v8.65h-1ZM0 14V9.96h1V13h12V9.96h1V14H0Z" />
                </svg>
              </div>
              <strong>{fileName || '파일을 이 영역으로 끌어다 놓으세요'}</strong>
              <span>
                {fileName ? '다른 파일을 선택하려면 클릭' : '또는 눌러서 파일을 선택하세요'}
              </span>
              <small>mp4, mov 또는 avi · 최대 90분 · 500MB</small>
              <input
                ref={inputRef}
                id="video-file"
                type="file"
                accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo"
                onChange={event => acceptFiles(event.target.files)}
              />
            </label>
          </div>
        )}

        {mode === 'script' && (
          <div role="tabpanel" aria-label="스크립트 입력">
            <div className="url-input-area">
              <label htmlFor="video-script" className="url-label">
                STT 스크립트
              </label>
              <textarea
                id="video-script"
                className={`url-input ${scriptError ? 'is-error' : ''}`}
                placeholder="스크립트 내용을 붙여넣어 주세요. 타임스탬프가 있어도 됩니다."
                value={script}
                maxLength={MAX_SCRIPT_LENGTH}
                onChange={e => handleScriptChange(e.target.value)}
                aria-invalid={Boolean(scriptError)}
                aria-describedby={scriptError ? 'script-error' : undefined}
              />
              {scriptError && (
                <p id="script-error" className="url-error">
                  {scriptError}
                </p>
              )}
              <small className="url-hint">
                {script.length.toLocaleString()} / {MAX_SCRIPT_LENGTH.toLocaleString()}
              </small>
            </div>
          </div>
        )}

        {error && <ErrorNotice message={error.message} />}

        {isUploading && mode === 'file' && progress > 0 && (
          <div className="upload-progress">
            <div className="upload-progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
            <span className="upload-progress-label">{progress}%</span>
          </div>
        )}

        <div className="upload-submit">
          <p>
            {mode === 'file'
              ? '업로드가 끝나면 분석이 곧바로 시작됩니다.'
              : '스크립트를 등록하면 분석이 곧바로 시작됩니다.'}
          </p>
          <button
            className="button button-primary"
            disabled={!canSubmit || isUploading}
            onClick={() => void submit()}
          >
            {isUploading ? (
              <>
                <span className="spinner spinner-light" />
                {mode === 'file' ? '업로드 중…' : '등록 중…'}
              </>
            ) : (
              '분석 시작'
            )}
          </button>
        </div>
      </section>

      <aside className="policy-panel">
        <h2>데이터 보관 정책</h2>
        <p>공개 전 영상은 채널의 민감한 자산입니다.</p>
        <dl>
          <div>
            <dt>원본 영상</dt>
            <dd>분석 완료 후 24시간 내 자동 삭제</dd>
          </div>
          <div>
            <dt>모델 학습</dt>
            <dd>사용하지 않습니다</dd>
          </div>
          <div>
            <dt>리포트</dt>
            <dd>텍스트 결과와 대표 프레임만 보관, 언제든 삭제 가능</dd>
          </div>
          <div>
            <dt>전송</dt>
            <dd>전송 구간 암호화</dd>
          </div>
        </dl>
      </aside>
    </main>
  )
}
