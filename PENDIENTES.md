# PENDIENTES - KAIZEN Protect

## PENDIENTES DE SEGURIDAD

### PRIORIDAD ALTA

#### 1. Base de datos persistente (🔴 CRÍTICO)
**Estado:** Pendiente
**Archivos afectados:** `auth_system.py`

**Descripción:**
- Actualmente USERS_DB, TOKENS_DB, HISTORY_DB son diccionarios en memoria
- Datos se pierden al reiniciar el servidor
- No hay escalabilidad horizontal

**Solución:** Implementar Supabase

---

#### 2. Rate limiting por usuario autenticado (🟠 ALTO)
**Estado:** Pendiente
**Archivos afectados:** `main.py`

**Descripción:**
- Rate limiting actual usa IP
- Un atacante puede cambiar IP para evadir límites

**Solución:** Implementar rate limiting híbrido (IP + user_id)

---

#### 3. Verificación de email (🟡 MEDIO)
**Estado:** Pendiente
**Archivos:** `main.py`, `auth_system.py`

**Descripción:**
- Cualquier email puede registrarse sin verificación
- Potencial abuso del sistema

**Solución:** Integrar servicio de email (Resend, SendGrid)

---

#### 4. Password reset flow (🟡 MEDIO)
**Estado:** Pendiente
**Archivos:** `main.py`, `auth_system.py`

**Descripción:**
- No hay forma de recuperar cuenta olvidada

**Solución:** Implementar flujo de reset por email

---

#### 5. Protección CSRF (🟡 MEDIO)
**Estado:** Pendiente
**Archivos:** Frontend, `main.py`

**Solución:** Implementar middleware CSRF

---

#### 6. Sanitización avanzada de inputs IA (🟡 MEDIO)
**Estado:** Parcialmente corregido
**Archivos:** `ai_analyzer.py`

**Falta:**
- Detectar prompt injection
- Detectar y rechazar intentos de manipular el system prompt

**Solución:**
```python
def detect_prompt_injection(texto: str) -> bool:
    patterns = [
        r"ignore previous instructions",
        r"ignore all previous",
        r"disregard your instructions",
        r"system prompt",
        r"you are now",
        r"forget everything",
        r"new instructions:",
    ]
    texto_lower = texto.lower()
    for pattern in patterns:
        if re.search(pattern, texto_lower):
            return True
    return False
```

---

#### 7. Content Security Policy (CSP) (🟢 BAJO)
**Estado:** Pendiente
**Archivos:** `main.py`

**Solución:** Implementar CSP headers

---

#### 8. HSTS (HTTP Strict Transport Security) (🟢 BAJO)
**Estado:** Pendiente
**Archivos:** `main.py`, servidor web

**Solución:**
```python
response.headers["Strict-Transport-Security"] = (
    "max-age=31536000; includeSubDomains; preload"
)
```

---

#### 9. Timeout de inactividad (🟢 BAJO)
**Estado:** Pendiente
**Archivos:** `auth_system.py`

**Solución:**
```python
TOKEN_INACTIVITY_DAYS = 90

# Invalidar tokens después de X días sin uso
```

---

## PENDIENTES DE FUNCIONALIDAD

### PRIORIDAD ALTA

#### 10. SSO Corporativo (Business) (🟡 MEDIO)
**Estado:** Pendiente
**Descripción:**
- Integración con Auth0 o Okta
- Para clientes Business que requieran SSO corporativo

---

#### 11. Límites por usuario en equipo (🟠 ALTO)
**Estado:** Pendiente
**Descripción:**
- Cada miembro del equipo debería tener sus propios límites
- Tracking separado de uso por miembro

**Solución:** Agregar campo `member_id` a análisis

---

#### 12. Notificaciones por email (🟡 MEDIO)
**Estado:** Pendiente
**Descripción:**
- Confirmación de registro
- Recuperación de contraseña
- Notificaciones de facturación
- Alertas de uso cercano al límite

---

### PRIORIDAD MEDIA

#### 13. Dashboard de estadísticas (🟡 MEDIO)
**Estado:** Pendiente
**Descripción:**
- Gráficos de uso
- Tendencias de análisis
- Distribución de veredictos
- Comparación mensual

---

#### 14. Modo oscuro (🟢 BAJO)
**Estado:** Pendiente
**Descripción:**
- Theme toggle en el frontend
- Persistencia de preferencia

---

#### 15. Internacionalización (🟢 BAJO)
**Estado:** Pendiente
**Descripción:**
- Soporte para español, inglés, portugués
- Traducción de UI y mensajes
- i18n con react-i18next

---

## CHECKLIST

### Seguridad
- [ ] Base de datos persistente (Supabase)
- [ ] Rate limiting por usuario
- [ ] Verificación de email
- [ ] Password reset flow
- [ ] Protección CSRF
- [x] Sanitización básica de inputs IA ✓
- [ ] Sanitización avanzada (prompt injection)
- [ ] Content Security Policy
- [ ] HSTS
- [ ] Timeout de inactividad

### Funcionalidad
- [ ] SSO Corporativo
- [ ] Límites por usuario en equipo
- [ ] Notificaciones por email
- [ ] Dashboard de estadísticas
- [ ] Modo oscuro
- [ ] Internacionalización

---

## COMPLETADOS

### Seguridad
- [x] Hash de contraseñas (bcrypt)
- [x] Protección contra fuerza bruta
- [x] CORS configurado (whitelist)
- [x] Rate limiting por IP
- [x] Validación de tamaño de imágenes
- [x] Verificación de webhook signatures
- [x] Mensajes de error genéricos

### Funcionalidad
- [x] Análisis de texto
- [x] Análisis de imágenes
- [x] Modo Abuela
- [x] Historial de análisis
- [x] Exportación PDF
- [x] API Keys (Business)
- [x] Gestión de equipo (Business)
- [x] Integración Stripe
- [x] Autenticación completa

---

*Última actualización: 2025*
