import { useState, useRef } from 'react'
import html2canvas from 'html2canvas'

interface ShareResultProps {
  veredicto: string
  confianza: number
  evidencia: string[]
}

const COLORS = {
  SEGURO: { bg: '#10b981', name: 'SEGURO' },
  PRECAUCION: { bg: '#eab308', name: 'PRECAUCIÓN' },
  ALERTA: { bg: '#f97316', name: 'ALERTA' },
  PELIGRO: { bg: '#dc2626', name: 'PELIGRO' }
}

export default function ShareResult({ veredicto, confianza, evidencia }: ShareResultProps) {
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const generateImage = async (): Promise<string | null> => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 450
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const color = COLORS[veredicto as keyof typeof COLORS] || COLORS.SEGURO

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, 800, 450)

    ctx.fillStyle = '#2563eb'
    ctx.font = 'bold 28px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('KAIZEN Protect', 400, 50)

    ctx.fillStyle = color.bg
    ctx.fillRect(250, 80, 300, 60)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 36px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(color.name, 400, 125)

    ctx.fillStyle = '#94a3b8'
    ctx.font = '18px Arial'
    ctx.fillText(`${confianza}% de confianza`, 400, 165)

    if (evidencia.length > 0) {
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Señales detectadas:', 400, 200)

      ctx.fillStyle = '#cbd5e1'
      ctx.font = '13px Arial'
      const firstTwo = evidencia.slice(0, 2)
      firstTwo.forEach((ev, i) => {
        const text = ev.length > 70 ? ev.substring(0, 70) + '...' : ev
        ctx.fillText(`• ${text}`, 400, 225 + (i * 20))
      })
    }

    ctx.fillStyle = '#475569'
    ctx.font = 'bold 14px Arial'
    ctx.fillText('Analiza mensajes sospechosos en kaizenprotect.app', 400, 420)

    return canvas.toDataURL('image/png')
  }

  const handleShare = async () => {
    setLoading(true)
    try {
      const dataUrl = await generateImage()
      if (!dataUrl) {
        alert('Error al generar imagen')
        return
      }

      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], `kaizen-result-${veredicto}.png`, { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `KAIZEN Protect: ${veredicto}`,
          text: `Análisis de mensaje sospechoso - ${confianza}% de confianza`,
          files: [file]
        })
      } else {
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `kaizen-result-${veredicto}.png`
        link.click()
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        const dataUrl = await generateImage()
        const link = document.createElement('a')
        link.href = dataUrl || ''
        link.download = `kaizen-result-${veredicto}.png`
        link.click()
      }
    } finally {
      setLoading(false)
    }
  }

  const color = COLORS[veredicto as keyof typeof COLORS] || COLORS.SEGURO

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 min-h-[48px] rounded-lg transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      ) : (
        <>
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
          </svg>
          <span className="hidden md:inline">Compartir resultado</span>
          <span className="md:hidden">Compartir</span>
        </>
      )}
    </button>
  )
}