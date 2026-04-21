import os
import secrets
from datetime import datetime, timedelta
from typing import Optional, Any
from pydantic import BaseModel
import bcrypt
import logging

from database import (
    get_supabase, get_supabase_service, is_configured,
    TABLE_USERS, TABLE_TOKENS, TABLE_HISTORY, TABLE_API_KEYS, TABLE_TEAM,
    table, table_service, init_database
)

logger = logging.getLogger(__name__)

class User(BaseModel):
    id: str
    email: str
    password_hash: str
    name: str
    created_at: datetime
    subscription_tier: str = "free"
    subscription_status: str = "inactive"
    subscription_id: Optional[str] = None
    subscription_end: Optional[datetime] = None
    stripe_customer_id: Optional[str] = None
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    email_verified: bool = False
    verification_token: Optional[str] = None
    onboarding_completed: bool = False
    onboarding_answers: Optional[dict] = None
    referral_code: Optional[str] = None
    referred_by: Optional[str] = None
    referral_bonus_months: int = 0
    auth_provider: str = "email"
    google_id: Optional[str] = None
    picture: Optional[str] = None

class Token(BaseModel):
    token: str
    user_id: str
    expires_at: datetime

USERS_DB: dict[str, User] = {}
TOKENS_DB: dict[str, Token] = {}

MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

USE_SUPABASE = False

def init_auth():
    global USE_SUPABASE
    if is_configured():
        try:
            init_database()
            USE_SUPABASE = True
            logger.info("Usando Supabase como base de datos")
        except Exception as e:
            logger.warning(f"Error inicializando Supabase: {e}, usando fallback en memoria")
    else:
        logger.info("Supabase no configurado, usando base de datos en memoria")

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hash.encode('utf-8'))
    except Exception:
        return False

def generate_token() -> str:
    return secrets.token_urlsafe(32)

def generate_referral_code() -> str:
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "KAI-" + "".join(secrets.choice(chars) for _ in range(4))

def get_user_by_referral_code(code: str) -> Optional[User]:
    if USE_SUPABASE:
        try:
            result = table(TABLE_USERS).select("*").eq("referral_code", code).execute()
            if result.data:
                return _user_from_dict(result.data[0])
        except Exception as e:
            logger.error(f"Error finding user by referral code: {e}")
    else:
        for user in USERS_DB.values():
            if user.referral_code == code:
                return user
    return None

def get_referrals_count(user_id: str) -> int:
    if USE_SUPABASE:
        try:
            result = table(TABLE_USERS).select("id", count="exact").eq("referred_by", user_id).execute()
            return result.count or 0
        except Exception as e:
            logger.error(f"Error counting referrals: {e}")
            return 0
    else:
        return sum(1 for u in USERS_DB.values() if u.referred_by == user_id)

def get_converted_referrals(user_id: str) -> int:
    if USE_SUPABASE:
        try:
            result = table(TABLE_USERS).select("id", count="exact").eq("referred_by", user_id).eq("subscription_tier", "pro").execute()
            return result.count or 0
        except Exception as e:
            logger.error(f"Error counting converted referrals: {e}")
            return 0
    else:
        return sum(1 for u in USERS_DB.values() if u.referred_by == user_id and u.subscription_tier == "pro")

def _process_referral_bonus(referrer_user_id: str):
    try:
        referrer = get_user_by_id(referrer_user_id)
        if not referrer:
            return
        new_bonus = referrer.referral_bonus_months + 1
        if USE_SUPABASE:
            table(TABLE_USERS).update({"referral_bonus_months": new_bonus}).eq("id", referrer_user_id).execute()
        else:
            referrer.referral_bonus_months = new_bonus
        logger.info(f"Added referral bonus to user {referrer_user_id}, total: {new_bonus}")
    except Exception as e:
        logger.error(f"Error processing referral bonus: {e}")

def _user_from_dict(data: dict) -> User:
    onboarding_answers = data.get("onboarding_answers")
    if onboarding_answers and isinstance(onboarding_answers, str):
        import json
        onboarding_answers = json.loads(onboarding_answers)
    return User(
        id=data.get("id", ""),
        email=data.get("email", ""),
        password_hash=data.get("password_hash", ""),
        name=data.get("name", ""),
        created_at=data.get("created_at", datetime.now()),
        subscription_tier=data.get("subscription_tier", "free"),
        subscription_status=data.get("subscription_status", "inactive"),
        subscription_id=data.get("subscription_id"),
        subscription_end=data.get("subscription_end"),
        stripe_customer_id=data.get("stripe_customer_id"),
        failed_login_attempts=data.get("failed_login_attempts", 0),
        locked_until=data.get("locked_until"),
        email_verified=data.get("email_verified", False),
        verification_token=data.get("verification_token"),
        onboarding_completed=data.get("onboarding_completed", False),
        onboarding_answers=onboarding_answers,
        referral_code=data.get("referral_code"),
        referred_by=data.get("referred_by"),
        referral_bonus_months=data.get("referral_bonus_months", 0)
    )

def _token_from_dict(data: dict) -> Token:
    return Token(
        token=data.get("token", ""),
        user_id=data.get("user_id", ""),
        expires_at=data.get("expires_at", datetime.now())
    )

def create_user(email: str, password: str, name: str, referred_by: Optional[str] = None) -> Optional[User]:
    verification_token = secrets.token_urlsafe(32)
    referral_code = generate_referral_code()
    if USE_SUPABASE:
        try:
            existing = table(TABLE_USERS).select("id").eq("email", email).execute()
            if existing.data:
                return None

            user_data = {
                "email": email,
                "password_hash": hash_password(password),
                "name": name,
                "subscription_tier": "free",
                "subscription_status": "inactive",
                "email_verified": False,
                "verification_token": verification_token,
                "referral_code": referral_code,
                "referred_by": referred_by,
                "referral_bonus_months": 0
            }
            result = table(TABLE_USERS).insert(user_data).execute()
            if result.data:
                user = _user_from_dict(result.data[1]) if len(result.data) > 1 else _user_from_dict(result.data[0])
                user.verification_token = verification_token
                return user
        except Exception as e:
            logger.error(f"Error creating user in Supabase: {e}")
            return None
    else:
        if any(u.email == email for u in USERS_DB.values()):
            return None

        user = User(
            id=secrets.token_urlsafe(16),
            email=email,
            password_hash=hash_password(password),
            name=name,
            created_at=datetime.now(),
            email_verified=False,
            verification_token=verification_token,
            referral_code=referral_code,
            referred_by=referred_by,
            referral_bonus_months=0
        )
        USERS_DB[user.id] = user
    return user

def get_user_by_email(email: str) -> Optional[User]:
    if USE_SUPABASE:
        try:
            result = table(TABLE_USERS).select("*").eq("email", email).execute()
            if result.data:
                return _user_from_dict(result.data[0])
        except Exception as e:
            logger.error(f"Error getting user from Supabase: {e}")
    else:
        for user in USERS_DB.values():
            if user.email == email:
                return user
    return None

def get_user_by_id(user_id: str) -> Optional[User]:
    if USE_SUPABASE:
        try:
            result = table(TABLE_USERS).select("*").eq("id", user_id).execute()
            if result.data:
                return _user_from_dict(result.data[0])
        except Exception as e:
            logger.error(f"Error getting user from Supabase: {e}")
    else:
        return USERS_DB.get(user_id)
    return None

def create_token(user_id: str) -> Token:
    token = Token(
        token=generate_token(),
        user_id=user_id,
        expires_at=datetime.now() + timedelta(days=30)
    )

    if USE_SUPABASE:
        try:
            token_data = {
                "user_id": user_id,
                "token": token.token,
                "expires_at": token.expires_at.isoformat()
            }
            table(TABLE_TOKENS).insert(token_data).execute()
        except Exception as e:
            logger.error(f"Error creating token in Supabase: {e}")
    else:
        TOKENS_DB[token.token] = token

    return token

def verify_token(token: str) -> Optional[User]:
    if USE_SUPABASE:
        try:
            result = table(TABLE_TOKENS).select("*,users!inner(*)").eq("token", token).execute()
            if result.data and result.data[0].get("users"):
                token_data = result.data[0]
                expires_at = token_data.get("expires_at")
                if expires_at and datetime.fromisoformat(expires_at.replace('Z', '+00:00')) < datetime.now():
                    table(TABLE_TOKENS).delete().eq("token", token).execute()
                    return None
                return _user_from_dict(token_data["users"])
        except Exception as e:
            logger.error(f"Error verifying token in Supabase: {e}")
    else:
        token_obj = TOKENS_DB.get(token)
        if not token_obj:
            return None
        if token_obj.expires_at < datetime.now():
            del TOKENS_DB[token]
            return None
        return USERS_DB.get(token_obj.user_id)
    return None

def login(email: str, password: str) -> Optional[Token]:
    user = get_user_by_email(email)
    if not user:
        return None

    if user.locked_until and datetime.now() < user.locked_until:
        return None

    if not verify_password(password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
            user.locked_until = datetime.now() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            user.failed_login_attempts = 0

        if USE_SUPABASE:
            try:
                table(TABLE_USERS).update({
                    "failed_login_attempts": user.failed_login_attempts,
                    "locked_until": user.locked_until.isoformat() if user.locked_until else None
                }).eq("id", user.id).execute()
            except Exception as e:
                logger.error(f"Error updating failed attempts: {e}")

        return None

    user.failed_login_attempts = 0
    user.locked_until = None

    if USE_SUPABASE:
        try:
            table(TABLE_USERS).update({
                "failed_login_attempts": 0,
                "locked_until": None
            }).eq("id", user.id).execute()
        except Exception as e:
            logger.error(f"Error resetting failed attempts: {e}")

    return create_token(user.id)

def update_subscription(user_id: str, tier: str, status: str, subscription_id: str = None, end_date: datetime = None):
    update_data = {
        "subscription_tier": tier,
        "subscription_status": status
    }
    if subscription_id:
        update_data["subscription_id"] = subscription_id
    if end_date:
        update_data["subscription_end"] = end_date.isoformat()

    if USE_SUPABASE:
        try:
            table(TABLE_USERS).update(update_data).eq("id", user_id).execute()
        except Exception as e:
            logger.error(f"Error updating subscription: {e}")
    else:
        user = USERS_DB.get(user_id)
        if user:
            user.subscription_tier = tier
            user.subscription_status = status
            user.subscription_id = subscription_id
            user.subscription_end = end_date

def get_user_tier(user_id: str) -> str:
    user = get_user_by_id(user_id)
    if not user:
        return "free"
    if user.subscription_status == "active":
        return user.subscription_tier
    return "free"

TIER_LIMITS = {
    "free": {"analyses": 3, "features": ["basic"]},
    "pro": {"analyses": -1, "features": ["basic", "abuela", "history", "export"]},
    "business": {"analyses": -1, "features": ["basic", "abuela", "history", "export", "api", "team"]}
}

def has_feature(user_id: str, feature: str) -> bool:
    tier = get_user_tier(user_id)
    limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])
    return feature in limits["features"]

def can_analyze(user_id: str, used: int) -> tuple[bool, int]:
    tier = get_user_tier(user_id)
    limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])

    if limits["analyses"] == -1:
        return True, -1

    if used >= limits["analyses"]:
        return False, limits["analyses"]

    return True, limits["analyses"] - used

HISTORY_DB: dict[str, list] = {}

def add_to_history(user_id: str, analisis_data: dict):
    if USE_SUPABASE:
        try:
            history_data = {
                "user_id": user_id,
                "texto_preview": analisis_data.get("texto_preview", ""),
                "veredicto": analisis_data.get("veredicto", ""),
                "confianza": analisis_data.get("confianza", 0),
                "resultado": analisis_data.get("resultado", {})
            }
            table(TABLE_HISTORY).insert(history_data).execute()
        except Exception as e:
            logger.error(f"Error adding to history in Supabase: {e}")
    else:
        if user_id not in HISTORY_DB:
            HISTORY_DB[user_id] = []
        HISTORY_DB[user_id].insert(0, {
            "id": secrets.token_urlsafe(8),
            "timestamp": datetime.now().isoformat(),
            "texto_preview": analisis_data.get("texto_preview", ""),
            "veredicto": analisis_data.get("veredicto", ""),
            "confianza": analisis_data.get("confianza", 0),
            "resultado": analisis_data
        })
        if len(HISTORY_DB[user_id]) > 100:
            HISTORY_DB[user_id] = HISTORY_DB[user_id][:100]

def get_history(user_id: str, limit: int = 20) -> list:
    if USE_SUPABASE:
        try:
            result = table(TABLE_HISTORY).select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
            if result.data:
                return [{
                    "id": h["id"],
                    "timestamp": h["created_at"],
                    "texto_preview": h["texto_preview"],
                    "veredicto": h["veredicto"],
                    "confianza": h["confianza"],
                    "resultado": h["resultado"]
                } for h in result.data]
        except Exception as e:
            logger.error(f"Error getting history from Supabase: {e}")
    else:
        return HISTORY_DB.get(user_id, [])[:limit]
    return []

def clear_history(user_id: str):
    if USE_SUPABASE:
        try:
            table(TABLE_HISTORY).delete().eq("user_id", user_id).execute()
        except Exception as e:
            logger.error(f"Error clearing history in Supabase: {e}")
    else:
        HISTORY_DB[user_id] = []

API_KEYS_DB: dict[str, dict] = {}

def create_api_key(user_id: str, name: str) -> str:
    api_key = f"kn_live_{secrets.token_urlsafe(32)}"

    if USE_SUPABASE:
        try:
            key_data = {
                "user_id": user_id,
                "key": api_key,
                "name": name,
                "requests_count": 0
            }
            table(TABLE_API_KEYS).insert(key_data).execute()
        except Exception as e:
            logger.error(f"Error creating API key in Supabase: {e}")
    else:
        API_KEYS_DB[api_key] = {
            "user_id": user_id,
            "name": name,
            "created_at": datetime.now().isoformat(),
            "last_used": None,
            "requests_count": 0
        }

    return api_key

def verify_api_key(api_key: str) -> Optional[str]:
    if USE_SUPABASE:
        try:
            result = table(TABLE_API_KEYS).select("user_id").eq("key", api_key).execute()
            if result.data:
                user_id = result.data[0]["user_id"]
                table(TABLE_API_KEYS).update({
                    "last_used": datetime.now().isoformat()
                }).eq("key", api_key).execute()
                return user_id
        except Exception as e:
            logger.error(f"Error verifying API key in Supabase: {e}")
    else:
        key_data = API_KEYS_DB.get(api_key)
        if key_data:
            key_data["last_used"] = datetime.now().isoformat()
            key_data["requests_count"] += 1
            return key_data["user_id"]
    return None

def get_api_keys(user_id: str) -> list:
    if USE_SUPABASE:
        try:
            result = table(TABLE_API_KEYS).select("*").eq("user_id", user_id).execute()
            if result.data:
                return [{
                    "id": k["id"],
                    "key": k["key"][-12:] + "...",
                    "name": k["name"],
                    "created": k["created_at"],
                    "last_used": k.get("last_used"),
                    "requests": k.get("requests_count", 0)
                } for k in result.data]
        except Exception as e:
            logger.error(f"Error getting API keys from Supabase: {e}")
    else:
        return [
            {"key": k, "name": v["name"], "created": v["created_at"], "last_used": v["last_used"], "requests": v["requests_count"]}
            for k, v in API_KEYS_DB.items()
            if v["user_id"] == user_id
        ]
    return []

def delete_api_key(api_key_suffix: str, user_id: str) -> bool:
    if USE_SUPABASE:
        try:
            result = table(TABLE_API_KEYS).select("id").eq("user_id", user_id).execute()
            for k in result.data:
                if k["id"].endswith(api_key_suffix) or api_key_suffix in k["id"]:
                    table(TABLE_API_KEYS).delete().eq("id", k["id"]).execute()
                    return True
        except Exception as e:
            logger.error(f"Error deleting API key in Supabase: {e}")
    else:
        for key, data in API_KEYS_DB.items():
            if data["user_id"] == user_id and api_key_suffix in key:
                del API_KEYS_DB[key]
                return True
    return False

TEAM_DB: dict[str, list] = {}

def init_team_for_user(user_id: str, user_email: str, user_name: str):
    if not get_team_members(user_id):
        if USE_SUPABASE:
            try:
                team_data = {
                    "owner_id": user_id,
                    "name": user_name,
                    "email": user_email,
                    "role": "admin"
                }
                table(TABLE_TEAM).insert(team_data).execute()
            except Exception as e:
                logger.error(f"Error init team in Supabase: {e}")
        else:
            if user_id not in TEAM_DB:
                TEAM_DB[user_id] = [
                    {"id": secrets.token_urlsafe(8), "name": user_name, "email": user_email, "role": "admin", "joined_at": datetime.now().isoformat()}
                ]

def get_team_members(user_id: str) -> list:
    if USE_SUPABASE:
        try:
            result = table(TABLE_TEAM).select("*").eq("owner_id", user_id).execute()
            if result.data:
                return [{
                    "id": m["id"],
                    "name": m["name"],
                    "email": m["email"],
                    "role": m["role"],
                    "joined_at": m["joined_at"]
                } for m in result.data]
        except Exception as e:
            logger.error(f"Error getting team from Supabase: {e}")
    else:
        return TEAM_DB.get(user_id, [])
    return []

def add_team_member(owner_id: str, name: str, email: str) -> dict:
    member = {
        "id": secrets.token_urlsafe(8),
        "name": name,
        "email": email,
        "role": "member",
        "joined_at": datetime.now().isoformat(),
        "invited_by": owner_id
    }

    if USE_SUPABASE:
        try:
            team_data = {
                "owner_id": owner_id,
                "name": name,
                "email": email,
                "role": "member"
            }
            result = table(TABLE_TEAM).insert(team_data).execute()
            if result.data:
                return {
                    "id": result.data[0]["id"],
                    "name": result.data[0]["name"],
                    "email": result.data[0]["email"],
                    "role": result.data[0]["role"],
                    "joined_at": result.data[0]["joined_at"]
                }
        except Exception as e:
            logger.error(f"Error adding team member in Supabase: {e}")
    else:
        if owner_id not in TEAM_DB:
            TEAM_DB[owner_id] = []
        TEAM_DB[owner_id].append(member)

    return member

def remove_team_member(owner_id: str, member_id: str) -> bool:
    if USE_SUPABASE:
        try:
            table(TABLE_TEAM).delete().eq("id", member_id).eq("owner_id", owner_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error removing team member in Supabase: {e}")
    else:
        if owner_id in TEAM_DB:
            original_len = len(TEAM_DB[owner_id])
            TEAM_DB[owner_id] = [m for m in TEAM_DB[owner_id] if m["id"] != member_id or m["role"] == "admin"]
            return len(TEAM_DB[owner_id]) < original_len
    return False

DEMO_USERS = [
    {"email": "free@demo.com", "password": "demo123", "name": "Usuario Free", "tier": "free", "status": "active"},
    {"email": "pro@demo.com", "password": "demo123", "name": "Usuario Pro", "tier": "pro", "status": "active"},
    {"email": "business@demo.com", "password": "demo123", "name": "Usuario Business", "tier": "business", "status": "active"},
    {"email": "admin@demo.com", "password": "admin123", "name": "Administrador", "tier": "admin", "status": "active"}
]

def init_demo_users():
    if USE_SUPABASE:
        from database import init_demo_users as db_init_demo
        db_init_demo()
    else:
        for demo in DEMO_USERS:
            if not any(u.email == demo["email"] for u in USERS_DB.values()):
                user = User(
                    id=secrets.token_urlsafe(16),
                    email=demo["email"],
                    password_hash=hash_password(demo["password"]),
                    name=demo["name"],
                    created_at=datetime.now(),
                    subscription_tier=demo["tier"],
                    subscription_status=demo["status"]
                )
                USERS_DB[user.id] = user
                create_token(user.id)

init_demo_users()

VERIFICATION_TOKENS: dict[str, str] = {}

def verify_email(token: str) -> bool:
    global VERIFICATION_TOKENS
    if USE_SUPABASE:
        try:
            result = table(TABLE_USERS).select("*").eq("verification_token", token).execute()
            if result.data:
                user_data = result.data[0]
                table(TABLE_USERS).update({
                    "email_verified": True,
                    "verification_token": None
                }).eq("id", user_data["id"]).execute()
                return True
        except Exception as e:
            logger.error(f"Error verifying email in Supabase: {e}")
    else:
        user_id = VERIFICATION_TOKENS.get(token)
        if user_id and user_id in USERS_DB:
            user = USERS_DB[user_id]
            user.email_verified = True
            user.verification_token = None
            return True
    return False

def get_user_by_verification_token(token: str) -> Optional[User]:
    if USE_SUPABASE:
        try:
            result = table(TABLE_USERS).select("*").eq("verification_token", token).execute()
            if result.data:
                return _user_from_dict(result.data[0])
        except Exception as e:
            logger.error(f"Error getting user by verification token: {e}")
    else:
        user_id = VERIFICATION_TOKENS.get(token)
        if user_id:
            return USERS_DB.get(user_id)
    return None

def is_email_verified(user_id: str) -> bool:
    user = get_user_by_id(user_id)
    if not user:
        return False
    return user.email_verified

def must_verify_email(user_id: str) -> bool:
    user = get_user_by_id(user_id)
    if not user:
        return False
    if user.subscription_tier in ["pro", "business"]:
        return not user.email_verified
    return False

def save_onboarding(user_id: str, answers: dict) -> bool:
    if USE_SUPABASE:
        try:
            table(TABLE_USERS).update({
                "onboarding_completed": True,
                "onboarding_answers": answers
            }).eq("id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error saving onboarding in Supabase: {e}")
    else:
        user = USERS_DB.get(user_id)
        if user:
            user.onboarding_completed = True
            user.onboarding_answers = answers
            return True
    return False

def is_first_login(user_id: str) -> bool:
    user = get_user_by_id(user_id)
    if not user:
        return False
    return not user.onboarding_completed

def get_user_stats(user_id: str) -> dict:
    history = get_history(user_id, limit=100)
    veredictes = {}
    for h in history:
        v = h.get("veredicto", "UNKNOWN")
        veredictes[v] = veredictes.get(v, 0) + 1
    
    total = len(history)
    return {
        "total_analyses": total,
        "veredict_distribution": veredictes,
        "subscription_tier": get_user_tier(user_id),
    }

def get_team_member_usage(owner_id: str, member_id: str) -> dict:
    history = get_history(owner_id, limit=100)
    member_history = [h for h in history if h.get("member_id") == member_id]
    return {
        "member_id": member_id,
        "total_analysis": len(member_history),
    }

PASSWORD_RESET_TOKENS: dict[str, dict] = {}
RESET_TOKEN_EXPIRY_HOURS = 1

def request_password_reset(email: str) -> Optional[str]:
    user = get_user_by_email(email)
    if not user:
        return None
    
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(hours=RESET_TOKEN_EXPIRY_HOURS)
    
    PASSWORD_RESET_TOKENS[token] = {
        "user_id": user.id,
        "expires_at": expires_at
    }
    
    return token

def verify_password_reset_token(token: str) -> Optional[str]:
    token_data = PASSWORD_RESET_TOKENS.get(token)
    if not token_data:
        return None
    
    if datetime.now() > token_data["expires_at"]:
        del PASSWORD_RESET_TOKENS[token]
        return None
    
    return token_data["user_id"]

def reset_password(user_id: str, new_password: str) -> bool:
    password_hash = hash_password(new_password)
    
    if USE_SUPABASE:
        try:
            table(TABLE_USERS).update({
                "password_hash": password_hash,
                "failed_login_attempts": 0,
                "locked_until": None
            }).eq("id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error resetting password in Supabase: {e}")
            return False
    else:
        user = USERS_DB.get(user_id)
        if not user:
            return False
        user.password_hash = password_hash
        user.failed_login_attempts = 0
        user.locked_until = None
        return True

def cleanup_expired_reset_tokens():
    now = datetime.now()
    expired = [t for t, data in PASSWORD_RESET_TOKENS.items() if now > data["expires_at"]]
    for t in expired:
        del PASSWORD_RESET_TOKENS[t]