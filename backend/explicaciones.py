"""Módulo de explicaciones diferenciadas - FUNCIÓN CLAVE DEL PRODUCTO"""
import os
from anthropic import Anthropic
from enum import Enum

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

class ModoExplicacion(str, Enum):
    ABUELA = "abuela"
    NORMAL = "normal"
    TECNICO = "tecnico"

SYSTEM_PROMPTS = {
    ModoExplicacion.ABUELA: """Eres KAIZEN Protect. Explicas resultados a personas mayores de 60 años.

REGLAS:
- Usa palabras SIMPLES, máximo 10 años de escuela
- NADA de tecnicismos
-比喻 concretas de la vida diaria
- Máximo 3 oraciones cortas
- Usa "tú" no "usted"
- Si hay algo técnico, ponlo entre paréntesis

EJEMPLO:
Veredicto: ALERTA
Explicación abuela: "Te están apurando para que no pienses. Eso hacen los ladrones. No actúes con prisa."

EJEMPLO TÉCNICO A SIMPLIFICAR:
"Phishing mediante ingeniería social con urgencia artificial" → "Te quieren meter miedo para que actúes sin pensar" """,
    
    ModoExplicacion.NORMAL: """Eres KAIZEN Protect. Explicas resultados de forma clara y directa.

REGLAS:
- Lenguaje cotidiano pero correcto
- Máximo 100 palabras
- Sin tecnicismos innecesarios
- Explica el "por qué" no solo el "qué"
- Incluye consejo práctico""",
    
    ModoExplicacion.TECNICO: """Eres KAIZEN Protect. Explicas con precisión técnica.

REGLAS:
- Usa terminología correcta
- Incluye leyes específicas colombianas
- Nombra los patrones de manipulación reconocidos
- Agrega contexto de ciberseguridad
- Sé preciso y detallado"""
}

TRADUCCIONES_SIMPLE = {
    "urgencia artificial": "te apuran para que no pienses",
    "suplantación de identidad": "alguien se hace pasar por otro",
    "phishing": "te quieren robar información falsa",
    "ingeniería social": "manipulan tus emociones",
    "enlaces sospechosos": "clic en enlace raros",
    "datos sensibles": "información personal importante",
    "esquema ponzi": "estafa piramidal",
    "catfishing": "falsa relación amorosa",
    "smishing": "mensajes falsos de texto"
}

def explicar_como_abuela(veredicto: dict) -> dict:
    """Convierte veredicto técnico a lenguaje simple para personas mayores"""
    import anthropic
    
    veredicto_nivel = veredicto.get("veredicto", "PRECAUCION")
    evidencia = veredicto.get("evidencia", [])
    explicacion_original = veredicto.get("explicacion", "")
    que_hacer = veredicto.get("que_hacer", [])
    
    evidencia_simplificada = [
        TRADUCCIONES_SIMPLE.get(e.lower(), e) if isinstance(e, str) else str(e)
        for e in evidencia[:3]
    ]
    
    template = f"""Explica esto para una persona mayor de 70 años que no sabe de computadoras:

El mensaje que recibió es {veredicto_nivel}.

{explicacion_original}

Señales que vi:
{chr(10).join(f"- {e}" for e in evidencia_simplificada)}

Lo que debe hacer:
{chr(10).join(f"- {a}" for a in que_hacer[:2])}

Responde con máximo 4 oraciones cortas y simples."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        system=SYSTEM_PROMPTS[ModoExplicacion.ABUELA],
        messages=[{"role": "user", "content": template}]
    )
    
    explicacion_simple = response.content[0].text.strip()
    
    return {
        **veredicto,
        "explicacion": explicacion_simple,
        "modo": "abuela"
    }

def analizar_con_modo(texto: str, modo: ModoExplicacion = ModoExplicacion.NORMAL) -> dict:
    """Análisis con modo de explicación específico"""
    from ai_analyzer import analizar
    
    resultado = analizar(texto)
    
    if modo == ModoExplicacion.ABUELA:
        return explicar_como_abuela(resultado)
    
    resultado["modo"] = modo.value
    return resultado

def analisis_completo(texto: str) -> dict:
    """Realiza análisis completo con todos los modos"""
    from ai_analyzer import analizar
    
    resultado = analizar(texto)
    
    try:
        resultado_abuela = explicar_como_abuela(resultado)
    except Exception:
        resultado_abuela = resultado
    
    return {
        "principal": resultado,
        "abuela": resultado_abuela,
        "modos_disponibles": ["normal", "abuela"]
    }
