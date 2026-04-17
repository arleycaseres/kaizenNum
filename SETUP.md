# CONFIGURACIÓN REQUERIDA - KAIZEN Protect

Este archivo lista todo lo que necesitas configurar para poner el proyecto en producción.

---

## 1. CUENTAS NECESARIAS

### 1.1 Anthropic (API de IA) - REQUERIDO
- URL: https://console.anthropic.com
- Crear API key y agregar en `.env`

### 1.2 Supabase (Base de datos) - REQUERIDO PARA PRODUCCIÓN
**Gratis hasta 500MB**

1. Ve a https://supabase.com
2. Crea cuenta con GitHub
3. Crea nuevo proyecto → "kaizen-protect"
4. Selecciona región: us-east-1 (o la más cercana)
5. En Settings → API:
   - `SUPABASE_URL`: algo como `https://xxxxx.supabase.co`
   - `SUPABASE_KEY`: la "anon public" key
   - `SUPABASE_SERVICE_KEY`: la "service_role" key (para operaciones privilegiadas)

### 1.3 Stripe (Pagos) - OPCIONAL
**Gratis, solo cobra cuando ganas dinero**

1. Ve a https://stripe.com
2. Crea cuenta
3. Ve a Developers → API Keys
4. Copia las keys en `.env`

---

## 2. ESQUEMA DE BASE DE DATOS

En Supabase SQL Editor, ejecuta el contenido de `backend/schema.sql`:

```sql
-- Este archivo contiene:
-- - Tablas: users, auth_tokens, analysis_history, api_keys, team_members
-- - Índices para rendimiento
-- - Políticas RLS
-- - Usuarios demo
```

O copia y pega directamente:

```sql
-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'business', 'admin')),
    subscription_status TEXT DEFAULT 'inactive',
    subscription_id TEXT,
    subscription_end TIMESTAMP WITH TIME ZONE,
    stripe_customer_id TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE
);

-- Tabla de tokens
CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Historial de análisis
CREATE TABLE IF NOT EXISTS analysis_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    texto_preview TEXT NOT NULL,
    veredicto TEXT NOT NULL,
    confianza INTEGER NOT NULL,
    resultado JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE,
    requests_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Miembros de equipo
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID,
    email_sent BOOLEAN DEFAULT FALSE
);

-- Índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tokens_token ON auth_tokens(token);
CREATE INDEX idx_history_user ON analysis_history(user_id);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_team_owner ON team_members(owner_id);

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
```

---

## 3. VARIABLES DE ENTORNO

Edita `backend/.env`:

```env
# === ANTHROPIC (REQUERIDO) ===
ANTHROPIC_API_KEY=sk-ant-api03-xxx

# === SUPABASE (OBLIGATORIO EN PRODUCCIÓN) ===
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx

# === STRIPE (OPCIONAL) ===
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_xxx

# === SEGURIDAD ===
CORS_ORIGINS=http://localhost:5173

# === FRONTEND ===
FRONTEND_URL=http://localhost:5173
```

---

## 4. USUARIOS DEMO

Los usuarios demo se crean automáticamente. Si no existen, se insertan al iniciar:

| Email | Contraseña | Plan |
|-------|----------|------|
| free@demo.com | demo123 | Free |
| pro@demo.com | demo123 | Pro |
| business@demo.com | demo123 | Business |
| admin@demo.com | admin123 | Admin |

Para regenerar las contraseñas, ejecutar en el SQL Editor:

```sql
-- Generar nuevo hash para demo123
-- Ejecutar: SELECT crypt('demo123', gen_salt(12));
-- Luego actualizar la tabla
```

---

## 5. DESPLIEGUE

### Backend (Railway)
```bash
cd backend && pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Agregar todas las variables de entorno en Railway Dashboard.

### Frontend (Vercel)
```bash
cd frontend
npm run build
```

Variables:
- `VITE_API_URL`: URL del backend

---

## 6. VERIFICACIÓN

```bash
# Health check
curl http://localhost:8000/health

# Demo users
curl http://localhost:8000/api/v1/demo/users

# Probar login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "pro@demo.com", "password": "demo123"}'
```

---

## 7. TROUBLESHOOTING

### "Supabase no configurado"
- Verificar que `SUPABASE_URL` y `SUPABASE_KEY` estén en `.env`
- El sistema usará base de datos en memoria si no hay config

### Error de conexión
- Verificar que el proyecto de Supabase esté activo
- Revisar las credenciales en Settings → API

### Tablas no existen
- Ejecutar `schema.sql` en el SQL Editor de Supabase

---

*Última actualización: 2025*