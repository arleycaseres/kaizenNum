import os
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional
import secrets

from ai_analyzer import analizar, analizar_con_imagen
from auth_system import (
    create_user, get_user_by_email, get_user_by_id, login, verify_token,
    update_subscription, get_user_tier, has_feature, can_analyze,
    USERS_DB, Token, add_to_history, get_history, clear_history,
    create_api_key, get_api_keys, delete_api_key, verify_api_key,
    get_team_members, add_team_member, remove_team_member, init_team_for_user, init_auth, USE_SUPABASE,
    verify_email, get_user_by_verification_token, is_email_verified, must_verify_email,
    save_onboarding, is_first_login,
    get_user_by_referral_code, get_referrals_count, get_converted_referrals
)
from stripe_integration import (
    create_checkout_session, create_customer_portal, handle_webhook,
    get_subscription_status, PRICES_DISPLAY
)
from database import is_configured as db_is_configured
from email_service import send_verification_email, send_welcome_email, is_configured as email_is_configured

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

USER_RATE_LIMITS: dict[str, dict] = {}
TOKEN_INACTIVITY_DAYS = 90
CSRF_TOKENS: dict[str, dict] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("KAIZEN Protect API iniciando...")
    init_auth()
    logger.info(f"Usuarios registrados: {len(USERS_DB)}")
    logger.info(f"Base de datos: {'Supabase' if USE_SUPABASE else 'Memoria'}")
    logger.info(f"Supabase configurado: {db_is_configured()}")
    yield
    logger.info("KAIZEN Protect API apagando...")

app = FastAPI(
    title="KAIZEN Protect API",
    description="Detector de manipulación y estafas con IA para LatAm",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,https://kaizen-protect.netlify.app").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    origin = request.headers.get("origin")
    if origin and origin in ALLOWED_ORIGINS:
        response.headers["Content-Security-Policy"] = f"default-src 'self'; frame-ancestors 'none'; form-action 'self'"
    
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    
    return response

@app.on_event("startup")
async def add_hsts_header():
    pass

# Models
class AnalisisRequest(BaseModel):
    texto: str = Field(..., min_length=1, max_length=50000)
    modo: Optional[str] = "normal"
    imagen_base64: Optional[str] = None

class AnalisisResponse(BaseModel):
    veredicto: str
    confianza: int
    explicacion: str
    evidencia: list[str]
    ley_infringida: Optional[str]
    que_hacer: list[str]
    tiempo_ms: int
    remaining: int

class RegisterRequest(BaseModel):
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=1)
    referred_by: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    token: str
    user: dict

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    subscription_tier: str
    subscription_status: str
    onboarding_completed: bool = False
    onboarding_answers: Optional[dict] = None

class SubscriptionStatus(BaseModel):
    authenticated: bool
    tier: str
    status: str
    features: list[str]
    remaining_analyses: int

class CheckoutRequest(BaseModel):
    price_key: str = Field(..., pattern="^(pro_monthly|pro_yearly|business_monthly|business_yearly)$")

class CheckoutResponse(BaseModel):
    url: str
    session_id: str

# Helpers
def get_user_from_token(authorization: Optional[str]) -> Optional[dict]:
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    user = verify_token(token)
    if user:
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "tier": user.subscription_tier,
            "status": user.subscription_status,
            "onboarding_completed": user.onboarding_completed,
            "onboarding_answers": user.onboarding_answers,
            "referral_code": user.referral_code,
            "referral_bonus_months": user.referral_bonus_months
        }
    return None

def require_auth(authorization: Optional[str]) -> dict:
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Autenticación requerida")
    return user

# Routes
@app.get("/")
def root():
    return {"status": "ok", "service": "KAIZEN Protect", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy", "timestamp": int(time.time())}

@app.get("/api/v1/demo/users")
async def get_demo_users():
    if os.getenv("ENVIRONMENT") == "production":
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "users": [
            {"email": "free@demo.com", "password": "demo123", "plan": "Free", "features": ["basic"]},
            {"email": "pro@demo.com", "password": "demo123", "plan": "Pro", "features": ["basic", "abuela", "history", "export"]},
            {"email": "business@demo.com", "password": "demo123", "plan": "Business", "features": ["basic", "abuela", "history", "export", "api", "team"]},
            {"email": "admin@demo.com", "password": "admin123", "plan": "Admin", "features": ["all"]},
        ],
        "note": "Solo disponible en desarrollo"
    }

# Auth Routes
@app.post("/api/v1/auth/register", response_model=TokenResponse)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest):
    referred_code = body.referred_by or None
    if referred_code:
        referrer = get_user_by_referral_code(referred_code)
        if not referrer:
            referred_code = None
    user = create_user(body.email, body.password, body.name, referred_code)
    if not user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    token = login(body.email, body.password)

    if user.verification_token and email_is_configured():
        send_verification_email(user.email, user.verification_token)
        logger.info(f"Email de verificación enviado a {user.email}")

    return TokenResponse(
        token=token.token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "tier": user.subscription_tier,
            "email_verified": user.email_verified,
            "referral_code": user.referral_code
        }
    )

@app.post("/api/v1/auth/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login_route(request: Request, body: LoginRequest):
    token = login(body.email, body.password)
    if not token:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

    user = get_user_by_id(token.user_id)

    if not user.email_verified and email_is_configured():
        raise HTTPException(
            status_code=403,
            detail="Debes verificar tu email antes de usar la cuenta. Revisa tu bandeja de entrada."
        )

    return TokenResponse(
        token=token.token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "tier": user.subscription_tier,
            "email_verified": user.email_verified,
            "onboarding_completed": user.onboarding_completed,
            "onboarding_answers": user.onboarding_answers,
            "referral_code": user.referral_code
        }
    )

@app.get("/api/v1/auth/verify")
async def verify_email_route(token: str):
    user = get_user_by_verification_token(token)
    if not user:
        raise HTTPException(status_code=404, detail="Token de verificación inválido")

    success = verify_email(token)
    if success:
        if email_is_configured():
            send_welcome_email(user.email, user.name)
        return {
            "success": True,
            "message": "Email verificado correctamente",
            "redirect": "/dashboard"
        }
    raise HTTPException(status_code=400, detail="Error al verificar email")

class PasswordResetRequest(BaseModel):
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

class PasswordChangeRequest(BaseModel):
    password: str = Field(..., min_length=6)

@app.post("/api/v1/auth/password-reset")
@limiter.limit("3/minute")
async def request_password_reset_route(body: PasswordResetRequest):
    from auth_system import request_password_reset
    token = request_password_reset(body.email)
    if token and email_is_configured():
        from email_service import send_password_reset_email
        send_password_reset_email(body.email, token)
    return {"success": True, "message": "Si el email existe, recibirás un enlace para restablecer tu contraseña"}

@app.post("/api/v1/auth/password-reset/confirm")
@limiter.limit("5/minute")
async def confirm_password_reset_route(
    token: str,
    body: PasswordChangeRequest
):
    from auth_system import verify_password_reset_token, reset_password
    user_id = verify_password_reset_token(token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    
    success = reset_password(user_id, body.password)
    if not success:
        raise HTTPException(status_code=500, detail="Error al restablecer contraseña")
    
    return {"success": True, "message": "Contraseña restablecida correctamente"}

class OnboardingRequest(BaseModel):
    purpose: str
    channel: str

@app.post("/api/v1/auth/onboarding")
async def save_onboarding_route(
    body: OnboardingRequest,
    authorization: Optional[str] = Header(None)
):
    user = require_auth(authorization)

    answers = {
        "purpose": body.purpose,
        "channel": body.channel
    }

    success = save_onboarding(user["id"], answers)
    if not success:
        raise HTTPException(status_code=500, detail="Error al guardar respuestas")

    return {"success": True, "message": "Onboarding completado"}

@app.get("/api/v1/referrals")
async def get_referrals(authorization: Optional[str] = Header(None)):
    user = require_auth(authorization)
    user_obj = get_user_by_id(user["id"])
    if not user_obj:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    referrals_count = get_referrals_count(user["id"])
    converted_count = get_converted_referrals(user["id"])
    bonus_months = user_obj.referral_bonus_months
    
    return {
        "referral_code": user_obj.referral_code,
        "referrals_count": referrals_count,
        "converted_count": converted_count,
        "bonus_months": bonus_months,
        "referral_link": f"https://kaizenprotect.app?ref={user_obj.referral_code}"
    }

@app.get("/api/v1/auth/me", response_model=UserResponse)
async def get_me(authorization: Optional[str] = Header(None)):
    user = require_auth(authorization)
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        subscription_tier=user["tier"],
        subscription_status=user["status"],
        onboarding_completed=user.get("onboarding_completed", False),
        onboarding_answers=user.get("onboarding_answers")
    )

# Subscription Routes
@app.get("/api/v1/subscription/status", response_model=SubscriptionStatus)
async def subscription_status(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    
    if not user:
        return SubscriptionStatus(
            authenticated=False,
            tier="free",
            status="inactive",
            features=["basic"],
            remaining_analyses=3
        )
    
    tier = get_user_tier(user["id"])
    features = []
    if tier in ["pro", "business"]:
        features = ["basic", "abuela", "history", "export"]
    if tier == "business":
        features.extend(["api", "team"])
    
    remaining = -1 if tier in ["pro", "business"] else 3
    
    return SubscriptionStatus(
        authenticated=True,
        tier=tier,
        status=user["status"],
        features=features,
        remaining_analyses=remaining
    )

@app.get("/api/v1/subscription/plans")
async def get_plans():
    return {"plans": PRICES_DISPLAY}

@app.post("/api/v1/subscription/checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    authorization: Optional[str] = Header(None)
):
    user = require_auth(authorization)
    
    success_url = os.getenv("FRONTEND_URL", "http://localhost:3000") + "/success"
    cancel_url = os.getenv("FRONTEND_URL", "http://localhost:3000") + "/pricing"
    
    result = create_checkout_session(
        user_id=user["id"],
        email=user["email"],
        price_key=body.price_key,
        success_url=success_url,
        cancel_url=cancel_url
    )
    
    if not result:
        raise HTTPException(status_code=503, detail="Pagos no disponibles. Configura Stripe.")
    
    return CheckoutResponse(url=result["url"], session_id=result["session_id"])

@app.get("/api/v1/subscription/portal")
async def get_portal(authorization: Optional[str] = Header(None)):
    user = require_auth(authorization)
    
    return_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    portal_url = create_customer_portal(user["id"], return_url)
    
    if not portal_url:
        raise HTTPException(status_code=503, detail="Portal no disponible")
    
    return {"url": portal_url}

# Stripe Webhook
@app.post("/api/v1/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    
    result = handle_webhook(payload, sig, webhook_secret)
    
    if "error" in result:
        logger.error(f"Stripe webhook error: {result['error']}")
        raise HTTPException(status_code=400, detail=result["error"])
    
    logger.info(f"Stripe webhook processed: {result}")
    return result

# Analysis Routes
@app.post("/api/v1/analizar", response_model=AnalisisResponse)
@limiter.limit("10/minute")
async def analizar_texto(
    request: Request,
    body: AnalisisRequest,
    authorization: Optional[str] = Header(None)
):
    start = time.time()
    user = get_user_from_token(authorization)
    user_id = user["id"] if user else None
    is_demo = user_id is None

    if user_id:
        tier = get_user_tier(user_id)
        if tier == "free":
            remaining = 3
            used = int(os.environ.get(f"user_{user_id}_used", "0"))
            if used >= 3:
                raise HTTPException(
                    status_code=402,
                    detail="Límite alcanzado. Suscríbete a Pro para análisis ilimitados."
                )
            os.environ[f"user_{user_id}_used"] = str(used + 1)
    else:
        demo_used = int(os.environ.get("demo_analisis_used", "0"))
        if demo_used >= 1:
            raise HTTPException(
                status_code=402,
                detail="Has usado tu análisis gratis. Crea una cuenta para continuar."
            )
        os.environ["demo_analisis_used"] = str(demo_used + 1)
    
    logger.info(f"Análisis solicitado desde {request.client.host}")

    try:
        if body.imagen_base64:
            resultado = analizar_con_imagen(body.texto, body.imagen_base64)
        else:
            resultado = analizar(body.texto)

        resultado["tiempo_ms"] = int((time.time() - start) * 1000)

        tier = get_user_tier(user_id) if user_id else "free"
        resultado["remaining"] = -1 if tier in ["pro", "business"] else (0 if is_demo else 3)
        resultado["is_demo"] = is_demo

        if user_id and tier in ["pro", "business"]:
            add_to_history(user_id, {
                "texto_preview": body.texto[:100] + ("..." if len(body.texto) > 100 else ""),
                "veredicto": resultado["veredicto"],
                "confianza": resultado["confianza"],
                "resultado": resultado
            })

        return resultado

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error en análisis: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@app.post("/api/v1/analizar/abuela", response_model=AnalisisResponse)
@limiter.limit("10/minute")
async def analizar_modo_abuela(
    request: Request,
    body: AnalisisRequest,
    authorization: Optional[str] = Header(None)
):
    start = time.time()
    logger.info(f"Análisis modo abuela desde {request.client.host}")
    
    try:
        resultado = analizar(body.texto)
        resultado_abuela = explicar_como_abuela(resultado)
        resultado_abuela["tiempo_ms"] = int((time.time() - start) * 1000)
        resultado_abuela["remaining"] = -1
        return resultado_abuela
    except Exception as e:
        logger.error(f"Error en análisis abuela: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

from explicaciones import explicar_como_abuela

class CreateApiKeyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)

class InviteMemberRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

class HistoryResponse(BaseModel):
    id: str
    timestamp: str
    texto_preview: str
    veredicto: str
    confianza: int
    resultado: dict

class ApiKeyResponse(BaseModel):
    key: str
    name: str
    created: str
    last_used: Optional[str]
    requests: int

class TeamMemberResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    joined_at: str

@app.get("/api/v1/history", response_model=list[HistoryResponse])
async def get_user_history(
    authorization: Optional[str] = Header(None),
    limit: int = 20
):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Autenticación requerida")

    tier = get_user_tier(user["id"])
    if tier not in ["pro", "business"]:
        raise HTTPException(status_code=403, detail="Esta función requiere plan Pro o Business")

    history = get_history(user["id"], limit)
    return history

@app.delete("/api/v1/history")
async def delete_user_history(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Autenticación requerida")

    clear_history(user["id"])
    return {"success": True, "message": "Historial eliminado"}

@app.get("/api/v1/stats")
async def get_user_stats(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Autenticación requerida")
    
    from auth_system import get_user_stats, get_user_tier, get_history
    
    tier = get_user_tier(user["id"])
    if tier not in ["pro", "business"]:
        raise HTTPException(status_code=403, detail="Esta función requiere plan Pro o Business")
    
    stats = get_user_stats(user["id"])
    return stats

@app.get("/api/v1/api-keys", response_model=list[ApiKeyResponse])
async def list_api_keys(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Autenticación requerida")

    tier = get_user_tier(user["id"])
    if tier != "business":
        raise HTTPException(status_code=403, detail="Esta función requiere plan Business")

    keys = get_api_keys(user["id"])
    return [{"id": k["key"][-20:], "key": k["key"][-12:] + "...", "name": k["name"], "created": k["created"], "last_used": k["last_used"], "requests": k["requests"]} for k in keys]

@app.post("/api/v1/api-keys", response_model=dict)
async def create_new_api_key(
    body: CreateApiKeyRequest,
    authorization: Optional[str] = Header(None)
):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Autenticación requerida")

    tier = get_user_tier(user["id"])
    if tier != "business":
        raise HTTPException(status_code=403, detail="Esta función requiere plan Business")

    api_key = create_api_key(user["id"], body.name)
    return {"api_key": api_key, "name": body.name, "message": "Guarda esta clave, no se mostrará de nuevo"}

@app.delete("/api/v1/api-keys/{key_id}")
async def delete_api_key_endpoint(
    key_id: str,
    authorization: Optional[str] = Header(None)
):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Autenticación requerida")

    tier = get_user_tier(user["id"])
    if tier != "business":
        raise HTTPException(status_code=403, detail="Esta función requiere plan Business")

    success = delete_api_key(key_id, user["id"])
    if success:
        return {"success": True}
    raise HTTPException(status_code=404, detail="API Key no encontrada")

@app.get("/api/v1/team", response_model=list[TeamMemberResponse])
async def get_team(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Autenticación requerida")

    tier = get_user_tier(user["id"])
    if tier != "business":
        raise HTTPException(status_code=403, detail="Esta función requiere plan Business")

    init_team_for_user(user["id"], user["email"], user["name"])
    members = get_team_members(user["id"])
    return members

@app.post("/api/v1/team/invite", response_model=TeamMemberResponse)
async def invite_team_member(
    body: InviteMemberRequest,
    authorization: Optional[str] = Header(None)
):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Autenticación requerida")

    tier = get_user_tier(user["id"])
    if tier != "business":
        raise HTTPException(status_code=403, detail="Esta función requiere plan Business")

    member = add_team_member(user["id"], body.name, body.email)
    return member

@app.delete("/api/v1/team/{member_id}")
async def remove_team_member_endpoint(
    member_id: str,
    authorization: Optional[str] = Header(None)
):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Autenticación requerida")

    tier = get_user_tier(user["id"])
    if tier != "business":
        raise HTTPException(status_code=403, detail="Esta función requiere plan Business")

    success = remove_team_member(user["id"], member_id)
    if success:
        return {"success": True}
    raise HTTPException(status_code=404, detail="Miembro no encontrado")

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
