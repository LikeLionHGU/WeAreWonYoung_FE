export interface CsrfToken {
  headerName: string | null
  token: string | null
}

function isForbidden(error: unknown) {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 403
}

export function createCsrfSession(fetchToken: () => Promise<CsrfToken>) {
  let pending: Promise<CsrfToken> | null = null

  function clear() {
    pending = null
  }

  async function headers(): Promise<Record<string, string>> {
    pending ??= fetchToken().catch(error => {
      pending = null
      throw error
    })
    const { headerName, token } = await pending
    return headerName && token ? { [headerName]: token } : {}
  }

  function warm() {
    headers().catch(() => {})
  }

  async function send<T>(attempt: (headers: Record<string, string>) => Promise<T>): Promise<T> {
    try {
      return await attempt(await headers())
    } catch (error) {
      if (!isForbidden(error)) throw error
      clear()
      return attempt(await headers())
    }
  }

  return { clear, send, warm }
}
