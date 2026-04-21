import { useState, useRef, useEffect } from 'react'
import html2canvas from 'html2canvas'

interface ShareResultProps {
  veredicto: string
  confianza: number
  evidencia: string[]
}

const COLORS = {
  SEGURO: { bg: '#10b981', name: 'SEGURO', hex: '#059669' },
  PRECAUCION: { bg: '#eab308', name: 'PRECAUCIÓN', hex: '#ca8a04' },
  ALERTA: { bg: '#f97316', name: 'ALERTA', hex: '#ea580c' },
  PELIGRO: { bg: '#dc2626', name: 'PELIGRO', hex: '#b91c1c' }
}

export default function ShareResult({ veredicto, confianza, evidencia }: ShareResultProps) {
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)

  const color = COLORS[veredicto as keyof typeof COLORS] || COLORS.SEGURO
  const veredictoLabel = veredicto === 'PRECAUCION' ? 'PRECAUCIÓN' : COLORS[veredicto as keyof typeof COLORS]?.name || veredicto

  useEffect(() => {
    if (imageContainerRef.current && canvasRef.current) {
      generateImage()
    }
  }, [veredicto, confianza, evidencia])

  const generateImage = async (): Promise<string> => {
    if (!imageContainerRef.current) return ''

    try {
      const canvas = await html2canvas(imageContainerRef.current, {
        width: 800,
        height: 450,
        scale: 1,
        backgroundColor: '#0d1117',
        logging: false,
        useCORS: true
      })
      return canvas.toDataURL('image/png')
    } catch (e) {
      console.error('Error generating image:', e)
      return ''
    }
  }

  const handleShare = async () => {
    setLoading(true)
    try {
      const dataUrl = await generateImage()
      if (!dataUrl) {
        alert('Error al generar imagen')
        setLoading(false)
        return
      }

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const canShare = typeof navigator.share === 'function' && isMobile

      if (canShare) {
        try {
          const response = await fetch(dataUrl)
          const blob = await response.blob()
          const file = new File([blob], `kaizen-result-${veredicto}.png`, { type: 'image/png' })

          await navigator.share({
            title: `KAIZEN Protect: ${veredictoLabel}`,
            text: `Análisis: ${veredictoLabel} (${confianza}% confianza)`,
            files: [file]
          })
        } catch (e) {
          downloadImage(dataUrl)
        }
      } else {
        downloadImage(dataUrl)
      }
    } catch (e) {
      console.error('Share error:', e)
    } finally {
      setLoading(false)
    }
  }

  const downloadImage = (dataUrl: string) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `kaizen-result-${veredicto}.png`
    link.click()
  }

  return (
    <>
      <div
        ref={imageContainerRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '800px',
          height: '450px',
          backgroundColor: '#0d1117',
          padding: '24px',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <span style={{ fontSize: '20px' }}>🛡️</span>
          <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '18px' }}>KAIZEN Protect</span>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: color.hex,
            padding: '16px 48px',
            borderRadius: '12px',
            marginBottom: '12px'
          }}>
            <span style={{
              color: '#fff',
              fontSize: '42px',
              fontWeight: 'bold'
            }}>
              {veredictoLabel}
            </span>
          </div>
          <p style={{ color: '#9ca3af', fontSize: '20px' }}>{confianza}% confianza</p>

          {evidencia.length > 0 && (
            <div style={{ marginTop: '20px', maxWidth: '600px' }}>
              <p style={{ color: '#d1d5db', fontSize: '14px', textAlign: 'center', marginBottom: '8px' }}>Señales detectadas:</p>
              {evidencia.slice(0, 2).map((ev, i) => (
                <p key={i} style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center' }}>
                  • {ev.length > 80 ? ev.substring(0, 80) + '...' : ev}
                </p>
              ))}
            </div>
          )}
        </div>

        <div style={{
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '12px',
          borderTop: '1px solid #1f2937',
          paddingTop: '12px'
        }}>
          Analiza mensajes en kaizen-protect.netlify.app
        </div>
      </div>

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
    </>
  )
}