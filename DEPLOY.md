# KAIZEN Protect - Guía de Despliegue

Este documento contiene los pasos exactos para desplegar KAIZEN Protect en producción.

---

## Requisitos Previos

1. Cuenta en [Railway](https://railway.app) (backend)
2. Cuenta en [Netlify](https://netlify.com) (frontend)
3. Cuenta en [Supabase](https://supabase.com) (base de datos)
4. Cuenta en [Anthropic](https://console.anthropic.com) (API de IA)
5. Cuenta en [Stripe](https://stripe.com) (pagos, opcional)

---

## Paso 1: Configurar Supabase

### 1.1 Crear proyecto
1. Ir a https://supabase.com y crear nuevo proyecto
2. Nombre: `kaizen-protect`
3. Contraseña de base de datos: guardar para más tarde

### 1.2 Ejecutar schema
1. Ir a SQL Editor en Supabase
2. Copiar contenido de `backend/schema.sql`
3. Ejecutar

### 1.3 Obtener credenciales
1. Ir a Project Settings → API
2. Guardar:
   - `SUPABASE_URL`: URL del proyecto
   - `SUPABASE_KEY`: anon public key
   - `SUPABASE_SERVICE_KEY`: service_role key

---

## Paso 2: Configurar Groq (Gratis) o Anthropic

### Opción A: Groq (RECOMENDADO - Gratis)
1. Ir a https://console.groq.com/keys
2. Crear API key
3. Guardar la key

### Opción B: Anthropic (De pago)
1. Ir a https://console.anthropic.com/
2. Crear API key
3. Guardar la key

---

## Paso 3: Desplegar Backend en Railway

### 3.1 Preparar código
```bash
cd backend
# Ya tiene: requirements.txt, Procfile, railway.json
```

### 3.2 Desplegar
1. Ir a https://railway.app
2. New Project → Deploy from GitHub repo
3. Seleccionar el repositorio
4. En Variables de entorno, agregar:

```env
# IA Provider: groq (gratis) o anthropic (de pago)
AI_PROVIDER=groq
GROQ_API_KEY=gsk_xxxxx
# ANTHROPIC_API_KEY=sk-ant-api03-...  # Si usas anthropic

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJxxx
SUPABASE_SERVICE_KEY=eyJxxx
ENVIRONMENT=production
LOG_LEVEL=INFO
CORS_ORIGINS=https://tu-dominio-netlify.netlify.app
FRONTEND_URL=https://tu-dominio-netlify.netlify.app
```

5. Click en Deploy

### 3.3 Verificar
```bash
# Health check
curl https://tu-backend.railway.app/health

# Debe responder:
{"status":"healthy","timestamp":1234567890}
```

---

## Paso 4: Desplegar Frontend en Netlify

### 4.1 Preparar código
```bash
cd frontend
# Ya tiene: package.json, netlify.toml, vite.config.ts
```

### 4.2 Variables de entorno para producción
Crear variable en Netlify:
- `VITE_API_URL`: URL del backend de Railway (sin http/https, solo el hostname)
  - Por ejemplo: `tu-backend.railway.app`

### 4.3 Desplegar
1. Ir a https://netlify.com
2. Add new site → Import an existing project
3. Conectar con GitHub
4. Seleccionar repositorio
5. Carpeta base: `frontend`
6. Build command: `npm run build`
7. Publish directory: `dist`
8. En Environment variables, agregar:
   - `VITE_API_URL`: URL del backend
9. Click en Deploy

### 4.4 Configurar dominio (opcional)
1. Settings → Domain Management
2. Agregar dominio personalizado

### 4.5 Verificar
```bash
# Frontend
curl https://tu-sitio.netlify.app

# debe responder HTML
```

---

## Paso 5: Configurar Stripe (Opcional)

### 5.1 Obtener credenciales
1. Ir a https://dashboard.stripe.com/apikeys
2. Guardar:
   - `STRIPE_SECRET_KEY`: secret key

### 5.2 Crear productos
1. Ir a Products → Add product
2. Crear:
   - **Pro Mensual**: $7/month
   - **Business Mensual**: $19/month

### 5.3 Copiar Price IDs
1. Ir a Products → cada producto → API ID
2. Copiar Price ID

### 5.4 Actualizar Railway
Agregar variables:
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
```

### 5.5 Configurar Webhook
1. Ir a Developers → Webhooks → Add endpoint
2. URL: `https://tu-backend.railway.app/api/v1/webhooks/stripe`
3. Eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

---

## Verificación Final

### Checklist de funcionamiento

```bash
# 1. Health check
curl https://tu-backend.railway.app/health

# 2. Registro de usuario
curl -X POST https://tu-backend.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "test123", "name": "Test"}'

# 3. Login
curl -X POST https://tu-backend.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "pro@demo.com", "password": "demo123"}'

# 4. Análisis
curl -X POST https://tu-backend.railway.app/api/v1/analizar \
  -H "Content-Type: application/json" \
  -d '{"texto": "Hola, soy del banco y necesito tu contraseña"}'

# 5. Frontend
curl https://tu-sitio.netlify.app
```

### Usuarios Demo (para pruebas)

| Email | Contraseña | Plan |
|-------|----------|------|
| free@demo.com | demo123 | Free |
| pro@demo.com | demo123 | Pro |
| business@demo.com | demo123 | Business |
| admin@demo.com | admin123 | Admin |

---

## URLs de Producción

| Servicio | URL |
|---------|-----|
| Frontend | https://tu-sitio.netlify.app |
| Backend | https://tu-backend.railway.app |
| API Health | https://tu-backend.railway.app/health |
| Stripe Portal | https://billing.stripe.com/p/session/... |

---

## Solución de Problemas

### "Error: Cannot find module"
- Verificar que `requirements.txt` tiene todas las dependencias
- Railway puede necesitar `pip install -r requirements.txt`

### "Error: CORS"
- Verificar `CORS_ORIGINS` incluye el dominio del frontend
- Formato correcto: `https://tu-dominio.netlify.app` (sin trailing slash)

### "Error: Database"
- Verificar que Supabase está activo
- Revisar credenciales en Railway
- Ver que el schema se ejecutó correctamente

### "Health check falla"
- Ver Railway logs: `railway logs`
- Verificar que el puerto es `$PORT`

---

## Despliegue Automático (CI/CD)

El repositorio ya tiene CI/CD configurado en `.github/workflows/ci.yml`.

Cada push a `main` desplegará automáticamente:
- ✅ Tests en CI
- ✅ Build de frontend

Para deploy automático:
1. Conectar Railway con GitHub
2. Conectar Netlify con GitHub

---

*Última actualización: 2026*
*Versión: 1.0.0*