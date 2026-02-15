# Asignación de Trabajo: Agentes Claude

**Fecha**: 2026-02-16

---

## 🏗️ Plan Agent (ARQUITECTO)

**Rol**: Diseñar arquitectura completa

**Tareas**:
1. Analizar codebase existente
2. Crear plan detallado de implementación
3. Identificar dependencias entre componentes
4. Definir orden de implementación (FASES)
5. Especificar interfaces entre agentes
6. Documentar decisiones arquitectónicas

**Output esperado**:
- Plan detallado en PLAN.md
- Diagrama de flujo de datos
- Tabla de dependencias
- Orden de implementación paso a paso

**Métricas de éxito**:
- ✅ Plan completo y detallado
- ✅ Todas las fases definidas
- ✅ Dependencias claras

---

## 🔍 Explore Agent (INVESTIGADOR)

**Rol**: Analizar codebase existente

**Tareas**:
1. Explorar estructura actual de src/
2. Identificar código reutilizable
3. Mapear componentes existentes
4. Encontrar padrón de arquitectura
5. Validar que el código sea compatible con Overwolf

**Output esperado**:
- Reporte de código reutilizable
- Mapa de dependencias actuales
- Lista de archivos a copiar
- Compatibilidad con Overwolf confirmada

**Métricas de éxito**:
- ✅ Código reutilizable identificado
- ✅ 95% reutilización alcanzada
- ✅ Sin dependencias que rompan

---

## 💻 General-Purpose Agent (IMPLEMENTADOR)

**Rol**: Escribir código basado en plan

**Tareas**:
1. Crear estructura de directorios
2. Copiar código existente a src/shared/
3. Implementar LogMonitorAgent
4. Implementar LogParserAgent
5. Implementar CommunicationAgent
6. Implementar AnalyticsAgent
7. Implementar BackgroundController
8. Implementar OverlayController
9. Actualizar manifest.json

**Output esperado**:
- Todos los archivos nuevos creados
- Código compilable y sin errores
- Integración con EventBus funcional

**Métricas de éxito**:
- ✅ 1,100 líneas de código nuevo
- ✅ 0 errores de compilación
- ✅ EventBus integrando correctamente

---

## 🧪 Bash Agent (VALIDADOR)

**Rol**: Ejecutar cambios y validar

**Tareas**:
1. Crear estructura de directorios (mkdir)
2. Copiar archivos (cp)
3. Validar sintaxis JavaScript
4. Ejecutar tests si existen
5. Verificar cambios con git
6. Hacer commits a GitHub
7. Validar tags y versiones

**Output esperado**:
- Directorios creados ✅
- Archivos copiados ✅
- Sintaxis validada ✅
- Commits en GitHub ✅

**Métricas de éxito**:
- ✅ Estructura creada
- ✅ Sin errores de sintaxis
- ✅ Commits regulares

---

## 👤 Code Controller (COORDINADOR)

**Rol**: Coordinar equipo y verificar alineación

**Tareas**:
1. Lanzar agentes en orden correcto
2. Verificar outputs de cada agente
3. Escalar a GitHub cambios completados
4. Actualizar PROGRESS.md
5. Mantener contexto documentado
6. Resolver bloqueadores
7. Comunicar estado al usuario

**Output esperado**:
- Agentes coordinados
- Progreso actualizado
- GitHub al día
- Usuario informado

**Métricas de éxito**:
- ✅ Equipo coordinado
- ✅ Progreso transparente
- ✅ GitHub sincronizado
- ✅ 0 contexto perdido

---

## 🔄 Orden de Ejecución

```
INICIO
  ↓
Plan Agent → Crear plan detallado
  ↓
Explore Agent → Analizar codebase
  ↓
Code Controller → Verificar alineación
  ↓
FASE 1: Setup Base
  ├─ Bash Agent → Crear directorios
  ├─ General-Purpose Agent → Copiar código
  ├─ General-Purpose Agent → Actualizar manifest.json
  └─ Bash Agent → Commit FASE 1
  ↓
FASE 2: Agentes Críticos
  ├─ General-Purpose Agent → LogMonitorAgent
  ├─ General-Purpose Agent → LogParserAgent
  ├─ General-Purpose Agent → CommunicationAgent
  └─ Bash Agent → Commit FASE 2
  ↓
FASE 3: Controllers
  ├─ General-Purpose Agent → BackgroundController
  ├─ General-Purpose Agent → OverlayController
  └─ Bash Agent → Commit FASE 3
  ↓
FASE 4: Analytics
  ├─ General-Purpose Agent → AnalyticsAgent
  └─ Bash Agent → Commit FASE 4
  ↓
FASE 5: Testing
  ├─ Testing con MTG Arena
  ├─ Bug fixes
  └─ Bash Agent → Commit FASE 5
  ↓
FIN
```

---

## 📞 Comunicación entre Agentes

### Plan → Explore
- Plan define lo que necesita investigar
- Explore valida feasibilidad

### Explore → General-Purpose
- Explore proporciona lista de archivos
- General-Purpose sabe qué copiar/crear

### General-Purpose → Bash
- General-Purpose entrega código
- Bash lo coloca en directorios y valida

### Bash → Code Controller
- Bash reporta cambios completados
- Code Controller actualiza PROGRESS.md

### Code Controller → Usuario
- Actualiza estado regularmente
- Comunica bloqueadores

---

## 🎯 Definiciones de Listo

### FASE 1 Lista cuando:
- ✅ Directorios creados
- ✅ Código copiado
- ✅ manifest.json actualizado
- ✅ Commit en GitHub

### FASE 2 Lista cuando:
- ✅ Los 3 agentes compilables
- ✅ EventBus integrando
- ✅ Commit en GitHub

### FASE 3 Lista cuando:
- ✅ BackgroundController funcional
- ✅ OverlayController funcional
- ✅ Windows de Overwolf configuradas
- ✅ Commit en GitHub

### FASE 4 Lista cuando:
- ✅ AnalyticsAgent funcional
- ✅ localStorage persistiendo
- ✅ Commit en GitHub

### FASE 5 Lista cuando:
- ✅ Tested con MTG Arena
- ✅ Auto-confirmación al 85% funciona
- ✅ Overlay muestra predicciones
- ✅ Sin bugs críticos
- ✅ Documentación completa
- ✅ Final commit en GitHub

---

## 📌 Notas Importantes

1. **Contexto persistente**: Todo se documenta en archivos locales
2. **GitHub primero**: Cada FASE se commits inmediatamente
3. **Sin contexto perdido**: Si sesión cae, files tienen todo
4. **Comunicación clara**: Cada agente reporta su estado
5. **Escalabilidad**: Code Controller coordina todo
