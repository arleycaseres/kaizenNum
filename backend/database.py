import os
import logging
from supabase import create_client, Client
from typing import Optional, Any

logger = logging.getLogger(__name__)

supabase_url: str = os.getenv("SUPABASE_URL", "")
supabase_key: str = os.getenv("SUPABASE_KEY", "")
supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")

_client: Optional[Client] = None
_service_client: Optional[Client] = None

def get_supabase() -> Optional[Client]:
    global _client
    if not supabase_url or not supabase_key:
        logger.warning("Supabase no configurado: SUPABASE_URL o SUPABASE_KEY faltante")
        return None
    if _client is None:
        _client = create_client(supabase_url, supabase_key)
        logger.info(f"Cliente Supabase conectado: {supabase_url}")
    return _client

def get_supabase_service() -> Optional[Client]:
    global _service_client
    if not supabase_url or not supabase_service_key:
        return get_supabase()
    if _service_client is None:
        _service_client = create_client(supabase_url, supabase_service_key)
    return _service_client

def is_configured() -> bool:
    return bool(supabase_url and supabase_key)

TABLE_USERS = "users"
TABLE_TOKENS = "auth_tokens"
TABLE_HISTORY = "analysis_history"
TABLE_API_KEYS = "api_keys"
TABLE_TEAM = "team_members"

def table(table_name: str):
    client = get_supabase()
    if not client:
        return None
    return client.table(table_name)

def table_service(table_name: str):
    client = get_supabase_service()
    if not client:
        return None
    return client.table(table_name)

def init_demo_users():
    """Inserta usuarios demo si no existen"""
    if not is_configured():
        logger.warning("Supabase no configurado, saltando init_demo_users")
        return False

    import bcrypt

    # Generar hashes para las contraseñas
    demo123_hash = bcrypt.hashpw(b"demo123", bcrypt.gensalt(rounds=12)).decode('utf-8')
    admin123_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt(rounds=12)).decode('utf-8')

    users = [
        {
            "id": "00000000-0000-0000-0000-000000000001",
            "email": "free@demo.com",
            "password_hash": demo123_hash,
            "name": "Usuario Free",
            "subscription_tier": "free",
            "subscription_status": "active"
        },
        {
            "id": "00000000-0000-0000-0000-000000000002",
            "email": "pro@demo.com",
            "password_hash": demo123_hash,
            "name": "Usuario Pro",
            "subscription_tier": "pro",
            "subscription_status": "active"
        },
        {
            "id": "00000000-0000-0000-0000-000000000003",
            "email": "business@demo.com",
            "password_hash": demo123_hash,
            "name": "Usuario Business",
            "subscription_tier": "business",
            "subscription_status": "active"
        },
        {
            "id": "00000000-0000-0000-0000-000000000004",
            "email": "admin@demo.com",
            "password_hash": admin123_hash,
            "name": "Administrador",
            "subscription_tier": "admin",
            "subscription_status": "active"
        }
    ]

    try:
        # Intentar obtener usuario existente
        for user in users:
            existing = table(TABLE_USERS).select("id").eq("email", user["email"]).execute()
            if not existing.data:
                table(TABLE_USERS).insert(user).execute()
                logger.info(f"Usuario demo insertado: {user['email']}")
            else:
                logger.info(f"Usuario demo ya existe: {user['email']}")
        return True
    except Exception as e:
        logger.error(f"Error inserting demo users: {e}")
        return False

def init_database():
    """Inicializa la base de datos"""
    if not is_configured():
        logger.warning("Supabase no configurado")
        return False

    logger.info("Inicializando base de datos Supabase...")
    init_demo_users()
    return True