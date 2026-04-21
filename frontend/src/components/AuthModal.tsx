import { useState, useEffect } from 'react'

interface AuthProps {
  onLogin: (token: string, user: any) => void
  onClose: () => void
}

export default function AuthModal({ onLogin, onClose }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const API_URL = 'https://kaizennum-production.up.railway.app'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const refCode = params.get('ref')
    if (refCode) {
      localStorage.setItem('kaizen_referral_code', refCode)
    }
    const googleToken = params.get('token')
    const googleAuth = params.get('google_auth')
    if (googleToken && googleAuth === '1') {
      const userData = {
        id: params.get('user_id') || '',
        email: params.get('email') || '',
        name: params.get('name') || '',
        tier: params.get('tier') || 'free'
      }
      localStorage.setItem('kaizen_token', googleToken)
      localStorage.setItem('kaizen_user', JSON.stringify(userData))
      onLogin(googleToken, userData)
      onClose()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint = mode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register'
      const referred_by = localStorage.getItem('kaizen_referral_code')
      const body = mode === 'login' 
        ? { email, password }
        : { email, password, name, referred_by: referred_by || undefined }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.detail?.includes('verificar')) {
          throw new Error('Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.')
        }
        throw new Error(data.detail || 'Error en la autenticación')
      }

      const data = await res.json()
      localStorage.setItem('kaizen_token', data.token)
      localStorage.setItem('kaizen_user', JSON.stringify(data.user))
      onLogin(data.token, data.user)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSuccess = () => {
    if (mode === 'register') {
      setSuccess(true)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              mode === 'login' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              mode === 'register' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Registrarse
          </button>
        </div>

        <button
          type="button"
          onClick={async () => {
            try {
              const res = await fetch(`${API_URL}/api/v1/auth/google`)
              const data = await res.json()
              if (data.redirect_url) {
                window.location.href = data.redirect_url
              }
            } catch (e) {
              console.error('Error starting Google auth:', e)
            }
          }}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.96 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.96 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">o</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tu nombre"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm">
              ¡Cuenta creada! Revisa tu email para verificar tu cuenta y comenzar a usar KAIZEN Protect.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Cargando...' : success ? 'Revisa tu email' : mode === 'login' ? 'Entrar' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200 text-center text-sm text-slate-500">
          <p>Al registrarte aceptas nuestros</p>
          <a href="#" className="text-blue-600 hover:underline">Términos y Condiciones</a>
        </div>
      </div>
    </div>
  )
}
