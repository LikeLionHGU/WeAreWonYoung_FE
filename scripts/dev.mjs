import net from 'node:net'
import { spawn } from 'node:child_process'
import process from 'node:process'

const VITE_PORT = 5173
const MOCK_PORT = 3001
const children = new Set()
let shuttingDown = false

function isPortInUse(port) {
  const checkHost = host => new Promise(resolve => {
    const socket = net.createConnection({ host, port })
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('error', () => { socket.destroy(); resolve(false) })
  })
  return Promise.all([checkHost('127.0.0.1'), checkHost('::1')]).then(results => results.some(Boolean))
}

function start(label, command, args) {
  const child = spawn(process.execPath, [command, ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })
  children.add(child)
  console.log(`[dev] ${label} started (pid ${child.pid})`)
  child.once('exit', (code, signal) => {
    children.delete(child)
    if (shuttingDown) return
    if (code !== 0) {
      console.error(`[dev] ${label} stopped${signal ? ` (${signal})` : ` with code ${code}`}`)
      shutdown(code ?? 1)
    }
  })
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) child.kill('SIGTERM')
  process.exitCode = code
}

process.once('SIGINT', () => shutdown())
process.once('SIGTERM', () => shutdown())

const [viteRunning, mockRunning] = await Promise.all([
  isPortInUse(VITE_PORT),
  isPortInUse(MOCK_PORT),
])

if (viteRunning) console.log(`[dev] Vite is already running on http://localhost:${VITE_PORT}; reusing it.`)
else start('Vite', 'node_modules/vite/bin/vite.js', [])

if (mockRunning) console.log(`[dev] Mock server is already running on http://localhost:${MOCK_PORT}; reusing it.`)
else start('Mock server', 'node_modules/tsx/dist/cli.mjs', ['server/index.ts'])

if (viteRunning && mockRunning) {
  console.log('[dev] Both development services are already running; no duplicate processes were started.')
  process.exit(0)
}

const waitForChildren = setInterval(() => {
  if (shuttingDown && children.size === 0) {
    clearInterval(waitForChildren)
    process.exit()
  }
}, 50)
