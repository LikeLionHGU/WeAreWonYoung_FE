import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'

const port = 3102
const child = spawn('tsx', ['server/index.ts'], {
  env: {
    ...process.env,
    PORT: String(port),
    MOCK_AUTH: 'true',
    MOCK_STEP_MS: '20',
    MOCK_DATA_DIR: `/tmp/creator-risk-manager-auth-contract-${process.pid}`,
  },
  stdio: 'ignore',
})
const base = `http://localhost:${port}`
const loginPath = '/oauth2/authorization/google'

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      await fetch(`${base}/api/v1/auth/me`)
      return
    } catch {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
  throw new Error('Mock server did not start')
}

async function login() {
  const response = await fetch(`${base}${loginPath}`, { redirect: 'manual' })
  assert.equal(response.status, 302)
  const [cookie] = response.headers.getSetCookie()
  return cookie.split(';')[0]
}

async function csrfHeaders(cookie: string) {
  const response = await fetch(`${base}/api/v1/auth/csrf`, { headers: { Cookie: cookie } })
  const body = (await response.json()) as { data: { headerName: string; token: string } }
  return { Cookie: cookie, [body.data.headerName]: body.data.token }
}

async function run() {
  try {
    await waitForServer()

    const anonymous = await fetch(`${base}/api/v1/auth/me`)
    assert.equal(anonymous.status, 200)
    const anonymousBody = (await anonymous.json()) as {
      data: { loggedIn: boolean; authEnabled: boolean; loginUrl: string; user: null }
    }
    assert.deepEqual(anonymousBody.data, {
      loggedIn: false,
      authEnabled: true,
      loginUrl: loginPath,
      user: null,
    })

    const unauthorized = await fetch(`${base}/api/v1/videos/history`)
    assert.equal(unauthorized.status, 401)
    const unauthorizedBody = (await unauthorized.json()) as {
      error: { code: string; details: { loginUrl: string } }
    }
    assert.equal(unauthorizedBody.error.code, 'UNAUTHORIZED')
    assert.equal(unauthorizedBody.error.details.loginUrl, loginPath)

    const cookie = await login()
    const me = await fetch(`${base}/api/v1/auth/me`, { headers: { Cookie: cookie } })
    const meBody = (await me.json()) as { data: { loggedIn: boolean; user: { email: string } } }
    assert.equal(meBody.data.loggedIn, true)
    assert.equal(meBody.data.user.email, 'tester@example.com')

    const history = await fetch(`${base}/api/v1/videos/history`, { headers: { Cookie: cookie } })
    assert.equal(history.status, 200)

    const form = new FormData()
    form.append('file', new Blob([Buffer.from('mock')], { type: 'video/mp4' }), 'auth.mp4')
    const withoutToken = await fetch(`${base}/api/v1/videos`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    })
    assert.equal(withoutToken.status, 403)
    assert.equal(await withoutToken.text(), '')

    const headers = await csrfHeaders(cookie)
    const upload = await fetch(`${base}/api/v1/videos`, { method: 'POST', headers, body: form })
    assert.equal(upload.status, 201)
    const uploadBody = (await upload.json()) as { data: { videoId: string } }

    const remove = await fetch(`${base}/api/v1/videos/${uploadBody.data.videoId}`, {
      method: 'DELETE',
      headers,
    })
    assert.equal(remove.status, 204)

    const logout = await fetch(`${base}/api/v1/auth/logout`, { method: 'POST', headers })
    assert.equal(logout.status, 204)

    const afterLogout = await fetch(`${base}/api/v1/videos/history`, {
      headers: { Cookie: cookie },
    })
    assert.equal(afterLogout.status, 401)

    const expiredMutation = await fetch(`${base}/api/v1/videos/1/analysis/cancel`, {
      method: 'POST',
      headers,
    })
    assert.equal(expiredMutation.status, 403)
    console.log('Auth contract smoke test passed')
  } finally {
    child.kill('SIGTERM')
  }
}

void run().catch(error => {
  console.error(error)
  process.exitCode = 1
})
