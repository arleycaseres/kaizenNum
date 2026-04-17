import os
from supabase import create_client, Client
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

class User(BaseModel):
    id: str
    email: str
    created_at: str
    subscription_tier: str = "free"
    analyses_used: int = 0
    analyses_limit: int = 3

class Subscription:
    FREE_LIMIT = 3
    PRO_LIMIT = -1  # ilimitado
    
    TIERS = {
        "free": {"analyses": 3, "price": 0},
        "pro": {"analyses": -1, "price": 7},
        "business": {"analyses": -1, "price": 19}
    }

supabase: Optional[Client] = None

def init_supabase():
    global supabase
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if url and key and url != "your_supabase_url":
        supabase = create_client(url, key)
        return True
    return False

def get_user(user_id: str) -> Optional[User]:
    if not supabase:
        return None
    
    try:
        response = supabase.table("users").select("*").eq("id", user_id).execute()
        if response.data:
            return User(**response.data[0])
    except Exception:
        pass
    return None

def create_user(user_id: str, email: str) -> User:
    user = User(
        id=user_id,
        email=email,
        created_at=datetime.now().isoformat(),
        subscription_tier="free",
        analyses_used=0
    )
    
    if supabase:
        supabase.table("users").insert(user.model_dump()).execute()
    
    return user

def can_analyze(user_id: str) -> tuple[bool, int]:
    user = get_user(user_id)
    
    if not user:
        return True, -1  # Usuario no registrado, permitir
    
    tier_config = Subscription.TIERS.get(user.subscription_tier, Subscription.TIERS["free"])
    limit = tier_config["analyses"]
    
    if limit == -1:  # Ilimitado
        return True, -1
    
    if user.analyses_used >= limit:
        return False, limit
    
    return True, limit - user.analyses_used

def increment_analysis(user_id: str):
    if not supabase:
        return
    
    try:
        user = get_user(user_id)
        if user:
            supabase.table("users").update({
                "analyses_used": user.analyses_used + 1,
                "last_analysis_at": datetime.now().isoformat()
            }).eq("id", user_id).execute()
    except Exception:
        pass

def get_remaining_analyses(user_id: str) -> int:
    user = get_user(user_id)
    if not user:
        return -1
    
    tier_config = Subscription.TIERS.get(user.subscription_tier, Subscription.TIERS["free"])
    limit = tier_config["analyses"]
    
    if limit == -1:
        return -1
    
    return max(0, limit - user.analyses_used)
