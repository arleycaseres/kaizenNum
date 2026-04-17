# KAIZEN Protect - Detector de Estafas con IA

Detector de manipulación y estafas digitales para Latinoamérica, potenciado por Claude AI.

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.136-green.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## Características Principales

- **Análisis Instantáneo**: Veredicto en segundos
- **Modo "Abuela"**: Explicaciones ultra-simples para personas mayores
- **Contexto LatAm**: Conocimiento de estafas de la región
- **4 Niveles de Riesgo**: Seguro, Precaución, Alerta, Peligro
- **Base Legal**: Referencia a leyes colombianas

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- API Key de [Anthropic](https://console.anthropic.com)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configura tu API key
export ANTHROPIC_API_KEY=sk-ant-xxxxx

# Corre el servidor
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

## API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/v1/analizar` | POST | Análisis básico |
| `/api/v1/analizar/abuela` | POST | Modo abuela |
| `/api/v1/analizar/completo` | POST | Análisis completo (Pro) |
| `/api/v1/status` | GET | Estado del usuario |
| `/health` | GET | Health check |

## Estructura del Proyecto

```
KaizenNum/
├── backend/
│   ├── main.py           # FastAPI app
│   ├── ai_analyzer.py    # Análisis IA
│   ├── explicaciones.py   # Modo abuela
│   ├── auth.py           # Autenticación
│   └── tests/            # Tests
├── frontend/
│   └── src/App.tsx       # React app
├── .github/workflows/    # CI/CD
├── SPEC.md              # Especificación técnica
└── PITCH.md             # Pitch de negocio
```

## Variables de Entorno

### Backend (.env)

```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
```

## Licencia

MIT License - Ver [LICENSE](LICENSE)
