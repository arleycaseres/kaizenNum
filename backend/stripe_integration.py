import os
import stripe
from typing import Optional
from datetime import datetime, timedelta

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

PRICES = {
    "pro_monthly": os.getenv("STRIPE_PRO_MONTHLY_PRICE_ID", "price_pro_monthly"),
    "pro_yearly": os.getenv("STRIPE_PRO_YEARLY_PRICE_ID", "price_pro_yearly"),
    "business_monthly": os.getenv("STRIPE_BUSINESS_MONTHLY_PRICE_ID", "price_business_monthly"),
    "business_yearly": os.getenv("STRIPE_BUSINESS_YEARLY_PRICE_ID", "price_business_yearly"),
}

PRICES_DISPLAY = {
    "pro_monthly": {"name": "Pro Mensual", "price": 7, "interval": "mes"},
    "pro_yearly": {"name": "Pro Anual", "price": 60, "interval": "año"},
    "business_monthly": {"name": "Business Mensual", "price": 19, "interval": "mes"},
    "business_yearly": {"name": "Business Anual", "price": 180, "interval": "año"},
}

def create_checkout_session(user_id: str, email: str, price_key: str, success_url: str, cancel_url: str) -> Optional[dict]:
    if not stripe.api_key or stripe.api_key == "":
        return None
    
    try:
        customer = stripe.Customer.create(
            email=email,
            metadata={"user_id": user_id}
        )
        
        session = stripe.checkout.Session.create(
            customer=customer.id,
            payment_method_types=["card"],
            line_items=[{
                "price": PRICES[price_key],
                "quantity": 1,
            }],
            mode="subscription",
            success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url,
            metadata={"user_id": user_id, "price_key": price_key}
        )
        
        return {"session_id": session.id, "url": session.url}
    except Exception as e:
        print(f"Stripe error: {e}")
        return None

def create_customer_portal(user_id: str, return_url: str) -> Optional[str]:
    if not stripe.api_key:
        return None
    
    try:
        from auth_system import get_user_by_id
        user = get_user_by_id(user_id)
        if not user or not user.stripe_customer_id:
            return None
        
        session = stripe.billing_portal.Session.create(
            customer=user.stripe_customer_id,
            return_url=return_url
        )
        return session.url
    except Exception as e:
        print(f"Stripe portal error: {e}")
        return None

def handle_webhook(payload: bytes, sig: str, webhook_secret: str) -> dict:
    if not stripe.api_key:
        return {"error": "Stripe not configured"}

    if not webhook_secret or webhook_secret == "":
        return {"error": "Webhook secret not configured"}

    try:
        event = stripe.Webhook.construct_event(payload, sig, webhook_secret)
        
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            user_id = session.get("metadata", {}).get("user_id")
            customer_id = session.get("customer")
            price_key = session.get("metadata", {}).get("price_key", "pro_monthly")
            
            tier = "pro" if "pro" in price_key else "business"
            
            from auth_system import update_subscription, get_user_by_id
            user = get_user_by_id(user_id)
            if user:
                user.stripe_customer_id = customer_id
                update_subscription(user_id, tier, "active", session.get("subscription"), None)
                
                if user.referred_by and tier in ["pro", "business"]:
                    from auth_system import _process_referral_bonus, get_user_by_id
                    referrer = get_user_by_id(user.referred_by)
                    if referrer:
                        referrer_id = referrer.id
                        _process_referral_bonus(referrer_id)
                        if hasattr(user, 'referred_by'):
                            user.referred_by = None
            
            return {"success": True, "user_id": user_id, "tier": tier}
        
        elif event["type"] == "customer.subscription.updated":
            subscription = event["data"]["object"]
            customer_id = subscription.get("customer")
            
            from auth_system import get_user_by_id, USERS_DB
            for user in USERS_DB.values():
                if user.stripe_customer_id == customer_id:
                    status = "active" if subscription.get("status") == "active" else "inactive"
                    update_subscription(user.id, user.subscription_tier, status, subscription.get("id"))
            
            return {"success": True, "action": "subscription_updated"}
        
        elif event["type"] == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            customer_id = subscription.get("customer")
            
            from auth_system import get_user_by_id, USERS_DB
            for user in USERS_DB.values():
                if user.stripe_customer_id == customer_id:
                    update_subscription(user.id, "free", "inactive")
            
            return {"success": True, "action": "subscription_deleted"}
        
        return {"success": True, "action": "ignored"}
        
    except Exception as e:
        return {"error": str(e)}

def get_subscription_status(user_id: str) -> dict:
    from auth_system import get_user_by_id
    user = get_user_by_id(user_id)
    
    if not user:
        return {"tier": "free", "status": "inactive"}
    
    return {
        "tier": user.subscription_tier,
        "status": user.subscription_status,
        "ends_at": user.subscription_end.isoformat() if user.subscription_end else None
    }
