import { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'

interface HistoryItem {
  id: string
  timestamp: string
  texto_preview: string
  veredicto: string
  confianza: number
  resultado: {
    veredicto: string
    explicacion: string
    evidencia: string[]
    ley_infringida: string | null
    que_hacer: string[]
  }
}

interface HistoryPanelProps {
  token: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function HistoryPanel({ token }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/history?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
    } catch (e) {
      console.error('Error fetching history:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteHistory = async () => {
    if (!confirm('¿Eliminar todo el historial? Esta acción no se puede deshacer.')) return
    try {
      const res = await fetch(`${API_URL}/api/v1/history`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setHistory([])
        setSelectedItem(null)
      }
    } catch (e) {
      console.error('Error deleting history:', e)
    }
  }

  const exportToPDF = (item: HistoryItem) => {
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.setTextColor(59, 130, 246)
    doc.text('KAIZEN Protect', 105, 20, { align: 'center' })

    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Reporte de Analisis', 105, 30, { align: 'center' })

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Fecha: ${new Date(item.timestamp).toLocaleString('es-CO')}`, 20, 45)

    doc.setDrawColor(200, 200, 200)
    doc.line(20, 50, 190, 50)

    doc.setFontSize(16)
    const veredictoColor = item.veredicto === 'PELIGRO' ? [220, 38, 38] :
                          item.veredicto === 'ALERTA' ? [249, 115, 22] :
                          item.veredicto === 'PRECAUCION' ? [234, 179, 8] : [34, 197, 94]
    doc.setTextColor(veredictoColor[0], veredictoColor[1], veredictoColor[2])
    doc.text(`VEREDICTO: ${item.veredicto}`, 20, 65)

    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(`Confianza: ${item.confianza}%`, 20, 75)

    doc.setFontSize(11)
    doc.text('Mensaje analisado:', 20, 90)
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    const lines = doc.splitTextToSize(item.texto_preview, 170)
    doc.text(lines, 20, 98)

    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text('Explicacion:', 20, 115)
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    const explLines = doc.splitTextToSize(item.resultado.explicacion, 170)
    doc.text(explLines, 20, 123)

    if (item.resultado.evidencia.length > 0) {
      doc.setFontSize(11)
      doc.setTextColor(0, 0, 0)
      doc.text('Evidencia encontrada:', 20, 145)
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      item.resultado.evidencia.forEach((ev, i) => {
        doc.text(`- ${ev}`, 25, 153 + (i * 7))
      })
    }

    if (item.resultado.ley_infringida) {
      doc.setFontSize(11)
      doc.setTextColor(0, 0, 0)
      doc.text('Ley infringida:', 20, 180)
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(item.resultado.ley_infringida, 25, 188)
    }

    if (item.resultado.que_hacer.length > 0) {
      doc.setFontSize(11)
      doc.setTextColor(0, 0, 0)
      doc.text('Recomendaciones:', 20, 200)
      doc.setFontSize(10)
      doc.setTextColor(59, 130, 246)
      item.resultado.que_hacer.forEach((rec, i) => {
        doc.text(`${i + 1}. ${rec}`, 25, 208 + (i * 7))
      })
    }

    doc.setDrawColor(200, 200, 200)
    doc.line(20, 280, 190, 280)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('Generado por KAIZEN Protect - Detector de Estafas con IA', 105, 287, { align: 'center' })

    doc.save(`kaizen-report-${item.id}.pdf`)
  }

  const getVeredictoColor = (veredicto: string) => {
    switch (veredicto) {
      case 'PELIGRO': return 'text-red-600 bg-red-100'
      case 'ALERTA': return 'text-orange-600 bg-orange-100'
      case 'PRECAUCION': return 'text-yellow-600 bg-yellow-100'
      case 'SEGURO': return 'text-emerald-600 bg-emerald-100'
      default: return 'text-slate-600 bg-slate-100'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-slate-900">Historial de Analisis</h4>
        {history.length > 0 && (
          <button
            onClick={handleDeleteHistory}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Eliminar todo
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">No tienes analisis guardados</p>
          <p className="text-xs">Los analisis que hagas apareceran aqui</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
              className={`p-3 rounded-xl cursor-pointer transition-all ${
                selectedItem?.id === item.id ? 'bg-blue-50 border-2 border-blue-300' : 'bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getVeredictoColor(item.veredicto)}`}>
                  {item.veredicto}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(item.timestamp).toLocaleDateString('es-CO')}
                </span>
              </div>
              <p className="text-sm text-slate-600 truncate">{item.texto_preview}</p>
              <p className="text-xs text-slate-400 mt-1">{item.confianza}% confianza</p>

              {selectedItem?.id === item.id && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-700 mb-2">{selectedItem.resultado.explicacion}</p>

                  {selectedItem.resultado.evidencia.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-slate-600 mb-1">Evidencia:</p>
                      <ul className="text-xs text-slate-500 space-y-1">
                        {selectedItem.resultado.evidencia.map((ev, i) => (
                          <li key={i}>• {ev}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedItem.resultado.que_hacer.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-slate-600 mb-1">Recomendaciones:</p>
                      <ul className="text-xs text-slate-500 space-y-1">
                        {selectedItem.resultado.que_hacer.map((rec, i) => (
                          <li key={i}>{i + 1}. {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      exportToPDF(selectedItem)
                    }}
                    className="mt-2 w-full bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <span>📄</span> Exportar PDF
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
