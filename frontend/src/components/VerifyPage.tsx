import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function VerifyPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (!token) {
      setError('Token de verificación inválido')
      setLoading(false)
      return
    }

    fetch(`${API_URL}/api/v1/auth/verify?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSuccess(true)
          setTimeout(() => {
            window.location.href = '/'
          }, 2000)
        } else {
          setError(data.detail || 'Error al verificar email')
        }
      })
      .catch(() => {
        setError('Error de conexión')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-lg">Verificando tu email...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Email verificado!</h1>
          <p className="text-slate-400 mb-4">Redirigiendo al inicio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-3xl">✕</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Error de verificación</h1>
        <p className="text-slate-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.href = '/'}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}