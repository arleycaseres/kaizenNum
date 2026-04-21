import os
import logging
from urllib.parse import urlencode
import secrets

logger = logging.getLogger(__name__)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

SCOPES = [
    "openid",
    "email",
    "profile"
]

def is_configured() -> bool:
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)

def get_google_auth_url(state: str = None) -> str:
    if not state:
        state = secrets.token_urlsafe(16)
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

def get_tokens(code: str) -> dict:
    import requests
    
    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": GOOGLE_REDIRECT_URI
    }
    
    response = requests.post(GOOGLE_TOKEN_URL, data=data)
    response.raise_for_status()
    return response.json()

def get_user_info(access_token: str) -> dict:
    import requests
    
    response = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"}
    )
    response.raise_for_status()
    return response.json()

def process_google_user(google_user: dict) -> tuple[str, dict]:
    google_id = google_user["sub"]
    email = google_user["email"]
    name = google_user.get("name", email.split("@")[0])
    picture = google_user.get("picture")
    
    from auth_system import get_user_by_email, create_user, create_token, USE_SUPABASE
    
    user = get_user_by_email(email)
    
    if user:
        if user.auth_provider != "google":
            raise ValueError("Este email ya está registrado. Usa el método original.")
        
        token = create_token(user.id)
        return token, user
    
    user_id = secrets.token_urlsafe(16)
    
    created_user = create_user(
        user_id=user_id,
        email=email,
        name=name,
        auth_provider="google",
        google_id=google_id,
        picture=picture
    )
    
    token = create_token(user_id)
    
    return token, created_user