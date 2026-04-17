# KAIZEN Protect - Resumen Completo

## 1. Visión del Proyecto

**KAIZEN Protect** es un detector de manipulación y estafas con IA especializado en el contexto latinoamericano. El objetivo es proteger a las familias colombianas y latamericanas de estafas digitales.

### Propuesta de Valor
> "Pega el texto. En 10 segundos sabrás si es seguro o una trampa."

### Modelo de Negocio
- **Freemium**: 3 análisis gratis al mes
- **Pro** ($7/mes): Análisis ilimitados + Modo Abuela + Historial + PDF
- **Business** ($19/mes): Todo Pro + API Keys + Gestión de equipo

---

## 2. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                    (React + TypeScript)                     │
│                                                              │
│  • App.tsx          - Componente principal                  │
│  • AuthModal.tsx    - Login/Registro                        │
│  • Dashboard.tsx    - Panel de usuario por plan              │
│  • HistoryPanel.tsx - Historial + Export PDF               │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP + JSON
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│                    (FastAPI + Python)                       │
│                                                              │
│  • main.py             - API endpoints                       │
│  • ai_analyzer.py      - Análisis con Claude API             │
│  • explicaciones.py    - Modo Abuela                         │
│  • auth_system.py      - Autenticación + BD en memoria       │
│  • stripe_integration.py - Pagos Stripe                     │
└─────────────────────┬───────────────────────────────────────┘
                      │ Anthropic API
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVICIOS EXTERNOS                       │
│                                                              │
│  • Anthropic (Claude)   - Análisis de IA                     │
│  • Stripe               - Pagos y suscripciones              │
│  • Supabase             - DB (pendiente para producción)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Funcionalidades

### 3.1 Análisis de Texto
- **Input**: Texto, imágenes, PDFs
- **Output**: Veredicto + Confianza + Evidencia + Recomendaciones
- **Niveles**: SEGURO | PRECAUCION | ALERTA | PELIGRO
- **Características**:
  - Detección de patrones de estafa latinoamericanos
  - Referencias a leyes colombianas
  - Recomendaciones personalizadas

### 3.2 Modo Abuela (Diferenciador)
- Explicaciones ultra-simples
- Sin tecnicismos
- Para personas mayores de 60 años
- Lenguaje cotidiano y accesible

### 3.3 Autenticación
- Registro/Login con email
- Tokens JWT (30 días)
- Contraseñas hasheadas con bcrypt
- Protección contra fuerza bruta (5 intentos, 15 min lockout)

### 3.4 Suscripciones
| Plan | Precio | Análisis | Características |
|------|--------|----------|----------------|
| Free | $0 | 3/mes | Básico |
| Pro | $7/mes | ∞ | Modo Abuela, Historial, PDF |
| Business | $19/mes | ∞ | + API Keys, Equipo |

### 3.5 Historial de Análisis
- Guardado automático (Pro/Business)
- Límite de 100 análisis
- Vista detallada
- Eliminación de historial

### 3.6 Exportación PDF
- Reportes profesionales
- Incluye: veredicto, evidencia, recomendaciones
- Formato adecuado para presentar como prueba

### 3.7 API Keys (Business)
- Creación de keys para integraciones
- Tracking de uso (requests, último uso)
- Eliminación de keys

### 3.8 Gestión de Equipo (Business)
- Dashboard de equipo
- Invitar miembros por email
- Roles: Admin, Member
- Remover miembros

---

## 4. Tech Stack

### Frontend
- **Framework**: React 19
- **Lenguaje**: TypeScript
- **Estilos**: TailwindCSS v4
- **Build**: Vite
- **PDF**: jsPDF

### Backend
- **Framework**: FastAPI
- **Lenguaje**: Python 3.12
- **Auth**: bcrypt
- **Rate Limiting**: slowapi
- **API Client**: anthropic

### Servicios
- **IA**: Anthropic (Claude Sonnet 4)
- **Pagos**: Stripe
- **DB**: En memoria (dev) / Supabase (pendiente)

---

## 5. Estructura de Archivos

```
KaizenNum/
├── backend/
│   ├── main.py                    # FastAPI app + endpoints
│   ├── ai_analyzer.py             # Análisis con Claude
│   ├── explicaciones.py           # Modo Abuela
│   ├── auth_system.py             # Auth + BD en memoria
│   ├── stripe_integration.py      # Pagos Stripe
│   ├── requirements.txt           # Dependencias Python
│   ├── .env                      # Variables de entorno
│   ├── tests/
│   │   └── test_analyzer.py      # Tests (7/7 passing)
│   └── venv/                     # Entorno virtual
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Componente principal
│   │   ├── index.css            # Estilos Tailwind
│   │   └── components/
│   │       ├── AuthModal.tsx     # Login/Registro
│   │       ├── Dashboard.tsx     # Panel usuario
│   │       └── HistoryPanel.tsx  # Historial + PDF
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── .github/
│   └── workflows/
│       └── ci.yml                # CI/CD pipeline
│
├── SPEC.md                       # Especificación técnica
├── PITCH.md                      # Pitch de negocio
├── SETUP.md                      # Guía de configuración
├── PENDIENTES.md                # Roadmap de pendientes
└── README.md                    # Este archivo
```

---

## 6. API Endpoints

### Autenticación
```
POST /api/v1/auth/register    - Crear cuenta
POST /api/v1/auth/login      - Iniciar sesión
GET  /api/v1/auth/me         - Obtener usuario actual
```

### Suscripciones
```
GET  /api/v1/subscription/status    - Estado de suscripción
GET  /api/v1/subscription/plans     - Listar planes
POST /api/v1/subscription/checkout  - Crear sesión Stripe
GET  /api/v1/subscription/portal    - Portal de gestión
```

### Análisis
```
POST /api/v1/analizar           - Análisis estándar
POST /api/v1/analizar/abuela    - Análisis Modo Abuela
```

### Historial (Pro/Business)
```
GET    /api/v1/history          - Ver historial
DELETE /api/v1/history          - Eliminar historial
```

### API Keys (Business)
```
GET    /api/v1/api-keys         - Listar keys
POST   /api/v1/api-keys         - Crear key
DELETE /api/v1/api-keys/{id}    - Eliminar key
```

### Equipo (Business)
```
GET    /api/v1/team             - Ver miembros
POST   /api/v1/team/invite      - Invitar miembro
DELETE /api/v1/team/{id}        - Remover miembro
```

### Webhooks
```
POST /api/v1/webhooks/stripe   - Webhook de Stripe
```

---

## 7. Modelos de Datos

### User
```python
{
  "id": str,
  "email": str,
  "password_hash": str,      # bcrypt
  "name": str,
  "created_at": datetime,
  "subscription_tier": "free|pro|business|admin",
  "subscription_status": "active|inactive",
  "subscription_id": str | None,
  "subscription_end": datetime | None,
  "stripe_customer_id": str | None,
  "failed_login_attempts": int,
  "locked_until": datetime | None
}
```

### Veredicto
```python
{
  "veredicto": "SEGURO|PRECAUCION|ALERTA|PELIGRO",
  "confianza": 0-100,
  "explicacion": str,
  "evidencia": [str],
  "ley_infringida": str | None,
  "que_hacer": [str],
  "tiempo_ms": int
}
```

---

## 8. Seguridad

### Implementado ✓
- Hash de contraseñas (bcrypt 12 rounds)
- Protección contra fuerza bruta
- Rate limiting por IP
- CORS configurado
- Sanitización de inputs
- Validación de imágenes
- Verificación de webhooks
- Mensajes de error genéricos

### Pendiente
- Base de datos persistente (Supabase)
- Rate limiting por usuario
- Verificación de email
- Password reset
- SSO corporativo

---

## 9. Usuarios Demo

| Plan | Email | Contraseña |
|------|-------|------------|
| Free | free@demo.com | demo123 |
| Pro | pro@demo.com | demo123 |
| Business | business@demo.com | demo123 |
| Admin | admin@demo.com | admin123 |

---

## 10. Comandos

### Desarrollo
```bash
# Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload

# Frontend
cd frontend
npm run dev
```

### Producción
```bash
# Build frontend
cd frontend
npm run build

# Tests
cd backend
pytest tests/ -v
```

---

## 11. Configuración

### Variables de Entorno (backend/.env)
```env
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
CORS_ORIGINS=http://localhost:5173
```

### Variables Frontend
```env
VITE_API_URL=http://localhost:8000
```

---

## 12. Roadmap

### Completado ✓
- [x] Análisis de texto
- [x] Análisis de imágenes
- [x] Modo Abuela
- [x] Autenticación segura
- [x] Suscripciones
- [x] Historial
- [x] Export PDF
- [x] API Keys
- [x] Gestión de equipo
- [x] Stripe integración
- [x] Tests
- [x] CI/CD
- [x] Auditoría de seguridad

### Pendiente
- [ ] Supabase (DB persistente)
- [ ] Verificación de email
- [ ] Password reset
- [ ] SSO corporativo

---

## 13. Métricas

- **Tests**: 7/7 passing
- **Build**: Frontend OK
- **Linting**: TypeScript OK

---

## 14. Contacto & Soporte

Para dudas o problemas:
1. Revisar logs del backend
2. Verificar variables de entorno
3. Probar endpoints con curl

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/api/v1/analizar \
  -H "Content-Type: application/json" \
  -d '{"texto": "Hola, soy del banco y necesito tu contraseña"}'
```

---

*Documento generado: 2025*
*Versión: 1.0.0*
*Proyecto: KAIZEN Protect*
