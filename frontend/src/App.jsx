import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, Link, useLocation, useNavigate } from 'react-router-dom'

const API_BASE_URL = 'http://localhost:3000'
const AUTH_STORAGE_KEY = 'cliconnect.isAuthed'

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || 'Something went wrong.'
    throw new Error(message)
  }

  return payload
}

function useAuthState() {
  const [isAuthed, setIsAuthed] = useState(() => localStorage.getItem(AUTH_STORAGE_KEY) === 'true')

  const markAuthed = () => {
    localStorage.setItem(AUTH_STORAGE_KEY, 'true')
    setIsAuthed(true)
  }

  const clearAuth = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setIsAuthed(false)
  }

  return { isAuthed, markAuthed, clearAuth }
}

function App() {
  const auth = useAuthState()

  return (
    <div className="min-h-screen bg-radial-fade text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <Header isAuthed={auth.isAuthed} onLogout={() => auth.clearAuth()} />
        <main className="flex flex-1 items-center justify-center py-8">
          <Routes>
            <Route
              path="/"
              element={<HomeRedirect isAuthed={auth.isAuthed} />}
            />
            <Route
              path="/login"
              element={<AuthPage mode="login" onAuthed={auth.markAuthed} isAuthed={auth.isAuthed} />}
            />
            <Route
              path="/signup"
              element={<AuthPage mode="signup" onAuthed={auth.markAuthed} isAuthed={auth.isAuthed} />}
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthed={auth.isAuthed}>
                  <Dashboard onLogout={auth.clearAuth} />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function Header({ isAuthed, onLogout }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await requestJson('/auth/logout', { method: 'POST' })
    } finally {
      onLogout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 shadow-glow backdrop-blur-xl">
      <Link to="/" className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-400/15 text-cyan-200 ring-1 ring-inset ring-cyan-300/20">
          <span className="text-lg font-semibold tracking-tight">C</span>
        </div>
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Cliconnect</p>
          <p className="text-sm text-slate-300">Session login and API key dashboard</p>
        </div>
      </Link>

      <div className="flex items-center gap-3">
        {isAuthed ? (
          <button
            onClick={handleLogout}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
          >
            Logout
          </button>
        ) : (
          <Link
            to="/login"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  )
}

function HomeRedirect({ isAuthed }) {
  return <Navigate to={isAuthed ? '/dashboard' : '/login'} replace />
}

function ProtectedRoute({ isAuthed, children }) {
  if (!isAuthed) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AuthPage({ mode, onAuthed, isAuthed }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isSignup = mode === 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthed) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthed, navigate])

  const title = useMemo(() => (isSignup ? 'Create your account' : 'Welcome back'), [isSignup])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload = isSignup
        ? {
            name: form.name,
            email: form.email,
            password: form.password,
          }
        : {
            email: form.email,
            password: form.password,
          }

      await requestJson(isSignup ? '/auth/signup' : '/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      onAuthed()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-glow backdrop-blur-xl">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b border-white/10 p-8 lg:border-b-0 lg:border-r lg:border-white/10 lg:p-10">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-cyan-200/80">Secure access</p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            Sign in with the existing session backend, then generate an API key from the protected dashboard.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              ['Session cookies', 'Uses `credentials: "include"` so the existing session stays active.'],
              ['One-time API key', 'Your key is shown once, with a copy action and clear warning.'],
              ['Clean errors', 'Backend messages are surfaced directly without extra noise.'],
              ['Responsive UI', 'Works cleanly across desktop and mobile layouts.'],
            ].map(([label, text]) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 lg:p-10">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{isSignup ? 'Signup' : 'Login'}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{isSignup ? 'Create account' : 'Login to continue'}</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              Session ready
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignup ? (
              <Field
                label="Name"
                value={form.name}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="Your name"
              />
            ) : null}
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) => setForm((current) => ({ ...current, email: value }))}
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={(value) => setForm((current) => ({ ...current, password: value }))}
              placeholder="••••••••"
            />

            {error ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Please wait...' : isSignup ? 'Create account' : 'Login'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
            <Link
              to={isSignup ? '/login' : '/signup'}
              state={location.state}
              className="font-medium text-cyan-200 underline decoration-cyan-300/40 underline-offset-4"
            >
              {isSignup ? 'Login' : 'Sign up'}
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
      />
    </label>
  )
}

function Dashboard({ onLogout }) {
  const navigate = useNavigate()
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copyState, setCopyState] = useState('')

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setCopyState('')

    try {
      const payload = await requestJson('/auth/generate-api-key', { method: 'POST' })
      const generatedKey = payload?.Key || ''
      setApiKey(generatedKey)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopyState('Copied to clipboard')
    } catch {
      setCopyState('Copy failed. Select and copy it manually.')
    }
  }

  const handleLogout = async () => {
    try {
      await requestJson('/auth/logout', { method: 'POST' })
    } finally {
      onLogout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <section className="w-full max-w-6xl space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-glow backdrop-blur-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-200/80">Protected dashboard</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Session is active.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Generate an API key when you need one. The backend returns it once, and this page does not persist it.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Generating...' : 'Generate API Key'}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-glow backdrop-blur-xl sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">API key vault</h2>
              <p className="mt-1 text-sm text-slate-400">The key appears once after generation.</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              One-time reveal
            </div>
          </div>

          {apiKey ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/8 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Generated key</p>
                <div className="mt-3 break-all rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-4 font-mono text-sm text-cyan-100">
                  {apiKey}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleCopy}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10"
                >
                  Copy key
                </button>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
                  This key will not be shown again. Copy it now and store it securely.
                </div>
              </div>

              {copyState ? <p className="text-sm text-emerald-300">{copyState}</p> : null}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/5 p-6 text-sm leading-7 text-slate-300">
              No key has been generated in this session yet. Use the button above to create one, then copy it before leaving.
            </div>
          )}

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <InfoCard
            title="Backend contract"
            body="The UI uses the existing login, signup, logout, generate-api-key, and verify-key routes exactly as they are."
          />
          <InfoCard
            title="Cookie session"
            body="All fetch calls include credentials so the express-session cookie is sent automatically."
          />
          <InfoCard
            title="Safety note"
            body="The app does not re-show a generated key after you navigate away or refresh the page."
          />
        </div>
      </div>
    </section>
  )
}

function InfoCard({ title, body }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-400">{body}</p>
    </div>
  )
}

export default App