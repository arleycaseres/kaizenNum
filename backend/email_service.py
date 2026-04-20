import os
import logging
from typing import Optional
import resend

logger = logging.getLogger(__name__)

resend_api_key: str = os.getenv("RESEND_API_KEY", "")
frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

def is_configured() -> bool:
    return bool(resend_api_key)

def send_verification_email(email: str, token: str) -> bool:
    if not is_configured():
        logger.warning(f"Resend no configurado, saltando email a {email}")
        return False

    try:
        resend.api_key = resend_api_key

        verification_link = f"{frontend_url}/verify?token={token}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="display: inline-block; background: #2563eb; color: white; font-size: 24px; font-weight: bold; padding: 12px 24px; border-radius: 8px;">
                            KAIZEN Protect
                        </div>
                    </div>

                    <h1 style="color: #1e293b; font-size: 20px; margin: 0 0 16px 0; text-align: center;">
                        Verifica tu correo electrónico
                    </h1>

                    <p style="color: #64748b; font-size: 14px; line-height: 1.6; text-align: center;">
                        Gracias por registrarte en KAIZEN Protect. Haz clic en el botón de abajo para verificar tu cuenta y comenzar a analizar mensajes sospechosos.
                    </p>

                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{verification_link}" style="display: inline-block; background: #2563eb; color: white; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                            Verificar mi cuenta
                        </a>
                    </div>

                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                        Si no creaste una cuenta en KAIZEN Protect, puedes ignorar este correo.
                    </p>
                </div>

                <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                    <p>KAIZEN Protect - Detector de estafas con IA</p>
                    <p>Colombia, LatAm</p>
                </div>
            </div>
        </body>
        </html>
        """

        params = {
            "from": "KAIZEN Protect <onboarding@resend.dev>",
            "to": email,
            "subject": "Verifica tu cuenta - KAIZEN Protect",
            "html": html_content
        }

        email_response = resend.emails.send(params)
        logger.info(f"Email de verificación enviado a {email}: {email_response}")
        return True

    except Exception as e:
        logger.error(f"Error enviando email de verificación a {email}: {e}")
        return False

def send_welcome_email(email: str, name: str) -> bool:
    if not is_configured():
        logger.warning(f"Resend no configurado, saltando email a {email}")
        return False

    try:
        resend.api_key = resend_api_key

        dashboard_link = f"{frontend_url}/dashboard"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="display: inline-block; background: #2563eb; color: white; font-size: 24px; font-weight: bold; padding: 12px 24px; border-radius: 8px;">
                            KAIZEN Protect
                        </div>
                    </div>

                    <h1 style="color: #1e293b; font-size: 20px; margin: 0 0 16px 0; text-align: center;">
                        ¡Bienvenido{name}!
                    </h1>

                    <p style="color: #64748b; font-size: 14px; line-height: 1.6; text-align: center;">
                        Tu cuenta ha sido verificada. Ahora puedes usar KAIZEN Protect para analizar mensajes sospechosos y protegerte de estafas.
                    </p>

                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{dashboard_link}" style="display: inline-block; background: #2563eb; color: white; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                            Ir al análisis
                        </a>
                    </div>

                    <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 24px;">
                        <p style="color: #64748b; font-size: 14px; margin: 0 0 12px 0;"><strong>Puedes hacer:</strong></p>
                        <ul style="color: #64748b; font-size: 14px; padding-left: 20px; margin: 0;">
                            <li>Analizar mensajes sospechosos</li>
                            <li>Activar Modo Abuela para personas mayores</li>
                            <li>Guardar historial de análisis</li>
                            <li>Exportar reportes en PDF</li>
                        </ul>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                    <p>KAIZEN Protect - Detector de estafas con IA</p>
                </div>
            </div>
        </body>
        </html>
        """

        params = {
            "from": "KAIZEN Protect <onboarding@resend.dev>",
            "to": email,
            "subject": "¡Bienvenido a KAIZEN Protect!",
            "html": html_content
        }

        email_response = resend.emails.send(params)
        logger.info(f"Email de bienvenida enviado a {email}: {email_response}")
        return True

    except Exception as e:
        logger.error(f"Error enviando email de bienvenida a {email}: {e}")
        return False

def send_password_reset_email(email: str, token: str) -> bool:
    if not is_configured():
        logger.warning(f"Resend no configurado, saltando email a {email}")
        return False

    try:
        resend.api_key = resend_api_key

        reset_link = f"{frontend_url}/reset-password?token={token}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="display: inline-block; background: #dc2626; color: white; font-size: 24px; font-weight: bold; padding: 12px 24px; border-radius: 8px;">
                            KAIZEN Protect
                        </div>
                    </div>

                    <h1 style="color: #1e293b; font-size: 20px; margin: 0 0 16px 0; text-align: center;">
                        Restablecer tu contraseña
                    </h1>

                    <p style="color: #64748b; font-size: 14px; line-height: 1.6; text-align: center;">
                        Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva contraseña.
                    </p>

                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{reset_link}" style="display: inline-block; background: #dc2626; color: white; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                            Restablecer contraseña
                        </a>
                    </div>

                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                        Este enlace expirece en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.
                    </p>
                </div>

                <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                    <p>KAIZEN Protect - Detector de estafas con IA</p>
                </div>
            </div>
        </body>
        </html>
        """

        params = {
            "from": "KAIZEN Protect <onboarding@resend.dev>",
            "to": email,
            "subject": "Restablecer tu contraseña - KAIZEN Protect",
            "html": html_content
        }

        email_response = resend.emails.send(params)
        logger.info(f"Email de reset enviado a {email}: {email_response}")
        return True

    except Exception as e:
        logger.error(f"Error enviando email de reset a {email}: {e}")
        return False