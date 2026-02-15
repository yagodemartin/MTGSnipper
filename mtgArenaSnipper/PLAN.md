# Plan de Implementación: Sistema Multi-Agente MTG Arena Sniffer

**Fecha de inicio**: 2026-02-16
**Repositorio**: https://github.com/yagodemartin/MTGSnipper.git
**Rama**: main

---

## 📋 Resumen Ejecutivo

Implementar un sistema de **8 agentes especializados** para MTG Arena Sniffer que detecta mazos del oponente leyendo logs de Magic: The Gathering Arena en tiempo real usando Overwolf.

- **Código reutilizable**: 95%
- **Código nuevo**: ~1,100 líneas (5%)
- **Estado**: ⏳ EN PLANIFICACIÓN

---

## 🤖 Equipo de Agentes Claude

### Plan Agent (🏗️ ARQUITECTO)
- Diseña arquitectura completa
- Crea plan detallado
- Identifica dependencias
- Define orden de implementación

### Explore Agent (🔍 INVESTIGADOR)
- Analiza codebase existente
- Identifica código reutilizable
- Mapea estructura actual

### General-Purpose Agent (💻 IMPLEMENTADOR)
- Escribe código basado en plan
- Implementa agentes nuevos
- Copia código reutilizable

### Bash Agent (🧪 VALIDADOR)
- Ejecuta cambios
- Valida compilación
- Hace commits a GitHub

### Code Controller (👤 COORDINADOR)
- Coordina equipo
- Verifica alineación
- Escala a GitHub

---

## 📁 Estructura de Directorios

```
MTGSnipper/mtgArenaSnipper/
├── src/
│   ├── background/
│   │   ├── background.html
│   │   ├── background.js
│   │   └── agents/
│   │       ├── LogMonitorAgent.js
│   │       ├── LogParserAgent.js
│   │       ├── CommunicationAgent.js
│   │       └── AnalyticsAgent.js
│   ├── overlay/
│   │   ├── overlay.html
│   │   ├── overlay.js
│   │   └── overlay.css
│   ├── shared/
│   │   ├── events/
│   │   ├── services/
│   │   ├── data/
│   │   ├── components/
│   │   └── utils/
│   └── [código existente...]
├── PLAN.md (Este archivo)
├── PROGRESS.md
├── AGENTS_WORK.md
└── manifest.json (actualizado)
```

---

## 🎯 Los 8 Agentes del Sistema

### 1. LOG MONITOR AGENT ⏱️
**Archivo**: `src/background/agents/LogMonitorAgent.js`
- Monitorea `Player.log` de MTG Arena en tiempo real
- Detecta cambios en el archivo
- Polling cada 500ms
- Emite evento `log:new-lines`

### 2. LOG PARSER AGENT 📝
**Archivo**: `src/background/agents/LogParserAgent.js`
- Parsea líneas del log → eventos estructurados
- Detecta: CARD_PLAYED, TURN_STARTED, GAME_STARTED, GAME_ENDED
- Usa regex para patrones específicos del log
- Emite eventos al EventBus

### 3. GAME STATE AGENT 🎮
**Archivo**: `src/shared/services/GameService.js` (YA EXISTE)
- Mantiene estado del juego actual
- Procesa cartas jugadas
- Reutilización: 100%

### 4. PREDICTION AGENT 🎯
**Archivo**: `src/shared/data/DeckPredictionEngine.js` (YA EXISTE)
- Predice mazos del oponente
- Threshold: 85% para auto-confirmar
- Reutilización: 100%

### 5. OVERLAY RENDERER AGENT 🎨
**Archivo**: `src/overlay/overlay.js`
- Renderiza UI in-game
- Muestra predicciones
- Muestra deck confirmado
- Conecta con background window

### 6. COMMUNICATION AGENT 📡
**Archivo**: `src/background/agents/CommunicationAgent.js`
- Puente background ↔ overlay
- Envía mensajes entre windows
- Propaga eventos del EventBus

### 7. DATA MANAGER AGENT 💾
**Archivo**: `src/shared/data/DatabaseManager.js` (YA EXISTE)
- Gestiona mazos del meta
- Carga/cache datos
- Reutilización: 100%

### 8. ANALYTICS AGENT 📊
**Archivo**: `src/background/agents/AnalyticsAgent.js`
- Trackea estadísticas de partidas
- Win rate, predicción accuracy
- Persiste en localStorage

---

## 🔄 Flujo de Datos

```
Player.log
    ↓
LOG MONITOR AGENT (detecta cambios)
    ↓
LOG PARSER AGENT (parsea líneas → eventos)
    ↓
GAME STATE AGENT (procesa cartas)
    ↓
PREDICTION AGENT (genera predicciones)
    ↓
COMMUNICATION AGENT (envía a overlay)
    ↓
OVERLAY RENDERER AGENT (muestra UI)
    ↓
Usuario ve predicciones en tiempo real
```

---

## 📋 Archivos a Crear (NUEVOS)

### Background
- [ ] `src/background/background.html`
- [ ] `src/background/background.js`
- [ ] `src/background/agents/LogMonitorAgent.js`
- [ ] `src/background/agents/LogParserAgent.js`
- [ ] `src/background/agents/CommunicationAgent.js`
- [ ] `src/background/agents/AnalyticsAgent.js`

### Overlay
- [ ] `src/overlay/overlay.html`
- [ ] `src/overlay/overlay.js`
- [ ] `src/overlay/overlay.css`

### Shared (COPIAR desde src/)
- [ ] `src/shared/events/EventBus.js`
- [ ] `src/shared/services/GameService.js`
- [ ] `src/shared/data/DatabaseManager.js`
- [ ] `src/shared/data/DeckPredictionEngine.js`
- [ ] `src/shared/components/*` (todos)
- [ ] `src/shared/utils/OverwolfBridge.js`

### Actualizar
- [ ] `manifest.json` (windows background + overlay)

---

## 🚀 Orden de Implementación (FASES)

### FASE 1: Setup Base (Día 1)
- [ ] Crear estructura de directorios
- [ ] Copiar código existente a src/shared/
- [ ] Actualizar manifest.json

### FASE 2: Agentes Críticos (Días 2-3)
- [ ] Implementar LogMonitorAgent
- [ ] Implementar LogParserAgent
- [ ] Implementar CommunicationAgent

### FASE 3: Controllers (Día 4)
- [ ] Implementar BackgroundController
- [ ] Implementar OverlayController

### FASE 4: Analytics (Día 5)
- [ ] Implementar AnalyticsAgent

### FASE 5: Testing (Días 6-7)
- [ ] Testing con MTG Arena
- [ ] Ajustar polling rates
- [ ] Performance optimization

---

## ✅ Criterios de Éxito

1. **LogMonitor detecta cambios** en Player.log
2. **LogParser extrae eventos** correctamente
3. **Predicciones se muestran** en overlay
4. **Auto-confirmación funciona** al 85%
5. **Analytics trackea partidas**
6. **Todo committeado** a GitHub
7. **Documentación completa**

---

## 🔗 Links Útiles

- **GitHub**: https://github.com/yagodemartin/MTGSnipper
- **Overwolf API**: https://dev.overwolf.com/
- **MTG Arena Logs**: https://mtgatool.com/docs/logs

---

## 📝 Notas

- Mantener contexto de sesión documentado en archivos locales
- Hacer commit después de cada FASE
- Usar ramas si es necesario
- Documentar decisiones arquitectónicas
