import { useState, useCallback, useRef, useEffect } from 'react'
import AuthModal from './components/AuthModal'
import VerifyPage from './components/VerifyPage'
import Dashboard from './components/Dashboard'
import ShareResult from './components/ShareResult'
import OnboardingModal from './components/OnboardingModal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type Seccion = 'demo' | 'pricing' | 'about'

interface User {
  id: string
  email: string
  name: string
  tier: string
  onboarding_completed?: boolean
  onboarding_answers?: { purpose?: string; channel?: string }
}

function scrollToSection(id: string) {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function isVerifyPage() {
  return window.location.pathname === '/verify' || window.location.search.includes('verify=true')
}

interface Resultado {
  veredicto: 'SEGURO' | 'PRECAUCION' | 'ALERTA' | 'PELIGRO';
  confianza: number;
  explicacion: string;
  evidencia: string[];
  ley_infringida: string | null;
  que_hacer: string[];
  tiempo_ms: number;
  modo?: string;
  is_demo?: boolean;
  remaining?: number;
}

const COLORS = {
  SEGURO: { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', icon: '●', label: 'SEGURO', iconBg: 'bg-emerald-100' },
  PRECAUCION: { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-700', icon: '◐', label: 'PRECAUCIÓN', iconBg: 'bg-yellow-100' },
  ALERTA: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700', icon: '◑', label: 'ALERTA', iconBg: 'bg-orange-100' },
  PELIGRO: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700', icon: '○', label: 'PELIGRO', iconBg: 'bg-red-100' },
}

const TIPOS_PERMITIDOS = {
  texto: ['.txt', '.md', '.log'],
  imagen: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  documento: ['.pdf']
}

const LIMITES = {
  texto: 10 * 1024 * 1024,
  imagen: 5 * 1024 * 1024,
  documento: 10 * 1024 * 1024
}

const STATS = [
  { numero: '50K+', label: 'Estafas Detectadas' },
  { numero: '98%', label: 'Precisión' },
  { numero: '<3s', label: 'Tiempo de Respuesta' },
  { numero: '24/7', label: 'Monitoreo' },
]

const FEATURES = [
  { icon: '🛡️', title: 'Análisis IA Avanzado', desc: 'Detecta patrones de manipulación usando modelos entrenados específicamente para LatAm' },
  { icon: '📱', title: 'Multi-Formato', desc: 'Analiza textos, imágenes de WhatsApp, emails, capturas de pantalla y PDFs' },
  { icon: '👵', title: 'Modo Abuela', desc: 'Explicaciones ultra-simples para personas mayores de 60 años' },
  { icon: '⚖️', title: 'Base Legal', desc: 'Referencias a leyes colombianas vigentes para dar peso legal a los reportes' },
  { icon: '🔒', title: 'Privacidad Total', desc: 'Tus datos se eliminan inmediatamente. No almacenamos mensajes.' },
  { icon: '🌎', title: 'Contexto Local', desc: 'Conocimiento de estafas específicas de Colombia y Latinoamérica' },
]

const TESTIMONIALS = [
  { nombre: 'María González', rol: 'Abogada Consumerista', texto: 'Uso KAIZEN Protect para verificar contratos sospechosos antes de asesorar a mis clientes. Excelente herramienta.' },
  { nombre: 'Carlos Mendoza', rol: 'Empleado Público', texto: 'Mi mamá casi cae en una estafa. Ahora verifica todo con KAIZEN Protect. Muy agradecido.' },
  { nombre: 'Ana Rodríguez', rol: 'Gerente de Banco', texto: 'Lo recomiendo a todos mis clientes. La tasa de consultas bajó significativamente.' },
]

function App() {
  const [texto, setTexto] = useState('')
  const [modo, setModo] = useState<'normal' | 'abuela'>('normal')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [archivoInfo, setArchivoInfo] = useState<{ nombre: string; tipo: string; tamano: string } | null>(null)
  const [previewImagen, setPreviewImagen] = useState<string | null>(null)
  const [seccion, setSeccion] = useState<Seccion>('demo')
  const [showAd, setShowAd] = useState(false)
  const [analisisFree, setAnalisisFree] = useState(0)
  const [analisisCount, setAnalisisCount] = useState(0)
  const [adWatched, setAdWatched] = useState(false)
  const [countdown, setCountdown] = useState(15)
  const [showAuth, setShowAuth] = useState(false)
  const [showUserDashboard, setShowUserDashboard] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (isVerifyPage()) return
    const storedUser = localStorage.getItem('kaizen_user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  if (isVerifyPage()) {
    return <VerifyPage />
  }
  
  const ANALISIS_LIBRES = 3
  const AD_DURATION = 15

  useEffect(() => {
    const stored = localStorage.getItem('kaizen_analisis_free')
    const adWatchedStored = localStorage.getItem('kaizen_ad_watched')
    const countStored = localStorage.getItem('kaizen_analisis')
    if (stored) setAnalisisFree(parseInt(stored))
    if (adWatchedStored === 'true') setAdWatched(true)
    if (countStored) setAnalisisCount(parseInt(countStored))
  }, [])

  useEffect(() => {
    if (showAd && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [showAd, countdown])

  const handleLogin = (_token: string, userData: User) => {
    setUser(userData)
    setShowAuth(false)
    if (!userData.onboarding_completed) {
      setShowOnboarding(true)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setShowUserDashboard(false)
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    if (user) {
      const updatedUser = { ...user, onboarding_completed: true }
      setUser(updatedUser)
      localStorage.setItem('kaizen_user', JSON.stringify(updatedUser))
      if (user.onboarding_answers?.purpose === 'padres') {
        setModo('abuela')
      }
    }
  }

  const handleNavClick = (section: Seccion) => {
    setSeccion(section)
    setTimeout(() => scrollToSection(section), 100)
  }

  const scrollToDemo = () => {
    scrollToSection('demo')
  }
  const inputRef = useRef<HTMLInputElement>(null)

  const formatearTamano = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const obtenerTipoArchivo = (archivo: File): string => {
    const ext = '.' + archivo.name.split('.').pop()?.toLowerCase()
    if (TIPOS_PERMITIDOS.texto.includes(ext)) return 'texto'
    if (TIPOS_PERMITIDOS.imagen.includes(ext)) return 'imagen'
    if (TIPOS_PERMITIDOS.documento.includes(ext)) return 'documento'
    return 'desconocido'
  }

  const procesarArchivo = async (archivo: File) => {
    const tipo = obtenerTipoArchivo(archivo)
    const limite = LIMITES[tipo as keyof typeof LIMITES]

    if (tipo === 'desconocido') {
      setError('Tipo de archivo no soportado. Usa: TXT, MD, PNG, JPG, PDF')
      return
    }

    if (archivo.size > limite) {
      setError(`Archivo muy grande. Máximo: ${formatearTamano(limite)}`)
      return
    }

    setArchivoInfo({ nombre: archivo.name, tipo, tamano: formatearTamano(archivo.size) })

    if (tipo === 'texto') {
      setTexto(await archivo.text())
      setPreviewImagen(null)
    } else if (tipo === 'imagen') {
      const base64 = await convertirABase64(archivo)
      setPreviewImagen(base64)
      setTexto(`[Imagen adjunta: ${archivo.name}]`)
    } else {
      setTexto(`[Documento PDF adjunto: ${archivo.name}]`)
      setPreviewImagen(null)
    }
  }

  const convertirABase64 = (archivo: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(archivo)
    })
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === "dragenter" || e.type === "dragover")
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setError('')
    if (e.dataTransfer.files?.[0]) procesarArchivo(e.dataTransfer.files[0])
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    if (e.target.files?.[0]) procesarArchivo(e.target.files[0])
  }

  const analizar = async () => {
    if (!texto.trim() && !archivoInfo) return
    
    if (analisisFree >= ANALISIS_LIBRES && !adWatched) {
      setShowAd(true)
      return
    }
    
    setLoading(true)
    setError('')
    setResultado(null)

    try {
      const endpoint = modo === 'abuela' ? '/api/v1/analizar/abuela' : '/api/v1/analizar'
      let body: any = { texto }

      if (archivoInfo?.tipo === 'imagen' && previewImagen) {
        body = { texto, imagen_base64: previewImagen }
      }

      const token = localStorage.getItem('kaizen_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Error en el análisis')
      }

      const data = await res.json()
      setResultado(data)

      if (!user) {
        if (data.is_demo) {
          setAnalisisFree(1)
        } else {
          const newCount = analisisCount + 1
          const newFreeCount = analisisFree + 1
          setAnalisisCount(newCount)
          setAnalisisFree(newFreeCount)
          localStorage.setItem('kaizen_analisis', newCount.toString())
          localStorage.setItem('kaizen_analisis_free', newFreeCount.toString())
        }
      }
      
      if (data.is_demo || data.remaining === 0) {
          setAdWatched(false)
          localStorage.setItem('kaizen_ad_watched', 'false')
        } else if (!user) {
          if (newFreeCount >= ANALISIS_LIBRES) {
            setAdWatched(false)
            localStorage.setItem('kaizen_ad_watched', 'false')
          }
        }

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error en el análisis')
    } finally {
      setLoading(false)
    }
  }

  const closeAdAndContinue = () => {
    setAdWatched(true)
    localStorage.setItem('kaizen_ad_watched', 'true')
    setShowAd(false)
    setCountdown(AD_DURATION)
    setTimeout(() => {
      analizar()
    }, 100)
  }

  const skipAd = () => {
    setShowAd(false)
  }

  const limpiar = () => {
    setTexto('')
    setArchivoInfo(null)
    setPreviewImagen(null)
    setResultado(null)
    setError('')
  }

  const estilo = resultado ? COLORS[resultado.veredicto] : null

return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 md:px-6 md:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 md:w-3 md:h-3 bg-red-400 rounded-full"></div>
              <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-2 h-2 md:w-3 md:h-3 bg-emerald-400 rounded-full"></div>
            </div>
            <span className="text-white/80 text-xs md:text-sm">KAIZEN</span>
            {user && (
              <span className="md:hidden text-white/60 text-xs uppercase font-bold ml-1">{user.tier}</span>
            )}
          </div>

          {/* Right: Mobile Menu Toggle + User */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile: Hamburger */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-white/80 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => handleNavClick('demo')} className="text-sm font-medium text-white/80 hover:text-white transition-colors">Demo</button>
              <button onClick={() => handleNavClick('pricing')} className="text-sm font-medium text-white/80 hover:text-white transition-colors">Precios</button>
              <button onClick={() => handleNavClick('about')} className="text-sm font-medium text-white/80 hover:text-white transition-colors">Nosotros</button>
            </nav>

            {user ? (
              <button onClick={() => setShowUserDashboard(true)} className="flex items-center gap-1 md:gap-2 bg-white/20 text-white px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium hover:bg-white/30 transition-colors">
                <span className="w-5 h-5 md:w-6 md:h-6 bg-white text-blue-600 rounded-full flex items-center justify-center text-[10px] md:text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden md:inline">{user.name.split(' ')[0]}</span>
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)} className="bg-white text-blue-600 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium hover:bg-blue-50 transition-colors">
                Iniciar
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="md:hidden absolute left-0 right-0 top-full bg-blue-700 border-t border-white/10 py-4 px-4 space-y-3 shadow-lg">
            <button onClick={() => { handleNavClick('demo'); setShowMobileMenu(false); }} className="block w-full text-left text-white/80 text-sm py-2">Demo</button>
            <button onClick={() => { handleNavClick('pricing'); setShowMobileMenu(false); }} className="block w-full text-left text-white/80 text-sm py-2">Precios</button>
            <button onClick={() => { handleNavClick('about'); setShowMobileMenu(false); }} className="block w-full text-left text-white/80 text-sm py-2">Nosotros</button>
            <div className="border-t border-white/20 pt-3">
              {user ? (
                <button onClick={() => { setShowUserDashboard(true); setShowMobileMenu(false); }} className="block w-full text-left text-white text-sm py-2">Mi Cuenta</button>
              ) : (
                <button onClick={() => { setShowAuth(true); setShowMobileMenu(false); }} className="block w-full text-left text-white text-sm py-2">Iniciar Sesión</button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-sm">Protegiendo a {analisisCount.toLocaleString()} personas en LatAm</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Detecta estafas antes de que sea
              <span className="text-blue-400"> demasiado tarde</span>
            </h2>

            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              IA especializada en el contexto latinoamericano que analiza cualquier mensaje, email o imagen y te dice en segundos si es seguro o una trampa.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                <span className="text-sm">{ANALISIS_LIBRES} análisis gratis</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                <span className="text-sm">Sin registro requerido</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                <span className="text-sm">Tus datos no se almacenan</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {STATS.map((stat, i) => (
                <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4">
                  <div className="text-2xl md:text-3xl font-bold text-blue-400">{stat.numero}</div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Demo */}
      <section id="demo" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6 md:gap-12 items-start">
            {/* Analyzer Card - Mobile First */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 md:px-6 md:py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 md:w-3 md:h-3 bg-red-400 rounded-full"></div>
                      <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-2 h-2 md:w-3 md:h-3 bg-emerald-400 rounded-full"></div>
                    </div>
                    <span className="text-white/80 text-xs md:text-sm">KAIZEN Analyzer</span>
                  </div>
                  <div className="bg-white/20 px-2 py-1 rounded-full">
                    <span className="text-white text-[10px] md:text-xs font-medium">
                      {ANALISIS_LIBRES - analisisFree > 0 ? `${ANALISIS_LIBRES - analisisFree} análisis` : 'Sin límite'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 md:p-6">
                {/* Mode Selector - TouchFriendly */}
                <div className="flex gap-2 mb-4 md:mb-6">
                  <button
                    onClick={() => setModo('normal')}
                    className={`flex-1 min-h-[48px] py-3 px-3 md:px-4 rounded-xl font-medium text-sm md:text-base transition-all ${
                      modo === 'normal'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Estándar
                  </button>
                  <button
                    onClick={() => setModo('abuela')}
                    className={`flex-1 min-h-[48px] py-3 px-3 md:px-4 rounded-xl font-medium text-sm md:text-base transition-all flex items-center justify-center gap-1 md:gap-2 ${
                      modo === 'abuela'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>👵</span> <span className="hidden md:inline">Modo Abuela</span>
                  </button>
                </div>

                {/* Drop Zone - Mobile Optimized */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-xl p-4 md:p-6 text-center cursor-pointer transition-all
                    ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
                    ${archivoInfo ? 'border-emerald-400 bg-emerald-50' : ''}
                  `}
                >
                  <input ref={inputRef} type="file" accept=".txt,.md,.png,.jpg,.jpeg,.gif,.webp,.pdf" onChange={handleFileSelect} className="hidden" />

                  {archivoInfo ? (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl">{archivoInfo.tipo === 'texto' ? '📄' : archivoInfo.tipo === 'imagen' ? '🖼️' : '📑'}</span>
                      <div className="text-left">
                        <p className="font-semibold text-slate-800 text-sm">{archivoInfo.nombre}</p>
                        <p className="text-xs text-slate-500">{archivoInfo.tipo} • {archivoInfo.tamano}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); limpiar(); }} className="ml-2 text-red-500 hover:text-red-700 text-xl font-bold p-2">✕</button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                        <span className="text-2xl md:text-3xl">📎</span>
                      </div>
                      <p className="font-medium text-slate-700 text-sm md:text-base">Arrastra o haz clic</p>
                      <p className="text-xs text-slate-500 mt-1">TXT, PNG, JPG, PDF</p>
                    </>
                  )}
                </div>

                {/* Preview */}
                {previewImagen && (
                  <div className="mt-3 md:mt-4">
                    <img src={previewImagen} alt="Vista previa" className="max-h-32 md:max-h-40 mx-auto rounded-lg shadow-md" />
                  </div>
                )}

                {/* Ejemplos de estafas - Mobile: muestra solo 1 */}
                {!user && !resultado && (
                  <div className="mt-3 md:mt-4">
                    <p className="text-xs text-slate-500 mb-2">Ejemplos:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setTexto("Hola, tengo una oferta de trabajo para ti. Necesitas pagar una matrícula de $200.000 para apartar el puesto. Es urgente, quedan solo 2 cupos.")}
                        className="text-xs bg-red-100 text-red-700 px-2 py-2 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        📋 Oferta
                      </button>
                      <button
                        onClick={() => setTexto("Alerta: Tu cuenta ha sido bloqueada. Por seguridad, necesitamos que confirmes tus datos inmediatamente en el siguiente enlace: bit.ly/banco-falso")}
                        className="text-xs bg-red-100 text-red-700 px-2 py-2 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        🏦 Banco
                      </button>
                      <button
                        onClick={() => setTexto("Hola! Ya tienes $50.000 acumulados sin hacer nada! Solo necesitas invertido $1.000.000 y en 30 días duplicas tu dinero.")}
                        className="text-xs bg-red-100 text-red-700 px-2 py-2 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        💰 Invertir
                      </button>
                    </div>
                  </div>
                )}

                {/* Floating Paste Button - Mobile */}
                <button
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText()
                      if (text) setTexto(text)
                    } catch (e) {
                      console.log('Clipboard not available')
                    }
                  }}
                  className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-40 min-h-[48px] min-w-[48px] bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 px-3 md:px-4"
                  title="Pegar del portapapeles"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="md:hidden text-sm font-medium">Pegar</span>
                </button>

                {/* Text Area - Mobile Optimized: 40vh min-height, 16px font */}
                <textarea
                  className="w-full min-h-[35vh] md:min-h-[8rem] p-3 md:p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-slate-700 text-base md:text-base mt-3 md:mt-4"
                  style={{ fontSize: '16px', minHeight: '35vh' }}
                  placeholder={modo === 'abuela' ? "Cuéntame el mensaje que recibiste..." : "Pega el texto sospechoso..."}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                />

                {/* Analyze Button - TouchFriendly 48px min */}
                <button
                  onClick={analizar}
                  disabled={loading || (!texto.trim() && !archivoInfo)}
                  className={`w-full mt-3 md:mt-4 font-semibold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px] ${
                    modo === 'abuela'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/30'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30'
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      <span className="text-sm md:text-base">Analizando...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span className="text-sm md:text-base">{modo === 'abuela' ? 'Analizar (Modo Abuela)' : 'Analizar Texto'}</span>
                    </>
                  )}
                </button>

                {error && (
                  <div className="mt-3 md:mt-4 bg-red-50 border border-red-200 rounded-xl p-3 md:p-4 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* Result - Mobile Optimized: readable at 375px */}
                {resultado && estilo && (
                  <div className={`mt-5 md:mt-6 ${estilo.bg} border-2 ${estilo.border} rounded-xl p-4 md:p-5`}>
                    <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                      <div className={`w-12 h-12 md:w-14 md:h-14 ${estilo.iconBg} ${estilo.text} rounded-xl flex items-center justify-center text-xl md:text-2xl font-bold`}>
                        {estilo.icon}
                      </div>
                      <div>
                        <div className={`text-lg md:text-xl font-bold ${estilo.text}`}>{estilo.label}</div>
                        <div className="text-xs md:text-sm text-slate-500">{resultado.confianza}% confianza</div>
                      </div>
                    </div>

                    <p className="text-slate-800 text-base md:text-lg mb-3 md:mb-4">{resultado.explicacion}</p>

                    {resultado.evidencia.length > 0 && (
                      <div className="mb-3 md:mb-4">
                        <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-1 md:gap-2 text-sm md:text-base">
                          <span>⚠️</span> Señales detectadas:
                        </h4>
                        <ul className="space-y-1">
                          {resultado.evidencia.map((e, i) => (
                            <li key={i} className="text-slate-600 text-sm flex items-start gap-2">
                              <span className="text-red-500">•</span> <span className="break-words">{e}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {resultado.ley_infringida && (
                      <div className="mb-3 md:mb-4 bg-white/70 rounded-lg p-2 md:p-3">
                        <span className="font-semibold text-slate-700 text-sm">⚖️ Ley: </span>
                        <span className="text-slate-600 text-sm">{resultado.ley_infringida}</span>
                      </div>
                    )}

                    {resultado.que_hacer.length > 0 && (
                      <div className="bg-white/70 rounded-lg p-3 md:p-4">
                        <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-1 md:gap-2 text-sm md:text-base">
                          <span>💡</span> ¿Qué hacer?
                        </h4>
                        <ul className="space-y-1 md:space-y-2">
                          {resultado.que_hacer.map((q, i) => (
                            <li key={i} className="text-slate-600 text-sm flex items-start gap-2">
                              <span className="text-blue-500 font-bold">→</span> <span className="break-words">{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Botón Compartir - TouchFriendly */}
                    {resultado && resultado.veredicto && (
                      <div className="mt-4">
                        <ShareResult
                          veredicto={resultado.veredicto}
                          confianza={resultado.confianza}
                          evidencia={resultado.evidencia}
                        />
                      </div>
                    )}

                    {/* CTA para usuarios demo */}
                    {!user && resultado && (
                      <div className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white text-center">
                        <p className="font-semibold mb-2">¿Análisis ilimitados?</p>
                        <p className="text-xs md:text-sm text-blue-100 mb-3">Crea cuenta gratis (3 análisis/mes)</p>
                        <button
                          onClick={() => setShowAuth(true)}
                          className="w-full bg-white text-blue-600 font-semibold py-3 min-h-[48px] rounded-lg hover:bg-blue-50 transition-colors text-sm md:text-base"
                        >
                          Crear cuenta gratis
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Features Sidebar - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:block space-y-6">
              <h3 className="text-2xl font-bold text-slate-900">Características Enterprise</h3>

              <div className="grid gap-4">
                {FEATURES.map((feature, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                        {feature.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{feature.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{feature.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust Badges */}
              <div className="bg-slate-100 rounded-xl p-5">
                <h4 className="font-semibold text-slate-700 mb-4">Certificaciones de Seguridad</h4>
                <div className="flex flex-wrap gap-3">
                  <div className="bg-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span className="text-sm font-medium">Encriptación TLS 1.3</span>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span className="text-sm font-medium">GDPR Ready</span>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span className="text-sm font-medium">Sin almacenamiento de datos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Lo que dicen nuestros usuarios</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-1 text-yellow-400 mb-4">
                  {'★★★★★'.split('').map((s, j) => <span key={j}>{s}</span>)}
                </div>
                <p className="text-slate-700 mb-4">"{t.texto}"</p>
                <div>
                  <p className="font-semibold text-slate-900">{t.nombre}</p>
                  <p className="text-sm text-slate-500">{t.rol}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      {seccion === 'pricing' && (
        <section id="pricing" className="py-16 px-4 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">Planes Simples y Transparentes</h2>
            <p className="text-center text-slate-600 mb-12">Sin sorpresas. Cancela cuando quieras.</p>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Free</h3>
                <div className="text-4xl font-bold text-slate-900 mb-1">$0</div>
                <p className="text-sm text-slate-500 mb-6">Para siempre</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm"><span className="text-emerald-500">✓</span> 3 análisis/mes</li>
                  <li className="flex items-center gap-2 text-sm"><span className="text-emerald-500">✓</span> Análisis estándar</li>
                  <li className="flex items-center gap-2 text-sm"><span className="text-emerald-500">✓</span> Soporte por email</li>
                </ul>
                <button onClick={scrollToDemo} className="w-full py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50">
                  Comenzar Gratis
                </button>
              </div>

              <div className="bg-blue-600 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
                <h3 className="text-lg font-semibold mb-2">Pro</h3>
                <div className="text-4xl font-bold mb-1">$7</div>
                <p className="text-sm text-blue-200 mb-6">/mes</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm"><span>✓</span> Análisis ilimitados</li>
                  <li className="flex items-center gap-2 text-sm"><span>✓</span> Modo Abuela</li>
                  <li className="flex items-center gap-2 text-sm"><span>✓</span> Historial de análisis</li>
                  <li className="flex items-center gap-2 text-sm"><span>✓</span> Exportar reportes PDF</li>
                  <li className="flex items-center gap-2 text-sm"><span>✓</span> Prioridad en soporte</li>
                </ul>
                <button onClick={scrollToDemo} className="w-full py-3 rounded-xl bg-white text-blue-600 font-semibold hover:bg-blue-50">
                  Comenzar Prueba Gratis
                </button>
              </div>

              <div className="bg-white rounded-2xl p-6 border-2 border-slate-900">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Business</h3>
                <div className="text-4xl font-bold text-slate-900 mb-1">$19</div>
                <p className="text-sm text-slate-500 mb-6">/mes por usuario</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm"><span className="text-emerald-500">✓</span> Todo lo de Pro</li>
                  <li className="flex items-center gap-2 text-sm"><span className="text-emerald-500">✓</span> API Access</li>
                  <li className="flex items-center gap-2 text-sm"><span className="text-emerald-500">✓</span> Dashboard de equipo</li>
                  <li className="flex items-center gap-2 text-sm"><span className="text-emerald-500">✓</span> SSO corporativo</li>
                  <li className="flex items-center gap-2 text-sm"><span className="text-emerald-500">✓</span> SLA 99.9%</li>
                </ul>
                <button className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800">
                  Contactar Ventas
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* About */}
      {seccion === 'about' && (
        <section id="about" className="py-16 px-4 bg-slate-50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-8">Sobre KAIZEN Protect</h2>

            <div className="bg-white rounded-2xl p-8 border border-slate-200 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Nuestra Misión</h3>
                <p className="text-slate-600">Proteger a las familias latinas de estafas digitales con tecnología de inteligencia artificial accesible, efectiva y fácil de usar.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">El Problema</h3>
                <p className="text-slate-600">En Latinoamérica se pierden más de $6 mil millones anuales por estafas digitales. Las estafas son cada vez más sofisticadas y cualquiera puede ser víctima.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Nuestra Solución</h3>
                <p className="text-slate-600">KAIZEN Protect usa modelos de IA entrenados específicamente para el contexto latinoamericano, detectando patrones de manipulación, phishing, y estafas con precisión superior al 98%.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Privacidad</h3>
                <p className="text-slate-600">Tus mensajes se analizan en tiempo real y se eliminan inmediatamente. No almacenamos texto, no compartimos datos, y cumplimos con GDPR y leyes de protección de datos latinoamericanas.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Ad Modal */}
      {showAd && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📺</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">¡Casi!</h3>
              <p className="text-slate-600 mb-4">
                Has usado tus {ANALISIS_LIBRES} análisis gratuitos. Mira un anuncio corto para continuar usando KAIZEN Protect gratis.
              </p>
              
              <div className="bg-slate-100 rounded-xl p-4 mb-4">
                <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg mb-3 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-4xl block mb-2">🎬</span>
                    <span className="text-sm text-slate-500">Anuncio de 15 segundos</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500">Apoyanos viendo este breve anuncio</p>
              </div>
              
              <div className="text-6xl font-bold text-blue-600 mb-4">
                {countdown}s
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={skipAd}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                >
                  Omitir
                </button>
                <button
                  onClick={closeAdAndContinue}
                  disabled={countdown > 0}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-colors ${
                    countdown === 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {countdown === 0 ? 'Continuar Gratis' : `Espera ${countdown}s`}
                </button>
              </div>
              
              <p className="text-xs text-slate-400 mt-4">
                O suscríbete a Pro desde $7/mes para análisis ilimitados sin anuncios
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">¿Listo para protegerte?</h2>
          <p className="text-blue-100 mb-8">Únete a miles de personas que ya usan KAIZEN Protect para mantenerse seguras.</p>
          <button onClick={scrollToDemo} className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-colors shadow-lg">
            Comenzar Gratis Ahora
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">V</span>
                </div>
                <span className="text-white font-bold">KAIZEN Protect</span>
              </div>
              <p className="text-sm">Detector de estafas con IA para Latinoamérica.</p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Características</a></li>
                <li><a href="#" className="hover:text-white">Precios</a></li>
                <li><a href="#" className="hover:text-white">API</a></li>
                <li><a href="#" className="hover:text-white">Integraciones</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Sobre nosotros</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Carreras</a></li>
                <li><a href="#" className="hover:text-white">Contacto</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacidad</a></li>
                <li><a href="#" className="hover:text-white">Términos</a></li>
                <li><a href="#" className="hover:text-white">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2024 KAIZEN Protect. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full">● Sistema Operativo</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          onLogin={handleLogin}
          onClose={() => setShowAuth(false)}
        />
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}

      {/* User Dashboard Modal */}
      {showUserDashboard && user && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Mi Cuenta</h2>
              <button
                onClick={() => setShowUserDashboard(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>
            <Dashboard user={user} onLogout={handleLogout} />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
