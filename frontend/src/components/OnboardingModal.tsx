import { useState } from 'react'

const API_URL = 'https://kaizennum-production.up.railway.app'

interface OnboardingModalProps {
  onComplete: () => void
}

const OPTIONS = [
  {
    step: 1,
    question: '¿Para qué vas a usar KAIZEN Protect?',
    options: [
      { value: 'personal', label: 'Para mí', icon: '👤', desc: 'Proteger mis propias finanzas' },
      { value: 'hijos', label: 'Para mis hijos', icon: '👶', desc: 'Proteger a mi familia' },
      { value: 'padres', label: 'Para mis padres/abuelos', icon: '👵', desc: 'Ayudarlos con tecnología' },
      { value: 'empresa', label: 'Para mi empresa', icon: '🏢', desc: 'Proteger a mi equipo' },
    ]
  },
  {
    step: 2,
    question: '¿Por dónde recibes mensajes sospechosos?',
    options: [
      { value: 'whatsapp', label: 'WhatsApp', icon: '💬', desc: 'Mensajes de contactos未知' },
      { value: 'email', label: 'Email', icon: '📧', desc: 'Correos de bancos o ofertas' },
      { value: 'redes', label: 'Redes Sociales', icon: '📱', desc: 'Instagram, Facebook, TikTok' },
      { value: 'sms', label: 'SMS/Llamadas', icon: '📞', desc: 'Mensajes de números desconocidos' },
    ]
  },
  {
    step: 3,
    question: '¡Perfecto! ¿Confirmas tu información?',
    isConfirm: true,
  }
]

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState<{ purpose?: string; channel?: string }>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentOption = OPTIONS.find(o => o.step === step)!

  const handleSelect = (value: string) => {
    if (step === 1) {
      setAnswers({ ...answers, purpose: value })
      setStep(2)
    } else if (step === 2) {
      setAnswers({ ...answers, channel: value })
      setStep(3)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('kaizen_token')
      const res = await fetch(`${API_URL}/api/v1/auth/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          purpose: answers.purpose,
          channel: answers.channel
        })
      })

      if (!res.ok) {
        throw new Error('Error al guardar')
      }

      onComplete()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const canSkip = step === 3

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Step Number */}
        <div className="text-sm text-slate-500 mb-2">
          Paso {step} de 3
        </div>

        {/* Question */}
        <h3 className="text-xl font-bold text-slate-900 mb-6">
          {currentOption.question}
        </h3>

        {/* Confirm Step */}
        {currentOption.isConfirm ? (
          <div>
            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Propósito:</span>
                <span className="font-medium text-slate-900">
                  {OPTIONS[0].options.find(o => o.value === answers.purpose)?.label || answers.purpose}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Canales:</span>
                <span className="font-medium text-slate-900">
                  {OPTIONS[1].options.find(o => o.value === answers.channel)?.label || answers.channel}
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Confirmar y Continuar'}
            </button>
          </div>
        ) : (
          /* Options */
          <div className="space-y-3">
            {currentOption.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                  {opt.icon}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{opt.label}</div>
                  <div className="text-sm text-slate-500">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}