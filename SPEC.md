# SPEC.md - KAIZEN Protect

## 1. Concepto & Visión

**KAIZEN Protect** es un detector de manipulación y estafas que da veredictos instantáneos y claros sobre cualquier texto sospechoso. Especializado en el contexto latinoamericano (Colombia/LatAm).

**Propuesta de valor:**
> "Pega el texto. En 10 segundos sabrás si es seguro o una trampa."

**Personalidad:** Confiable, directo, accesible para cualquier persona.

---

## 2. Arquitectura del Sistema

```
Frontend (React) ←→ Backend (FastAPI) ←→ Groq API (gratis) o Anthropic
                                               ↓
                                          Supabase
```

### Stack
- **Frontend:** React 18 + TypeScript + TailwindCSS v3
- **Backend:** FastAPI 0.136 + Python 3.12
- **IA:** Groq (gratis) o Anthropic (Claude)
- **DB:** En memoria (para desarrollo), Supabase (para producción)
- **Payments:** Stripe (implementado, requiere configuración)

---

## 3. Funcionalidades Implementadas

### 3.1 Análisis Básico ✓
- Análisis de texto con veredicto
- 4 niveles: SEGURO, PRECAUCION, ALERTA, PELIGRO
- Evidencia y recomendaciones con leyes colombianas
- Rate limiting (10/min por IP)
- Sanitización de inputs
- Validación de tamaño de imagen (5MB máx)

### 3.2 Análisis con Imágenes ✓
- Soporte para imágenes (JPEG, PNG, WEBP)
- Análisis combinado texto + imagen usando Claude Vision
- Límite de tamaño: 5MB

### 3.3 Modo Abuela ✓ (DIFERENCIADOR)
- Explicaciones ultra-simples
- Para personas mayores de 60 años
- Sin tecnicismos
- Lenguaje cotidiano

### 3.4 Autenticación ✓
- Sistema de registro/login con tokens
- Contraseñas hasheadas con bcrypt (12 rounds)
- Protección contra fuerza bruta (5 intentos, lockout 15min)
- Rate limiting en auth (5/min registro, 10/min login)

### 3.5 Suscripciones ✓
- Free: 3 análisis/mes
- Pro ($7/mes): Análisis ilimitados + Historial + Export PDF
- Business ($19/mes): Todo lo de Pro + API Keys + Gestión de equipo
- Integración con Stripe (checkout, webhooks, portal)

### 3.6 Historial de Análisis ✓
- Guardado de análisis para usuarios Pro/Business
- Límite de 100 análisis por usuario
- Vista detallada de análisis anteriores
- Exportación a PDF

### 3.7 Exportación PDF ✓
- Reportes profesionales generados con jsPDF
- Incluye: veredicto, confianza, evidencia, recomendaciones
- Diseñado para presentar como prueba

### 3.8 API Keys (Business) ✓
- Creación de API keys para integraciones
- Tracking de uso (último uso, cantidad de requests)
- Eliminación de keys

### 3.9 Gestión de Equipo (Business) ✓
- Dashboard de equipo
- Invitar miembros por email
- Roles: Admin, Member
- Eliminación de miembros

---

## 4. Modelo de Suscripciones

### 4.1 Planes

| Plan | Precio | Límite Análisis | Características |
|------|--------|-----------------|-----------------|
| Free | $0 | 3/mes | Solo análisis básico |
| Pro | $7/mes | Ilimitados | Modo Abuela, Historial, Export PDF |
| Business | $19/mes | Ilimitados | Todo Pro + API Keys + Equipo + SSO (próximamente) |

### 4.2 Características por Plan

**Free:**
- ✓ Análisis de texto
- ✓ 4 veredictos con confianza
- ✗ Modo Abuela
- ✗ Historial
- ✗ Exportar PDF

**Pro:**
- ✓ Todo lo de Free
- ✓ Análisis ilimitados
- ✓ Modo Abuela
- ✓ Historial de análisis
- ✓ Exportar PDF

**Business:**
- ✓ Todo lo de Pro
- ✓ API Keys para integraciones
- ✓ Dashboard de equipo
- ✓ Invitar miembros
- ⏳ SSO corporativo (pendiente)
- ✓ SLA 99.9% (garantizado contractualmente)

---

## 5. API Endpoints

### 5.1 Autenticación

```
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### 5.2 Suscripciones

```
GET  /api/v1/subscription/status
GET  /api/v1/subscription/plans
POST /api/v1/subscription/checkout
GET  /api/v1/subscription/portal
```

### 5.3 Análisis

```
POST /api/v1/analizar
POST /api/v1/analizar/abuela
```

### 5.4 Historial (Pro/Business)

```
GET    /api/v1/history
DELETE /api/v1/history
```

### 5.5 API Keys (Business)

```
GET    /api/v1/api-keys
POST   /api/v1/api-keys
DELETE /api/v1/api-keys/{key_id}
```

### 5.6 Equipo (Business)

```
GET    /api/v1/team
POST   /api/v1/team/invite
DELETE /api/v1/team/{member_id}
```

### 5.7 Webhooks

```
POST /api/v1/webhooks/stripe
```

---

## 6. Modelo de Datos

### 6.1 User
```python
{
  "id": str,
  "email": str,
  "password_hash": str,  # bcrypt
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

### 6.2 Token
```python
{
  "token": str,
  "user_id": str,
  "expires_at": datetime
}
```

### 6.3 History
```python
{
  "id": str,
  "timestamp": str (ISO),
  "texto_preview": str,
  "veredicto": str,
  "confianza": int,
  "resultado": dict
}
```

### 6.4 ApiKey
```python
{
  "key": str,
  "user_id": str,
  "name": str,
  "created_at": str (ISO),
  "last_used": str (ISO) | None,
  "requests_count": int
}
```

### 6.5 TeamMember
```python
{
  "id": str,
  "name": str,
  "email": str,
  "role": "admin|member",
  "joined_at": str (ISO),
  "invited_by": str | None
}
```

---

## 7. Seguridad

### 7.1 Implementado ✓
- Rate limiting por IP
- Hash de contraseñas con bcrypt (12 rounds)
- Protección contra fuerza bruta
- CORS configurado (whitelist)
- Sanitización de inputs
- Validación de tamaño de imágenes
- Verificación de webhook signatures (Stripe)
- Mensajes de error genéricos

### 7.2 Pendiente (ver PENDIENTES_SEGURIDAD.md)
- Base de datos persistente
- Rate limiting por usuario autenticado
- Verificación de email
- Password reset flow
- Sanitización avanzada para IA (prompt injection)
- CSP headers
- HSTS
- Logging de auditoría

---

## 8. Roadmap

### Completado ✓
- [x] Análisis básico de texto
- [x] Análisis de imágenes
- [x] Modo Abuela
- [x] Autenticación con bcrypt
- [x] Protección contra fuerza bruta
- [x] Rate limiting
- [x] Historial de análisis
- [x] Exportación PDF
- [x] API Keys para Business
- [x] Gestión de equipo
- [x] Integración Stripe
- [x] Tests (7/7 passing)
- [x] CI/CD pipeline
- [x] Auditoría de seguridad
- [x] Documentación de seguridad

### En Progreso
- [ ] Base de datos persistente (Supabase)

### Pendiente
- [ ] Verificación de email
- [ ] Password reset
- [ ] Rate limiting por usuario
- [ ] Sanitización avanzada IA
- [ ] SSO corporativo (Business)
- [ ] Límites por usuario en equipo

---

## 9. Testing

```bash
# Backend
cd backend
source venv/bin/activate
pytest tests/ -v

# Frontend
cd frontend
npm run build
```

Tests actuales: 7/7 passing

---

## 10. Usuarios Demo

Para pruebas locales (solo en desarrollo):

| Plan | Email | Contraseña |
|------|-------|------------|
| Free | free@demo.com | demo123 |
| Pro | pro@demo.com | demo123 |
| Business | business@demo.com | demo123 |
| Admin | admin@demo.com | admin123 |

---

*Última actualización: 2025*
