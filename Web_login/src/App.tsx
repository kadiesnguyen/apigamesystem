import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'mahjongway-playground-settings'
const ACTIVE_GAME_STORAGE_KEY = 'mahjongway-playground-active-game'

const GAME_PRESETS = [
  {
    key: 'mahjongway1',
    label: 'MahjongWay 1',
    gameId: '1003',
    portalUrl: 'http://mahjongway.web3oktrade.com/game/'
  },
  {
    key: 'mahjongway2',
    label: 'MahjongWay 2',
    gameId: '1002',
    portalUrl: 'http://mahjongway2.web3oktrade.com/game/'
  }
] as const

type GamePreset = (typeof GAME_PRESETS)[number]
type GameKey = GamePreset['key']

const GAME_PRESET_MAP = GAME_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.key] = preset
    return acc
  },
  {} as Record<GameKey, GamePreset>
)

const DEFAULT_GAME_KEY: GameKey = 'mahjongway1'

const getStorageKey = (gameKey: GameKey) => `${STORAGE_KEY}:${gameKey}`

const loadStoredGameKey = (): GameKey => {
  if (typeof window === 'undefined') return DEFAULT_GAME_KEY
  const stored = window.localStorage.getItem(ACTIVE_GAME_STORAGE_KEY)
  if (stored && (GAME_PRESET_MAP as Record<string, GamePreset>)[stored]) {
    return stored as GameKey
  }
  return DEFAULT_GAME_KEY
}

type LogLevel = 'info' | 'error' | 'incoming' | 'outgoing'

interface LogEntry {
  id: string
  level: LogLevel
  message: string
  timestamp: string
}

interface LoginPayload {
  message?: string
  token: string
  user: {
    userId: number
    username: string
  }
}

interface SpinPayload {
  success?: boolean
  totalWin?: number
  freeSpinsLeft?: number
  usingFreeSpin?: boolean
  free?: unknown
  rounds?: unknown[]
  error?: string
}

interface Settings {
  apiBaseUrl: string
  wsBaseUrl: string
  apiKey: string
  secretKey: string
  username: string
  betAmount: string
  debugApiUrl: string
}

type LoginApiResponse = { success: true; data: LoginPayload }
type LoginApiError = { success: false; error?: string }

const defaultSettings: Settings = {
  apiBaseUrl: 'https://api.web3oktrade.com/api',
  wsBaseUrl: 'wss://wss.web3oktrade.com',
  apiKey: '',
  secretKey: '',
  username: '',
  betAmount: '1',
  debugApiUrl: 'https://apicms.web3oktrade.com'
}

const loadSettings = (gameKey: GameKey): Settings => {
  if (typeof window === 'undefined') {
    return defaultSettings
  }
  try {
    const raw =
      window.localStorage.getItem(getStorageKey(gameKey)) ||
      (gameKey === DEFAULT_GAME_KEY ? window.localStorage.getItem(STORAGE_KEY) : null)
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw)
    return { ...defaultSettings, ...parsed }
  } catch {
    return defaultSettings
  }
}

const bufferToHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

const randomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const joinUrl = (base: string, path: string) => {
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${trimmedBase}${normalizedPath}`
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getRecordField = (parent: Record<string, unknown>, key: string) => {
  const nested = parent[key]
  return isRecord(nested) ? nested : null
}

const getArrayField = (parent: Record<string, unknown>, key: string) => {
  const nested = parent[key]
  return Array.isArray(nested) ? nested : []
}

const safeNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const formatNumber = (value: unknown, fallback = '—') => {
  const numeric = safeNumber(value)
  if (numeric === null) return fallback
  const fractionDigits = Number.isInteger(numeric) ? 0 : 2
  return numeric.toLocaleString('vi-VN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2
  })
}

const stringOrFallback = (value: unknown, fallback = '—') =>
  typeof value === 'string' && value.trim() ? value : fallback

const boolLabel = (value: unknown) => (value === true ? 'Có' : value === false ? 'Không' : 'Chưa rõ')

const boolChipClass = (value: unknown) => (value === true ? 'chip positive' : value === false ? 'chip neutral' : 'chip')

async function hmacSha256(secret: string, payload: string) {
  if (!secret) throw new Error('Thiếu secret key')
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Trình duyệt không hỗ trợ WebCrypto')
  }
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return bufferToHex(signature)
}

const SpinResultView = ({ data }: { data: SpinPayload }) => {
  const rounds = Array.isArray(data.rounds) ? data.rounds : []
  const summaryCards = [
    {
      icon: data.success === true ? '🎉' : data.success === false ? '⚠️' : 'ℹ️',
      label: 'Trạng thái',
      value: data.success === true ? 'Thành công' : data.success === false ? 'Không thắng' : 'Chưa rõ'
    },
    { icon: '💰', label: 'Tổng thưởng', value: formatNumber(data.totalWin) },
    { icon: '🎟️', label: 'Free spins còn', value: formatNumber(data.freeSpinsLeft) },
    { icon: '🚀', label: 'Đang dùng free spin', value: boolLabel(data.usingFreeSpin) },
    { icon: '🔄', label: 'Số vòng', value: rounds.length.toString() }
  ]

  return (
    <div className="spin-summary">
      {!!data.error && (
        <div className="alert error">
          <span>⚠️ {data.error}</span>
        </div>
      )}

      <div className="stat-grid">
        {summaryCards.map((card) => (
          <div key={card.label} className="stat-card">
            <span className="stat-icon">{card.icon}</span>
            <div>
              <p>{card.label}</p>
              <strong>{card.value}</strong>
            </div>
          </div>
        ))}
      </div>

      {rounds.length > 0 ? (
        <>
          <div className="round-list">
            {rounds.slice(0, 6).map((round, idx) => {
              const roundRecord: Record<string, unknown> = isRecord(round) ? round : {}
              const index = safeNumber(roundRecord['index'])
              const stepWin = safeNumber(roundRecord['stepWin'])
              const multiplier = safeNumber(roundRecord['multiplier'])
              const hasNext = roundRecord['hasNext'] === true
              const winInfo = getRecordField(roundRecord, 'win')
              const normalWins = winInfo && Array.isArray(winInfo['normal']) ? winInfo['normal'].length : 0
              const wildWins = winInfo && Array.isArray(winInfo['wild']) ? winInfo['wild'].length : 0
              const flips = Array.isArray(roundRecord['flips']) ? roundRecord['flips'].length : 0

              return (
                <div className="round-card" key={`round-${idx}`}>
                  <div className="round-heading">
                    <span className="round-pill">Vòng #{index !== null ? index + 1 : idx + 1}</span>
                    <div className="chip-group compact">
                      <span className="chip neutral">💥 {stepWin !== null ? formatNumber(stepWin) : '—'}</span>
                      <span className={boolChipClass(hasNext)}>
                        {hasNext ? 'Có vòng tiếp' : 'Dừng lại'}
                      </span>
                    </div>
                  </div>

                  <div className="round-meta">
                    <div className="round-meta-item">
                      <span>Multiplier</span>
                      <strong>{multiplier !== null ? `x${multiplier}` : '—'}</strong>
                    </div>
                    <div className="round-meta-item">
                      <span>Normal hits</span>
                      <strong>{normalWins}</strong>
                    </div>
                    <div className="round-meta-item">
                      <span>Wild hits</span>
                      <strong>{wildWins}</strong>
                    </div>
                    <div className="round-meta-item">
                      <span>Flips</span>
                      <strong>{flips}</strong>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {rounds.length > 6 && (
            <p className="note muted">Đang hiển thị 6 vòng đầu tiên, mở JSON để xem đầy đủ.</p>
          )}
        </>
      ) : (
        <p className="muted">Chưa có dữ liệu vòng quay.</p>
      )}
    </div>
  )
}

const ProfileSummary = ({ payload }: { payload: Record<string, unknown> }) => {
  const dataSection = getRecordField(payload, 'data') ?? payload
  const user = getRecordField(dataSection, 'user')
  const wallets = getArrayField(dataSection, 'wallets').filter(isRecord)
  const message = stringOrFallback(dataSection['message'])

  return (
    <div className="profile-summary">
      {message && <p className="muted">{message}</p>}

      {user && (
        <div className="stat-grid small">
          <div className="stat-card compact">
            <span className="stat-icon">👤</span>
            <div>
              <p>Username</p>
              <strong>{stringOrFallback(user['username'])}</strong>
            </div>
          </div>
          <div className="stat-card compact">
            <span className="stat-icon">🆔</span>
            <div>
              <p>User ID</p>
              <strong>{formatNumber(user['id'])}</strong>
            </div>
          </div>
          <div className="stat-card compact">
            <span className="stat-icon">🤝</span>
            <div>
              <p>Partner</p>
              <strong>{formatNumber(user['partner_id'])}</strong>
            </div>
          </div>
          <div className="stat-card compact">
            <span className="stat-icon">🔒</span>
            <div>
              <p>Trạng thái</p>
              <strong className={user['active'] === true ? 'chip positive' : 'chip warning'}>
                {user['active'] === true ? 'Hoạt động' : 'Tạm khóa'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {wallets.length > 0 && (
        <div className="wallet-list">
          {wallets.map((wallet, idx) => (
            <div className="wallet-card" key={String(wallet['account_id'] ?? idx)}>
              <div className="wallet-header">
                <span className="chip neutral">
                  Wallet #{String(wallet['account_id'] ?? (idx + 1))}
                </span>
                <span className="chip">{stringOrFallback(wallet['currency'], '---')}</span>
              </div>
              <div className="round-meta">
                <div className="round-meta-item">
                  <span>Game ID</span>
                  <strong>{formatNumber(wallet['game_id'])}</strong>
                </div>
                <div className="round-meta-item">
                  <span>Balance</span>
                  <strong>{formatNumber(wallet['balance'])}</strong>
                </div>
                <div className="round-meta-item">
                  <span>Locked</span>
                  <strong>{formatNumber(wallet['locked_balance'])}</strong>
                </div>
                <div className="round-meta-item">
                  <span>Free spins</span>
                  <strong>{formatNumber(wallet['free_spins'])}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!user && wallets.length === 0 && <p className="muted">Không có dữ liệu profile.</p>}
    </div>
  )
}

function App() {
  const initialGameRef = useRef<GameKey | null>(null)
  if (initialGameRef.current === null) {
    initialGameRef.current = loadStoredGameKey()
  }
  const initialGame = initialGameRef.current ?? DEFAULT_GAME_KEY

  const [activeGame, setActiveGame] = useState<GameKey>(initialGame)
  const [settings, setSettings] = useState<Settings>(() => loadSettings(initialGame))
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [loginPayload, setLoginPayload] = useState<LoginPayload | null>(null)
  const [registerPayload, setRegisterPayload] = useState<Record<string, unknown> | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [lastSpin, setLastSpin] = useState<SpinPayload | null>(null)
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [spinLoading, setSpinLoading] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [lastGameUrl, setLastGameUrl] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Debug state
  const [debugPartners, setDebugPartners] = useState<Record<string, unknown>[] | null>(null)
  const [debugPlayers, setDebugPlayers] = useState<Record<string, unknown>[] | null>(null)
  const [debugWallets, setDebugWallets] = useState<Record<string, unknown>[] | null>(null)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugPlayerIdFilter, setDebugPlayerIdFilter] = useState('')
  const [debugGameIdFilter, setDebugGameIdFilter] = useState('')
  const [debugPlayerDetail, setDebugPlayerDetail] = useState<{ player: Record<string, unknown>; wallets: Record<string, unknown>[] } | null>(null)

  const currentGame = GAME_PRESET_MAP[activeGame]

  const updateSetting = (key: keyof Settings) => (value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getStorageKey(activeGame), JSON.stringify(settings))
    if (activeGame === DEFAULT_GAME_KEY) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    }
  }, [settings, activeGame])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(ACTIVE_GAME_STORAGE_KEY, activeGame)
  }, [activeGame])

  useEffect(() => {
    return () => {
      wsRef.current?.close()
    }
  }, [])

  const pushLog = (message: string, level: LogLevel = 'info') => {
    setLogs((prev) => {
      const entry: LogEntry = {
        id: randomId(),
        level,
        message,
        timestamp: new Date().toLocaleTimeString()
      }
      const next = [...prev, entry]
      return next.length > 200 ? next.slice(next.length - 200) : next
    })
  }

  const handleSelectGame = (gameKey: GameKey) => {
    if (gameKey === activeGame) return
    wsRef.current?.close()
    setWsStatus('disconnected')
    setActiveGame(gameKey)
    setSettings(loadSettings(gameKey))
    setPassword('')
    setToken('')
    setLoginPayload(null)
    setRegisterPayload(null)
    setProfile(null)
    setLastSpin(null)
    setSpinLoading(false)
    setLastGameUrl(null)
    setLogs([])
    pushLog(`Đã chuyển sang ${GAME_PRESET_MAP[gameKey].label}`, 'info')
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const { apiBaseUrl, apiKey, secretKey, username } = settings
    if (!apiBaseUrl || !apiKey || !secretKey) {
      pushLog('Vui lòng điền đủ API base URL, API key và Secret key', 'error')
      return
    }
    if (!username || !password) {
      pushLog('Thiếu username hoặc password', 'error')
      return
    }

    let targetUrl: string
    try {
      targetUrl = joinUrl(apiBaseUrl, '/user/login')
      new URL(targetUrl)
    } catch {
      pushLog('API base URL không hợp lệ', 'error')
      return
    }

    const method = 'POST'
    const body = {
      username: username.trim(),
      password
    }
    const rawBody = JSON.stringify(body)

    setLoginLoading(true)
    try {
      const timestamp = Date.now().toString()
      const { pathname } = new URL(targetUrl)
      const signaturePayload = `${method}|${pathname}|${timestamp}|${rawBody}`
      const signature = await hmacSha256(secretKey, signaturePayload)

      pushLog(`➡️ ${method} ${pathname} body=${rawBody}`, 'outgoing')
      const response = await fetch(targetUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-timestamp': timestamp,
          'x-signature': signature
        },
        body: rawBody
      })
      const data = (await response.json().catch(() => undefined)) as LoginApiResponse | LoginApiError | undefined

      if (!response.ok || !data) {
        if (data && 'error' in data && data.error) {
          throw new Error(data.error)
        }
        throw new Error('Đăng nhập thất bại')
      }

      if (data.success !== true) {
        throw new Error(data.error ?? 'Đăng nhập thất bại')
      }

      setLoginPayload(data.data)
      setToken(data.data.token)
      pushLog('✅ Đăng nhập thành công', 'info')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đăng nhập thất bại'
      pushLog(`❌ ${message}`, 'error')
      setLoginPayload(null)
      setToken('')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async () => {
    const { apiBaseUrl, apiKey, secretKey, username } = settings
    if (!apiBaseUrl || !apiKey || !secretKey) {
      pushLog('Vui lòng điền đủ API base URL, API key và Secret key', 'error')
      return
    }
    if (!username || !password) {
      pushLog('Thiếu username hoặc password', 'error')
      return
    }
    let targetUrl: string
    try {
      targetUrl = joinUrl(apiBaseUrl, '/user/register')
      new URL(targetUrl)
    } catch {
      pushLog('API base URL không hợp lệ', 'error')
      return
    }
    const method = 'POST'
    const body = {
      username: username.trim(),
      password,
      initGameId: Number(currentGame.gameId),
      gameUsername: username.trim()
    }
    const rawBody = JSON.stringify(body)
    setRegisterLoading(true)
    try {
      const timestamp = Date.now().toString()
      const { pathname } = new URL(targetUrl)
      const signaturePayload = `${method}|${pathname}|${timestamp}|${rawBody}`
      const signature = await hmacSha256(secretKey, signaturePayload)
      pushLog(`➡️ ${method} ${pathname} body=${rawBody}`, 'outgoing')
      const response = await fetch(targetUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-timestamp': timestamp,
          'x-signature': signature
        },
        body: rawBody
      })
      const data = (await response.json().catch(() => undefined)) as
        | { success: true; data: Record<string, unknown> }
        | LoginApiError
        | undefined
      if (!response.ok || !data) {
        if (data && 'error' in data && data.error) throw new Error(data.error)
        throw new Error('Tạo tài khoản thất bại')
      }
      if ('success' in data && data.success !== true) {
        throw new Error('error' in data && data.error ? data.error : 'Tạo tài khoản thất bại')
      }
      const payload = isRecord((data as { success: true; data: unknown }).data)
        ? ((data as { success: true; data: Record<string, unknown> }).data)
        : null
      setRegisterPayload(payload)
      pushLog('✅ Tạo tài khoản thành công', 'info')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tạo tài khoản thất bại'
      setRegisterPayload(null)
      pushLog(`❌ ${message}`, 'error')
    } finally {
      setRegisterLoading(false)
    }
  }

  const connectSocket = () => {
    if (!token) {
      pushLog('Vui lòng đăng nhập để lấy token trước khi kết nối WS', 'error')
      return
    }
    if (!settings.wsBaseUrl) {
      pushLog('Thiếu WebSocket URL', 'error')
      return
    }
    try {
      const wsUrl = new URL(settings.wsBaseUrl)
      wsUrl.searchParams.set('gameID', currentGame.gameId)
      wsUrl.searchParams.set('token', token)
      wsRef.current?.close()
      setWsStatus('connecting')
      pushLog(`🔌 Kết nối ${wsUrl.toString()}`, 'info')
      const socket = new WebSocket(wsUrl)
      wsRef.current = socket

      socket.onopen = () => {
        setWsStatus('connected')
        pushLog('✅ WebSocket connected', 'info')
      }

      socket.onmessage = (event) => {
        pushLog(`⬅️ ${event.data}`, 'incoming')
        try {
          const parsed = JSON.parse(event.data)
          if (parsed.type === 'spinResult') {
            setSpinLoading(false)
            setLastSpin(isRecord(parsed.payload) ? (parsed.payload as SpinPayload) : null)
          } else if (parsed.type === 'getProfileResult') {
            setProfile(isRecord(parsed.payload) ? parsed.payload : null)
          } else if (parsed.type === 'error') {
            setSpinLoading(false)
          }
        } catch {
          // ignore parse errors for non-JSON payloads
        }
      }

      socket.onerror = (event) => {
        pushLog('⚠️ Lỗi WebSocket, vui lòng kiểm tra server', 'error')
        console.error(event)
      }

      socket.onclose = (evt) => {
        setWsStatus('disconnected')
        wsRef.current = null
        setSpinLoading(false)
        pushLog(`🔚 WebSocket closed (${evt.code})`, 'info')
      }
    } catch {
      pushLog('WebSocket URL không hợp lệ', 'error')
    }
  }

  const disconnectSocket = () => {
    wsRef.current?.close()
  }

  const sendSpin = () => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      pushLog('WebSocket chưa kết nối', 'error')
      return
    }
    const numericBet = Number(settings.betAmount)
    if (!Number.isFinite(numericBet) || numericBet <= 0) {
      pushLog('Số tiền cược không hợp lệ', 'error')
      return
    }
    const payload = {
      type: 'spin',
      payload: {
        bet: numericBet
      }
    }
    wsRef.current.send(JSON.stringify(payload))
    pushLog(`➡️ spin ${JSON.stringify(payload.payload)}`, 'outgoing')
    setSpinLoading(true)
  }

  const requestProfile = () => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      pushLog('WebSocket chưa kết nối', 'error')
      return
    }
    const payload = { gameID: Number(currentGame.gameId) }
    wsRef.current.send(JSON.stringify({ type: 'getProfile', payload }))
    pushLog(`➡️ getProfile ${JSON.stringify(payload)}`, 'outgoing')
  }

  const copyToken = async () => {
    if (!token) return
    try {
      if (!navigator?.clipboard) throw new Error('Clipboard API không khả dụng')
      await navigator.clipboard.writeText(token)
      pushLog('📋 Token đã được copy', 'info')
    } catch {
      pushLog('Không thể copy token (clipboard bị chặn?)', 'error')
    }
  }

  const clearLogs = () => setLogs([])

  // Debug functions
  const fetchDebugPartners = async () => {
    if (!settings.debugApiUrl) {
      pushLog('Chưa có Debug API URL', 'error')
      return
    }
    setDebugLoading(true)
    try {
      const res = await fetch(`${settings.debugApiUrl}/api/debug/partners`)
      const json = await res.json()
      setDebugPartners(json.data ?? [])
      pushLog(`✅ Lấy ${json.data?.length ?? 0} partners`, 'info')
    } catch (err: any) {
      pushLog(`❌ Lỗi lấy partners: ${err.message}`, 'error')
    } finally {
      setDebugLoading(false)
    }
  }

  const fetchDebugPlayers = async () => {
    if (!settings.debugApiUrl) {
      pushLog('Chưa có Debug API URL', 'error')
      return
    }
    setDebugLoading(true)
    try {
      const url = new URL(`${settings.debugApiUrl}/api/debug/players`)
      if (settings.username) url.searchParams.set('username', settings.username)
      const res = await fetch(url.toString())
      const json = await res.json()
      setDebugPlayers(json.data ?? [])
      pushLog(`✅ Lấy ${json.data?.length ?? 0} players`, 'info')
    } catch (err: any) {
      pushLog(`❌ Lỗi lấy players: ${err.message}`, 'error')
    } finally {
      setDebugLoading(false)
    }
  }

  const fetchDebugWallets = async () => {
    if (!settings.debugApiUrl) {
      pushLog('Chưa có Debug API URL', 'error')
      return
    }
    setDebugLoading(true)
    try {
      const url = new URL(`${settings.debugApiUrl}/api/debug/wallets`)
      if (debugPlayerIdFilter) url.searchParams.set('playerId', debugPlayerIdFilter)
      if (debugGameIdFilter) url.searchParams.set('gameId', debugGameIdFilter)
      const res = await fetch(url.toString())
      const json = await res.json()
      setDebugWallets(json.data ?? [])
      pushLog(`✅ Lấy ${json.data?.length ?? 0} wallets`, 'info')
    } catch (err: any) {
      pushLog(`❌ Lỗi lấy wallets: ${err.message}`, 'error')
    } finally {
      setDebugLoading(false)
    }
  }

  const fetchDebugPlayerDetail = async (playerId: number | string) => {
    if (!settings.debugApiUrl) {
      pushLog('Chưa có Debug API URL', 'error')
      return
    }
    const id = Number(playerId)
    if (!Number.isFinite(id) || id <= 0) {
      pushLog('Player ID không hợp lệ', 'error')
      return
    }
    setDebugLoading(true)
    try {
      const res = await fetch(`${settings.debugApiUrl}/api/debug/player/${id}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const json = await res.json()
      setDebugPlayerDetail({ player: json.player, wallets: json.wallets ?? [] })
      pushLog(`✅ Lấy chi tiết player #${id} với ${json.wallets?.length ?? 0} wallets`, 'info')
    } catch (err: any) {
      pushLog(`❌ Lỗi lấy player detail: ${err.message}`, 'error')
      setDebugPlayerDetail(null)
    } finally {
      setDebugLoading(false)
    }
  }

  const deleteWallet = async (accountId: number | string) => {
    if (!settings.debugApiUrl) {
      pushLog('Chưa có Debug API URL', 'error')
      return
    }
    const id = Number(accountId)
    if (!Number.isFinite(id) || id <= 0) {
      pushLog('Account ID không hợp lệ', 'error')
      return
    }
    if (!window.confirm(`Bạn có chắc muốn XÓA wallet #${id}? Hành động này không thể hoàn tác!`)) {
      return
    }
    setDebugLoading(true)
    try {
      const res = await fetch(`${settings.debugApiUrl}/api/debug/wallet/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      pushLog(`🗑️ Đã xóa wallet #${id}`, 'info')
      // Refresh wallets list
      await fetchDebugWallets()
    } catch (err: any) {
      pushLog(`❌ Lỗi xóa wallet: ${err.message}`, 'error')
    } finally {
      setDebugLoading(false)
    }
  }

    const launchGame = () => {
    if (!token) {
      pushLog('Cần đăng nhập để lấy token trước khi vào game', 'error')
      return
    }
    try {
      const portalUrl = new URL(currentGame.portalUrl)
      portalUrl.searchParams.set('token', token)
      portalUrl.searchParams.set('gameID', currentGame.gameId)
      const finalUrl = portalUrl.toString()
      setLastGameUrl(finalUrl)
      const popup = window.open(finalUrl, '_blank', 'noopener,noreferrer')
      if (!popup) {
        pushLog('Trình duyệt chặn mở tab mới, chuyển trực tiếp sang game...', 'error')
        window.location.href = finalUrl
        return
      }
      pushLog(`🎮 Mở game: ${finalUrl}`, 'info')
    } catch {
      pushLog('Game portal URL không hợp lệ', 'error')
    }
  }

  const isWsConnected = wsStatus === 'connected' && wsRef.current?.readyState === WebSocket.OPEN

  return (
    <div className="page">
      <header>
        <div>
          <p className="eyebrow">MahjongWay Test Console · {currentGame.label}</p>
          <h1>Login &amp; Spin playground</h1>
          <p className="subtitle">
            Điền thông tin partner để ký request đăng nhập và thử gửi spin qua WebSocket game {currentGame.gameId} ({currentGame.label}).
          </p>
        </div>
        <div className={`status-indicator ${wsStatus}`}>
          <span />
          <strong>
            {wsStatus === 'connected'
              ? 'Đang kết nối WS'
              : wsStatus === 'connecting'
                ? 'Đang kết nối...'
                : 'WS chưa kết nối'}
          </strong>
        </div>
      </header>

      <div className="game-tabs" role="tablist">
        {GAME_PRESETS.map((preset) => {
          const isActive = preset.key === activeGame
          return (
            <button
              type="button"
              key={preset.key}
              className={`game-tab ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectGame(preset.key)}
              aria-pressed={isActive}
            >
              <span>{preset.label}</span>
              <small>Game ID {preset.gameId}</small>
            </button>
          )
        })}
      </div>

      <section className="card">
        <div className="card-header">
          <h2>Thông tin partner</h2>
          <small>Lưu cục bộ trong trình duyệt</small>
        </div>
        <div className="grid grid-2">
          <label>
            <span>API Base URL</span>
            <input
              value={settings.apiBaseUrl}
              onChange={(e) => updateSetting('apiBaseUrl')(e.target.value)}
              placeholder="https://api.web3oktrade.com/api"
            />
          </label>
          <label>
            <span>WebSocket URL</span>
            <input
              value={settings.wsBaseUrl}
              onChange={(e) => updateSetting('wsBaseUrl')(e.target.value)}
              placeholder="wss://wss.web3oktrade.com"
            />
          </label>
          <label>
            <span>API Key</span>
            <input
              value={settings.apiKey}
              onChange={(e) => updateSetting('apiKey')(e.target.value)}
              placeholder="partner api key"
            />
          </label>
          <label>
            <span>Secret Key</span>
            <input
              type="password"
              value={settings.secretKey}
              onChange={(e) => updateSetting('secretKey')(e.target.value)}
              placeholder="partner secret"
            />
          </label>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Đăng nhập lấy token</h2>
          <small>Đính kèm chữ ký HMAC SHA-256</small>
        </div>
        <form className="grid grid-3" onSubmit={handleLogin}>
          <label>
            <span>Username</span>
            <input
              value={settings.username}
              onChange={(e) => updateSetting('username')(e.target.value)}
              placeholder="player username"
              autoComplete="username"
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
            />
          </label>
          <label>
            <span>Token hiện tại</span>
            <div className="token-row">
              <input value={token} readOnly placeholder="Chưa có token" />
              <button type="button" onClick={copyToken} disabled={!token}>
                Copy
              </button>
                <button type="button" onClick={launchGame} disabled={!token}>
                  Vào game
                </button>
            </div>
            {lastGameUrl && (
              <p className="muted">
                Nếu tab không tự mở,{' '}
                <a href={lastGameUrl} target="_blank" rel="noopener noreferrer">
                  bấm vào đây
                </a>.
              </p>
            )}
          </label>

          <div className="actions dual">
            <button type="button" onClick={handleRegister} disabled={registerLoading}>
              {registerLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản mới'}
            </button>
            <button type="submit" className="primary" disabled={loginLoading}>
              {loginLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </div>
        </form>

        {registerPayload && (
          <div className="card-subsection">
            <div className="subheader">
              <strong>Kết quả tạo tài khoản</strong>
              <small>Phản hồi từ /user/register</small>
            </div>
            <div className="stat-grid small">
              <div className="stat-card compact">
                <span className="stat-icon">🆔</span>
                <div>
                  <p>Player ID</p>
                  <strong>{formatNumber(registerPayload['playerId'])}</strong>
                </div>
              </div>
              <div className="stat-card compact">
                <span className="stat-icon">👤</span>
                <div>
                  <p>Username</p>
                  <strong>{stringOrFallback(registerPayload['username'])}</strong>
                </div>
              </div>
              <div className="stat-card compact">
                <span className="stat-icon">🎮</span>
                <div>
                  <p>Account ID</p>
                  <strong>{formatNumber(registerPayload['accountId'])}</strong>
                </div>
              </div>
            </div>
            <details className="payload details-block">
              <summary>Xem JSON đăng ký</summary>
              <pre>{JSON.stringify(registerPayload, null, 2)}</pre>
            </details>
          </div>
        )}

        {loginPayload && (
          <div className="card-subsection">
            <div className="subheader">
              <div>
                <strong>Thông tin người chơi</strong>
                <small>Dựa trên phản hồi đăng nhập</small>
              </div>
              <button type="button" onClick={launchGame} disabled={!token}>
                Vào game
              </button>
            </div>
            <div className="stat-grid small">
              <div className="stat-card compact">
                <span className="stat-icon">👤</span>
                <div>
                  <p>Username</p>
                  <strong>{loginPayload.user.username}</strong>
                </div>
              </div>
              <div className="stat-card compact">
                <span className="stat-icon">🆔</span>
                <div>
                  <p>User ID</p>
                  <strong>{loginPayload.user.userId}</strong>
                </div>
              </div>
              <div className="stat-card compact">
                <span className="stat-icon">🔐</span>
                <div>
                  <p>Token</p>
                  <strong className="token-mini">
                    {loginPayload.token.length > 24
                      ? `${loginPayload.token.slice(0, 24)}…`
                      : loginPayload.token}
                  </strong>
                </div>
              </div>
            </div>
            <details className="payload details-block">
              <summary>Xem JSON đăng nhập</summary>
              <pre>{JSON.stringify(loginPayload, null, 2)}</pre>
            </details>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>WebSocket &amp; Spin</h2>
          <small>Kết nối đến {currentGame.label} ({currentGame.gameId})</small>
        </div>
        <div className="ws-actions">
          <div className="ws-buttons">
            <button
              type="button"
              onClick={connectSocket}
              disabled={wsStatus === 'connecting' || wsStatus === 'connected'}
            >
              Kết nối WS
            </button>
            <button type="button" onClick={disconnectSocket} disabled={wsStatus === 'disconnected'}>
              Ngắt kết nối
            </button>
            <button type="button" onClick={requestProfile} disabled={!isWsConnected}>
              Lấy profile
            </button>
          </div>
          <label>
            <span>Bet amount</span>
            <input
              type="number"
              min="1"
              step="1"
              value={settings.betAmount}
              onChange={(e) => updateSetting('betAmount')(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="primary spin-button"
            onClick={sendSpin}
            disabled={!isWsConnected || spinLoading}
          >
            {spinLoading ? 'Đang quay...' : 'Spin ngay'}
          </button>
        </div>

        {profile && (
          <div className="card-subsection">
            <div className="subheader">
              <strong>Profile hiện tại</strong>
              <small>Dữ liệu từ getProfile</small>
            </div>
            <ProfileSummary payload={profile} />
            <details className="payload details-block">
              <summary>Xem JSON profile</summary>
              <pre>{JSON.stringify(profile, null, 2)}</pre>
            </details>
          </div>
        )}

        {lastSpin && (
          <div className="card-subsection">
            <div className="subheader">
              <strong>Kết quả spin gần nhất</strong>
              <small>Hiển thị trực quan – mở JSON để xem toàn bộ dữ liệu</small>
            </div>
            <SpinResultView data={lastSpin} />
            <details className="payload details-block">
              <summary>Xem JSON spin</summary>
              <pre>{JSON.stringify(lastSpin, null, 2)}</pre>
            </details>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>🔍 Debug Database</h2>
          <small>Kiểm tra dữ liệu trực tiếp từ CMS API</small>
        </div>
        <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
          <label>
            <span>Debug API URL</span>
            <input
              value={settings.debugApiUrl}
              onChange={(e) => updateSetting('debugApiUrl')(e.target.value)}
              placeholder="https://apicms.web3oktrade.com"
            />
          </label>
          <label>
            <span>Filter Player ID</span>
            <input
              value={debugPlayerIdFilter}
              onChange={(e) => setDebugPlayerIdFilter(e.target.value)}
              placeholder="VD: 62"
            />
          </label>
          <label>
            <span>Filter Game ID</span>
            <input
              value={debugGameIdFilter}
              onChange={(e) => setDebugGameIdFilter(e.target.value)}
              placeholder="VD: 1002"
            />
          </label>
        </div>
        <div className="ws-buttons" style={{ marginBottom: '1rem' }}>
          <button type="button" onClick={fetchDebugPartners} disabled={debugLoading}>
            Lấy Partners
          </button>
          <button type="button" onClick={fetchDebugPlayers} disabled={debugLoading}>
            Lấy Players
          </button>
          <button type="button" onClick={fetchDebugWallets} disabled={debugLoading}>
            Lấy Wallets
          </button>
        </div>

        {debugPartners && debugPartners.length > 0 && (
          <div className="card-subsection">
            <div className="subheader">
              <strong>Partners ({debugPartners.length})</strong>
            </div>
            <div className="debug-table-wrap">
              <table className="debug-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>API Key</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {debugPartners.map((p, i) => (
                    <tr key={String(p['id'] ?? i)}>
                      <td>{String(p['id'] ?? '')}</td>
                      <td>{String(p['name'] ?? '')}</td>
                      <td className="mono">{String(p['api_key'] ?? '').slice(0, 16)}…</td>
                      <td>{p['created_at'] ? new Date(String(p['created_at'])).toLocaleDateString() : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {debugPlayers && debugPlayers.length > 0 && (
          <div className="card-subsection">
            <div className="subheader">
              <strong>Players ({debugPlayers.length})</strong>
            </div>
            <div className="debug-table-wrap">
              <table className="debug-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Partner</th>
                    <th>Username</th>
                    <th>Active</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {debugPlayers.map((p, i) => (
                    <tr key={String(p['id'] ?? i)}>
                      <td>{String(p['id'] ?? '')}</td>
                      <td>{String(p['partner_id'] ?? '')}</td>
                      <td>{String(p['username'] ?? '')}</td>
                      <td>{p['active'] === true ? '✅' : '❌'}</td>
                      <td>{p['created_at'] ? new Date(String(p['created_at'])).toLocaleDateString() : ''}</td>
                      <td>
                        <button
                          type="button"
                          className="ghost"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => fetchDebugPlayerDetail(p['id'] as number)}
                          disabled={debugLoading}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {debugPlayerDetail && (
          <div className="card-subsection">
            <div className="subheader">
              <strong>Chi tiết Player #{String(debugPlayerDetail.player['id'] ?? '')}</strong>
              <button type="button" className="ghost" style={{ fontSize: '0.8rem' }} onClick={() => setDebugPlayerDetail(null)}>
                Đóng
              </button>
            </div>
            <div className="stat-grid small" style={{ marginBottom: '1rem' }}>
              <div className="stat-card compact">
                <span className="stat-icon">🆔</span>
                <div>
                  <p>Player ID</p>
                  <strong>{String(debugPlayerDetail.player['id'] ?? '')}</strong>
                </div>
              </div>
              <div className="stat-card compact">
                <span className="stat-icon">👤</span>
                <div>
                  <p>Username</p>
                  <strong>{String(debugPlayerDetail.player['username'] ?? '')}</strong>
                </div>
              </div>
              <div className="stat-card compact">
                <span className="stat-icon">🤝</span>
                <div>
                  <p>Partner ID</p>
                  <strong>{String(debugPlayerDetail.player['partner_id'] ?? '')}</strong>
                </div>
              </div>
              <div className="stat-card compact">
                <span className="stat-icon">🔒</span>
                <div>
                  <p>Active</p>
                  <strong>{debugPlayerDetail.player['active'] === true ? '✅ Hoạt động' : '❌ Khóa'}</strong>
                </div>
              </div>
            </div>
            {debugPlayerDetail.wallets.length > 0 ? (
              <div className="debug-table-wrap">
                <table className="debug-table">
                  <thead>
                    <tr>
                      <th>Account ID</th>
                      <th>Game ID</th>
                      <th>Username</th>
                      <th>Currency</th>
                      <th>Balance</th>
                      <th>Locked</th>
                      <th>Free Spins</th>
                      <th>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debugPlayerDetail.wallets.map((w, i) => (
                      <tr key={String(w['account_id'] ?? i)}>
                        <td><strong>{String(w['account_id'] ?? '')}</strong></td>
                        <td>{String(w['game_id'] ?? '')}</td>
                        <td>{String(w['username'] ?? '')}</td>
                        <td>{String(w['currency'] ?? '')}</td>
                        <td className="mono">{String(w['balance'] ?? '0')}</td>
                        <td className="mono">{String(w['locked_balance'] ?? '0')}</td>
                        <td>{String(w['free_spins'] ?? '0')}</td>
                        <td>{w['active'] === true ? '✅' : '❌'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Player này chưa có wallet nào.</p>
            )}
          </div>
        )}

        {debugWallets && debugWallets.length > 0 && (
          <div className="card-subsection">
            <div className="subheader">
              <strong>Wallets ({debugWallets.length})</strong>
            </div>
            <div className="debug-table-wrap">
              <table className="debug-table">
                <thead>
                  <tr>
                    <th>Account ID</th>
                    <th>Player ID</th>
                    <th>Game ID</th>
                    <th>Username</th>
                    <th>Currency</th>
                    <th>Balance</th>
                    <th>Locked</th>
                    <th>Free Spins</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {debugWallets.map((w, i) => (
                    <tr key={String(w['id'] ?? i)}>
                      <td><strong>{String(w['id'] ?? '')}</strong></td>
                      <td>{String(w['player_id'] ?? '')}</td>
                      <td>{String(w['game_id'] ?? '')}</td>
                      <td>{String(w['username'] ?? '')}</td>
                      <td>{String(w['currency'] ?? '')}</td>
                      <td className="mono">{String(w['balance'] ?? '0')}</td>
                      <td className="mono">{String(w['locked_balance'] ?? '0')}</td>
                      <td>{String(w['free_spins'] ?? '0')}</td>
                      <td>{w['active'] === true ? '✅' : '❌'}</td>
                      <td>
                        <button
                          type="button"
                          className="ghost danger"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => deleteWallet(w['id'] as number)}
                          disabled={debugLoading}
                        >
                          🗑️ Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(debugPartners === null && debugPlayers === null && debugWallets === null) && (
          <p className="muted">Bấm nút để tải dữ liệu debug từ CMS API.</p>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Logs</h2>
          <button type="button" onClick={clearLogs} className="ghost" disabled={!logs.length}>
            Xóa log
          </button>
        </div>
        <div className="log-list">
          {logs.length === 0 && <p className="muted">Chưa có log</p>}
          {logs.map((entry) => (
            <div key={entry.id} className={`log ${entry.level}`}>
              <span className="time">{entry.timestamp}</span>
              <span className="text">{entry.message}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default App
