import os
import json
import re
import logging
from typing import Optional
from anthropic import Anthropic
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MAX_IMAGE_DIMENSION = 4096
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

def sanitize_input(texto: str) -> str:
    texto = texto.strip()
    texto = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', texto)
    if len(texto) > 50000:
        texto = texto[:50000]
    return texto

def validate_image_size(image_data: str) -> bool:
    try:
        import base64
        actual_data = image_data.split(',')[1] if ',' in image_data else image_data
        size_bytes = len(actual_data) * 3 // 4
        return size_bytes <= MAX_IMAGE_SIZE_BYTES
    except Exception:
        return False

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

class Veredicto(BaseModel):
    veredicto: str = Field(..., pattern="^(SEGURO|PRECAUCION|ALERTA|PELIGRO)$")
    confianza: int = Field(..., ge=0, le=100)
    explicacion: str
    evidencia: list[str]
    ley_infringida: Optional[str] = None
    que_hacer: list[str]

SYSTEM_PROMPT = """Eres KAIZEN Protect, un detector experto de manipulación y estafas digitales especializado en el contexto latinoamericano (Colombia/LatAm).

Tu tarea es analizar textos y dar un veredicto CLARO con EXPLICACIÓN simple.

REGLAS DE RESPUESTA:
1. Responde SOLO con JSON válido, sin texto adicional
2. El JSON debe tener esta estructura exacta:
{
  "veredicto": "SEGURO" | "PRECAUCION" | "ALERTA" | "PELIGRO",
  "confianza": 0-100,
  "explicacion": "Max 200 caracteres, español simple y claro",
  "evidencia": ["lista de frases o patrones sospechosos"],
  "ley_infringida": "ley colombiana relevante o null",
  "que_hacer": ["1-3 acciones concretas que debe seguir"]
}

NIVELES DE VEREDICTO:
- SEGURO: Sin señales de manipulación o estafa
- PRECAUCION: Algunas señales menores, verificar con calma
- ALERTA: Patrones claros de posible manipulación
- PELIGRO: Casi seguro es estafa o manipulación grave

PATRONES A DETECTAR:
1. Urgencia artificial: "¡Actúa ahora!", "Solo hoy", "Última oportunidad"
2. Suplantación de identidad: "Soy de tu banco", "Soy soporte técnico"
3. Aislamiento: "No le cuentes a nadie", "Es confidencial"
4. Ofertas imposibles: "Ganaste", "Herencia", "Premio"
5. Presión emocional: "Tu familiar está en peligro"
6. Enlaces sospechosos: URLs acortadas o dominios raros
7. Piden datos sensibles: contraseñas, PINs, códigos
8. Contratos abusivos: cláusulas ocultas, permanencia forzada

CONTEXTO LATINOAMÉRICA:
- Estafas comunes: Premiaritos, supuestas herencias, phishing bancario
- Mensajería falsa de bancos (Bancolombia, Davivienda, Nequi)
- Esquemas Ponzi disfrazados de inversiones
- Ofertas de trabajo falsas que piden dinero por adelantado
- Romance scams (catfishing)
- Secuestro vial falso (mensaje de "accidente")

OBJETIVO: Proteger a las personas comunes dándoles información clara y accionable."""

def analizar(texto: str) -> dict:
    texto = sanitize_input(texto)
    logger.info(f"Analizando texto de {len(texto)} caracteres")

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Analiza este texto y responde solo con JSON:\n{texto}"}]
        )
        
        resultado = json.loads(response.content[0].text)
        veredicto = Veredicto(**resultado)
        logger.info(f"Veredicto: {veredicto.veredicto} ({veredicto.confianza}%)")
        return veredicto.model_dump()
        
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON: {e}")
        raise ValueError("La IA no devolvió un JSON válido")
    except Exception as e:
        logger.error(f"Error en análisis: {e}")
        raise

def analizar_batch(textos: list[str]) -> list[dict]:
    """Analiza múltiples textos en paralelo"""
    return [analizar(t) for t in textos]

def analizar_con_imagen(texto: str, imagen_base64: str) -> dict:
    """Analiza texto + imagen usando Claude Vision"""
    texto = sanitize_input(texto)

    if not validate_image_size(imagen_base64):
        raise ValueError("La imagen excede el tamaño máximo permitido (5MB)")

    logger.info(f"Analizando texto + imagen")

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{
                "role": "user", 
                "content": [
                    {
                        "type": "text",
                        "text": f"Analiza este mensaje y la imagen adjunta. Responde solo con JSON:\n{texto}"
                    },
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": imagen_base64.split(',')[1] if ',' in imagen_base64 else imagen_base64
                        }
                    }
                ]
            }]
        )
        
        resultado = json.loads(response.content[0].text)
        veredicto = Veredicto(**resultado)
        logger.info(f"Veredicto con imagen: {veredicto.veredicto} ({veredicto.confianza}%)")
        return veredicto.model_dump()
        
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON: {e}")
        raise ValueError("La IA no devolvió un JSON válido")
    except Exception as e:
        logger.error(f"Error en análisis con imagen: {e}")
        raise
