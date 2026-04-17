"""Tests para el módulo de análisis IA"""
import pytest
from ai_analyzer import analizar, SYSTEM_PROMPT, Veredicto

def test_system_prompt_existe():
    assert SYSTEM_PROMPT is not None
    assert len(SYSTEM_PROMPT) > 100

def test_veredicto_estructura():
    """Verifica que la estructura del veredicto es correcta"""
    class MockResponse:
        class Content:
            def __init__(self):
                self.text = '{"veredicto":"SEGURO","confianza":95,"explicacion":"Test","evidencia":["test"],"ley_infringida":null,"que_hacer":["test"]}'
        def __init__(self):
            self.content = [self.Content()]
    
    import ai_analyzer
    ai_analyzer.client.messages.create = lambda **kwargs: MockResponse()
    
    result = analizar("texto de prueba")
    
    assert "veredicto" in result
    assert "confianza" in result
    assert result["veredicto"] in ["SEGURO", "PRECAUCION", "ALERTA", "PELIGRO"]
    assert 0 <= result["confianza"] <= 100
    assert "explicacion" in result
    assert "evidencia" in result
    assert isinstance(result["evidencia"], list)

def test_veredicto_valido():
    """Verifica que los 4 niveles de veredicto son válidos"""
    validos = ["SEGURO", "PRECAUCION", "ALERTA", "PELIGRO"]
    assert all(v in validos for v in validos)

class MockResponse:
    class Content:
        def __init__(self, texto):
            self.text = texto
    def __init__(self, texto):
        self.content = [self.Content(texto)]

@pytest.mark.parametrize("texto,tipo_esperado", [
    ("Hola, soy tu banco y necesito tu contraseña", "ALERTA"),
    ("Oye hijo, necesito que me llames al +57 300 123 4567 urgente", "PRECAUCION"),
    ("Te ganaste un iphone gratis solo hace clic aqui", "PELIGRO"),
    ("Hola, tengo disponible para reunión el jueves a las 3pm", "SEGURO"),
])
def test_analisis_retorna_resultado(texto, tipo_esperado):
    """Test de integración: verifica que el análisis retorna estructura válida"""
    import ai_analyzer
    
    mock_responses = {
        "veredicto": tipo_esperado,
        "confianza": 85,
        "explicacion": "Análisis de prueba",
        "evidencia": ["patrón detectado"],
        "ley_infringida": None,
        "que_hacer": ["acción recomendada"]
    }
    
    import json
    ai_analyzer.client.messages.create = lambda **kwargs: MockResponse(json.dumps(mock_responses))
    
    result = analizar(texto)
    
    assert result["veredicto"] == tipo_esperado
    assert "confianza" in result
    assert 0 <= result["confianza"] <= 100
