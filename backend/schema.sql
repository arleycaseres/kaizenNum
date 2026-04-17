-- =====================================================
-- KAIZEN Protect - Schema de Base de Datos Supabase
-- =====================================================
-- Ejecutar este SQL en el SQL Editor de Supabase
-- =====================================================

-- 1. Tabla de usuarios
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
    locked_until TIMESTAMP WITH TIME ZONE,
    referral_code TEXT,
    referred_by TEXT,
    referral_bonus_months INTEGER DEFAULT 0
);

-- 2. Tabla de tokens de autenticación
CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de historial de análisis
CREATE TABLE IF NOT EXISTS analysis_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    texto_preview TEXT NOT NULL,
    veredicto TEXT NOT NULL,
    confianza INTEGER NOT NULL,
    resultado JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE,
    requests_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de miembros de equipo
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

-- =====================================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user ON analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON analysis_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_team_owner ON team_members(owner_id);

-- =====================================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policies para users
CREATE POLICY "Anyone can create users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Policies para auth_tokens
CREATE POLICY "Anyone can create tokens" ON auth_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read tokens" ON auth_tokens FOR SELECT USING (true);
CREATE POLICY "Anyone can delete tokens" ON auth_tokens FOR DELETE USING (true);

-- Policies para analysis_history
CREATE POLICY "Anyone can create history" ON analysis_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own history" ON analysis_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own history" ON analysis_history FOR DELETE USING (auth.uid() = user_id);

-- Policies para api_keys (solo Business)
CREATE POLICY "Anyone can create api_keys" ON api_keys FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own api_keys" ON api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own api_keys" ON api_keys FOR DELETE USING (auth.uid() = user_id);

-- Policies para team_members
CREATE POLICY "Anyone can create team" ON team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own team" ON team_members FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can update own team" ON team_members FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own team" ON team_members FOR DELETE USING (auth.uid() = owner_id);

-- =====================================================
-- USUARIOS DEMO (para pruebas)
-- =====================================================

-- Free user
INSERT INTO users (id, email, password_hash, name, subscription_tier, subscription_status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'free@demo.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY6KrX6x5Ya',  --demo123
    'Usuario Free',
    'free',
    'active'
) ON CONFLICT (email) DO NOTHING;

-- Pro user
INSERT INTO users (id, email, password_hash, name, subscription_tier, subscription_status)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'pro@demo.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY6KrX6x5Ya',  --demo123
    'Usuario Pro',
    'pro',
    'active'
) ON CONFLICT (email) DO NOTHING;

-- Business user
INSERT INTO users (id, email, password_hash, name, subscription_tier, subscription_status)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'business@demo.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY6KrX6x5Ya',  --demo123
    'Usuario Business',
    'business',
    'active'
) ON CONFLICT (email) DO NOTHING;

-- Admin user
INSERT INTO users (id, email, password_hash, name, subscription_tier, subscription_status)
VALUES (
    '00000000-0000-0000-0000-000000000004',
    'admin@demo.com',
    '$2b$12$K3pDhN8vGZxJyP9oLHAkCOYz6TtxMQJqhN8/LewY5GyY6KrX6x5Yb',  --admin123
    'Administrador',
    'admin',
    'active'
) ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- NOTA: password_hash es bcrypt de las contraseñas:
-- demo123 -> $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY6KrX6x5Ya
-- admin123 -> $2b$12$K3pDhN8vGZxJyP9oLHAkCOYz6TtxMQJqhN8/LewY5GyY6KrX6x5Yb
-- =====================================================