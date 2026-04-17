import { useState, useEffect } from 'react'
import HistoryPanel from './HistoryPanel'

interface User {
  id: string
  email: string
  name: string
  tier: string
}

interface SubscriptionStatus {
  authenticated: boolean
  tier: string
  status: string
  features: string[]
  remaining_analyses: number
}

interface DashboardProps {
  user: User
  onLogout: () => void
}

const PLANS = [
  {
    key: 'pro_monthly',
    name: 'Pro',
    price: 7,
    interval: 'mes',
    features: ['Análisis ilimitados', 'Modo Abuela', 'Historial', 'Exportar PDF']
  },
  {
    key: 'pro_yearly',
    name: 'Pro Anual',
    price: 60,
    interval: 'año',
    features: ['Análisis ilimitados', 'Modo Abuela', 'Historial', 'Exportar PDF', '2 meses gratis']
  },
  {
    key: 'business_monthly',
    name: 'Business',
    price: 19,
    interval: 'mes',
    features: ['Todo lo de Pro', 'API Access', 'Dashboard equipo', 'SSO corporativo']
  }
]

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [_status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPlans, setShowPlans] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [apiKeys, setApiKeys] = useState<{id: string; key: string; name: string; created: string; last_used?: string; requests?: number}[]>([])
  const [teamMembers, setTeamMembers] = useState<{id: string; name: string; email: string; role: string}[]>([])
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [newApiKeyName, setNewApiKeyName] = useState('')
  const [referrals, setReferrals] = useState<{
    referral_code: string
    referrals_count: number
    converted_count: number
    bonus_months: number
    referral_link: string
  } | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    fetchStatus()
    if (user.tier === 'business') {
      fetchApiKeysReal()
      fetchTeamMembersReal()
    }
    if (user.tier === 'pro' || user.tier === 'business') {
      fetchReferrals()
    }
  }, [user.tier])

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('kaizen_token')
      const res = await fetch(`${API_URL}/api/v1/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (e) {
      console.error('Error fetching status:', e)
    }
  }

  const fetchApiKeysReal = async () => {
    try {
      const token = localStorage.getItem('kaizen_token')
      const res = await fetch(`${API_URL}/api/v1/api-keys`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data)
      }
    } catch (e) {
      console.error('Error fetching api keys:', e)
    }
  }

  const fetchTeamMembersReal = async () => {
    try {
      const token = localStorage.getItem('kaizen_token')
      const res = await fetch(`${API_URL}/api/v1/team`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setTeamMembers(data)
      }
    } catch (e) {
      console.error('Error fetching team:', e)
    }
  }

  const fetchReferrals = async () => {
    try {
      const token = localStorage.getItem('kaizen_token')
      const res = await fetch(`${API_URL}/api/v1/referrals`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setReferrals(data)
      }
    } catch (e) {
      console.error('Error fetching referrals:', e)
    }
  }

  const handleCopyLink = async () => {
    if (referrals?.referral_link) {
      await navigator.clipboard.writeText(referrals.referral_link)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const handleShareWhatsApp = () => {
    if (referrals?.referral_link) {
      const text = `Te paso esta app para detectar estafas por WhatsApp, me ha salvado varias veces 👇\n\n${referrals.referral_link}`
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`
      window.open(url, '_blank')
    }
  }

  const handleCreateApiKey = async () => {
    if (!newApiKeyName.trim()) return
    try {
      const token = localStorage.getItem('kaizen_token')
      const res = await fetch(`${API_URL}/api/v1/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newApiKeyName })
      })
      if (res.ok) {
        const data = await res.json()
        setNewApiKeyName('')
        setShowApiKeyModal(false)
        alert(`API Key creada:\n${data.api_key}\n\nGuarda esta clave, no se mostrará de nuevo.`)
        fetchApiKeysReal()
      }
    } catch (e) {
      alert('Error al crear API Key')
    }
  }

  const handleDeleteApiKey = async (keyToDelete: string) => {
    if (!confirm('¿Eliminar esta API Key?')) return
    try {
      const token = localStorage.getItem('kaizen_token')
      const res = await fetch(`${API_URL}/api/v1/api-keys/${keyToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        fetchApiKeysReal()
      }
    } catch (e) {
      alert('Error al eliminar API Key')
    }
  }

  const handleInviteTeamMember = async () => {
    const email = prompt('Ingresa el email del nuevo miembro:')
    if (!email) return

    const name = prompt('Ingresa el nombre del nuevo miembro:')
    if (!name) return

    try {
      const token = localStorage.getItem('kaizen_token')
      const res = await fetch(`${API_URL}/api/v1/team/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email })
      })
      if (res.ok) {
        alert(`Invitación enviada a ${email}`)
        fetchTeamMembersReal()
      }
    } catch (e) {
      alert('Error al invitar miembro')
    }
  }

  const handleRemoveTeamMember = async (memberId: string) => {
    if (!confirm('¿Eliminar este miembro del equipo?')) return
    try {
      const token = localStorage.getItem('kaizen_token')
      const res = await fetch(`${API_URL}/api/v1/team/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        fetchTeamMembersReal()
      }
    } catch (e) {
      alert('Error al eliminar miembro')
    }
  }

  const handleSubscribe = async (priceKey: string) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('kaizen_token')
      const res = await fetch(`${API_URL}/api/v1/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ price_key: priceKey })
      })

      if (res.ok) {
        const data = await res.json()
        window.location.href = data.url
      } else {
        const data = await res.json()
        alert(data.detail || 'Error al crear checkout')
      }
    } catch (e) {
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('kaizen_token')
      const res = await fetch(`${API_URL}/api/v1/subscription/portal`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        window.location.href = data.url
      }
    } catch (e) {
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('kaizen_token')
    localStorage.removeItem('kaizen_user')
    localStorage.removeItem('kaizen_analisis_free')
    localStorage.removeItem('kaizen_ad_watched')
    onLogout()
  }

  const getTierBadge = (tier: string) => {
    const badges = {
      free: { bg: 'bg-slate-200', text: 'text-slate-700', label: 'Free', gradient: 'from-slate-600 to-slate-700' },
      pro: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pro', gradient: 'from-blue-600 to-blue-700' },
      business: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Business', gradient: 'from-purple-600 to-purple-700' }
    }
    const badge = badges[tier as keyof typeof badges] || badges.free
    return { bg: badge.bg, text: badge.text, label: badge.label, gradient: badge.gradient }
  }

  const tierBadge = getTierBadge(user.tier)

  const renderProFeatures = () => (
    <div className="space-y-4">
      <div className="bg-emerald-50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-emerald-600 text-xl">✓</span>
          <h4 className="font-semibold text-slate-900">Plan Pro Activo</h4>
        </div>
        <p className="text-sm text-slate-600">
          Tienes acceso ilimitado a todas las funciones de análisis.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">∞</div>
          <div className="text-sm text-slate-500">Análisis ilimitados</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">4</div>
          <div className="text-sm text-slate-500">Funciones activas</div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-4">
        <h5 className="font-semibold text-slate-900 mb-3">Tus funciones</h5>
        <ul className="space-y-2">
          <li className="flex items-center gap-2 text-sm">
            <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">✓</span>
            Análisis de texto e imágenes
          </li>
          <li className="flex items-center gap-2 text-sm">
            <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">✓</span>
            Modo Abuela (explicaciones simples)
          </li>
          <li className="flex items-center gap-2 text-sm">
            <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">✓</span>
            Historial de análisis
          </li>
          <li className="flex items-center gap-2 text-sm">
            <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">✓</span>
            Exportar reportes PDF
          </li>
        </ul>
      </div>

      <div className="border-b border-slate-200 flex">
        <button
          onClick={() => setActiveTab('features')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'features' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
        >
          Funciones
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
        >
          Historial
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'referrals' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
        >
          Invitar
        </button>
      </div>

      {activeTab === 'history' && (
        <HistoryPanel token={localStorage.getItem('kaizen_token') || ''} />
      )}

      {activeTab === 'features' && (
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-sm text-slate-600 text-center">
            Todas las funciones de Pro están activas y disponibles en la página principal.
          </p>
        </div>
      )}

      {activeTab === 'referrals' && referrals && (
        <div className="space-y-4">
          <div className="bg-emerald-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🎁</span>
              <h4 className="font-semibold text-slate-900">Invita y gana</h4>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Por cada amigo que se suscriba a Pro, ganas 1 mes gratis.
            </p>

            <div className="bg-white rounded-lg p-3 mb-4">
              <p className="text-xs text-slate-500 mb-1">Tu link de invitación</p>
              <code className="text-sm text-blue-600 break-all">{referrals.referral_link}</code>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors min-h-[48px]"
              >
                {copiedLink ? '✓ Copiado!' : '📋 Copiar link'}
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-lg text-sm transition-colors min-h-[48px]"
              >
                💬 WhatsApp
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-blue-600">{referrals.referrals_count}</div>
              <div className="text-xs text-slate-500">Invitados</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-emerald-600">{referrals.converted_count}</div>
              <div className="text-xs text-slate-500">Se suscribieron</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-purple-600">{referrals.bonus_months}</div>
              <div className="text-xs text-slate-500">Meses gratis</div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleManageSubscription}
        disabled={loading}
        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
      >
        Gestionar Suscripción
      </button>
    </div>
  )

  const renderBusinessFeatures = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🏢</span>
          <h4 className="font-semibold">Panel Business</h4>
        </div>
        <p className="text-sm text-purple-100">
          Acceso completo a API, gestión de equipo y funciones enterprise.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">∞</div>
          <div className="text-sm text-slate-500">Análisis ilimitados</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">{apiKeys.length}</div>
          <div className="text-sm text-slate-500">API Keys</div>
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'overview' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500'}`}
        >
          Resumen
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'history' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500'}`}
        >
          Historial
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'api' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500'}`}
        >
          API Access
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'team' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500'}`}
        >
          Equipo
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'referrals' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500'}`}
        >
          Invitar
        </button>
      </div>

      {activeTab === 'history' && (
        <HistoryPanel token={localStorage.getItem('kaizen_token') || ''} />
      )}

      {activeTab === 'overview' && (
        <div className="space-y-3">
          <div className="bg-purple-50 rounded-xl p-4">
            <h5 className="font-semibold text-slate-900 mb-3">Funciones Business</h5>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">✓</span>
                Todo lo de Pro
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">✓</span>
                API Access para integraciones
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">✓</span>
                Dashboard de equipo
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">✓</span>
                SSO corporativo (próximamente)
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">✓</span>
                SLA 99.9% garantizado
              </li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="font-semibold text-slate-900">API Keys</h5>
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="text-sm bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700"
            >
              + Nueva Key
            </button>
          </div>

          {apiKeys.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <p className="text-3xl mb-2">🔑</p>
              <p className="text-sm">No tienes API Keys creadas</p>
              <p className="text-xs">Crea una para integrar KAIZEN Protect en tu sistema</p>
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((apiKey, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{apiKey.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{apiKey.key}</p>
                      {apiKey.last_used && (
                        <p className="text-xs text-slate-400">Último uso: {new Date(apiKey.last_used).toLocaleDateString('es-CO')}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteApiKey(apiKey.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-slate-100 rounded-xl p-4 text-xs">
            <p className="font-semibold mb-2">Ejemplo de uso:</p>
            <code className="text-slate-600 block">
              curl -X POST https://api.kaizenprotect.com/v1/analizar {'\\'}<br/>
              -H &quot;Authorization: Bearer TU_API_KEY&quot; {'\\'}<br/>
              -d &apos;&lbrace;&quot;texto&quot;: &quot;tu mensaje aqui&quot;&rbrace;&apos;
            </code>
          </div>
        </div>
      )}

      {activeTab === 'referrals' && renderBusinessReferrals()}

      {activeTab === 'team' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="font-semibold text-slate-900">Miembros del equipo</h5>
            <button
              onClick={handleInviteTeamMember}
              className="text-sm bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700"
            >
              + Invitar
            </button>
          </div>

          <div className="space-y-2">
            {teamMembers.map((member, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-bold">{member.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{member.name}</p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  member.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-600'
                }`}>
                  {member.role === 'admin' ? 'Admin' : 'Member'}
                </span>
                {member.role !== 'admin' && (
                  <button
                    onClick={() => handleRemoveTeamMember(member.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleManageSubscription}
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-xl transition-colors"
      >
        Gestionar Suscripción Enterprise
      </button>
    </div>
  )

  const renderBusinessReferrals = () => {
    if (!referrals) return null
    return (
      <div className="space-y-4">
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎁</span>
            <h4 className="font-semibold text-slate-900">Invita y gana</h4>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Por cada amigo que se suscrito a Pro, ganas 1 mes gratis.
          </p>

          <div className="bg-white rounded-lg p-3 mb-4">
            <p className="text-xs text-slate-500 mb-1">Tu link de invitación</p>
            <code className="text-sm text-blue-600 break-all">{referrals.referral_link}</code>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors min-h-[48px]"
            >
              {copiedLink ? '✓ Copiado!' : '📋 Copiar link'}
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-lg text-sm transition-colors min-h-[48px]"
            >
              💬 WhatsApp
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="text-2xl font-bold text-blue-600">{referrals.referrals_count}</div>
            <div className="text-xs text-slate-500">Invitados</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="text-2xl font-bold text-emerald-600">{referrals.converted_count}</div>
            <div className="text-xs text-slate-500">Se suscribieron</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="text-2xl font-bold text-purple-600">{referrals.bonus_months}</div>
            <div className="text-xs text-slate-500">Meses gratis</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className={`bg-gradient-to-r ${tierBadge.gradient} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-white font-semibold">{user.name}</h3>
              <p className="text-white/70 text-sm">{user.email}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierBadge.bg} ${tierBadge.text}`}>
            {tierBadge.label}
          </span>
        </div>
      </div>

      <div className="p-6">
        {user.tier === 'free' ? (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="font-semibold text-slate-900 mb-2">🔓 Desbloquea todo el potencial</h4>
              <p className="text-sm text-slate-600 mb-4">
                Con Pro obtienes análisis ilimitados, modo abuela y más funciones exclusivas.
              </p>
              <button
                onClick={() => setShowPlans(!showPlans)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Ver Planes
              </button>
            </div>

            {showPlans && (
              <div className="space-y-3">
                {PLANS.map((plan) => (
                  <div key={plan.key} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-semibold text-slate-900">{plan.name}</h5>
                        <p className="text-2xl font-bold text-blue-600">
                          ${plan.price}
                          <span className="text-sm font-normal text-slate-500">/{plan.interval}</span>
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-1 mb-4">
                      {plan.features.map((f, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                          <span className="text-emerald-500">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleSubscribe(plan.key)}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Cargando...' : `Suscribirse a ${plan.name}`}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : user.tier === 'pro' ? (
          renderProFeatures()
        ) : (
          renderBusinessFeatures()
        )}

        <button
          onClick={handleLogout}
          className="w-full mt-4 text-red-600 hover:text-red-700 font-medium py-2 text-sm"
        >
          Cerrar Sesión
        </button>
      </div>

      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Crear API Key</h3>
              <button onClick={() => setShowApiKeyModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <input
              type="text"
              value={newApiKeyName}
              onChange={(e) => setNewApiKeyName(e.target.value)}
              placeholder="Nombre de la API Key (ej: Production, Dev)"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
            />
            <button
              onClick={handleCreateApiKey}
              disabled={!newApiKeyName.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              Crear Key
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
