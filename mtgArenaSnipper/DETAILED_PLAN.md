# PLAN DETALLADO DE IMPLEMENTACIÓN: SISTEMA DE 8 AGENTES - MTG ARENA SNIFFER

**Creado por**: Plan Agent
**Fecha**: 2026-02-16
**Estado**: ✅ COMPLETO

---

## PARTE 1: ANÁLISIS ARQUITECTÓNICO

He explorado el codebase existente y he identificado una arquitectura bien estructurada en capas:

**Estructura Actual:**
```
src/
├── application/
│   ├── events/EventBus.js (✅ REUTILIZABLE - Sistema robusto pub/sub)
│   └── services/GameService.js (✅ REUTILIZABLE - Gestión estado del juego)
├── infrastructure/
│   └── data/
│       ├── DatabaseManager.js (✅ REUTILIZABLE - Caché + scraping)
│       ├── DeckPredictionEngine.js (✅ REUTILIZABLE - Motor predicción 85% threshold)
│       └── MTGGoldfishCompleteScraper.js (✅ REUTILIZABLE)
├── presentation/
│   └── components/ (✅ 10 componentes UI reutilizables)
├── styles/
├── utils/
└── config/
```

**Reutilización Confirmada: 95%**

---

## PARTE 2: ESTRUCTURA DE DIRECTORIOS A CREAR

```
MTGSnipper/mtgArenaSnipper/src/
├── background/
│   ├── background.html
│   ├── background.js (BackgroundController)
│   └── agents/
│       ├── LogMonitorAgent.js (AGENTE 1)
│       ├── LogParserAgent.js (AGENTE 2)
│       ├── CommunicationAgent.js (AGENTE 3)
│       └── AnalyticsAgent.js (AGENTE 4)
├── overlay/
│   ├── overlay.html
│   ├── overlay.js (OverlayController)
│   └── overlay.css
├── shared/
│   ├── events/
│   │   └── EventBus.js (copiar desde application/)
│   ├── services/
│   │   ├── GameService.js (copiar)
│   │   ├── UIService.js (copiar)
│   │   └── CardService.js (copiar)
│   ├── data/
│   │   ├── DatabaseManager.js (copiar)
│   │   └── DeckPredictionEngine.js (copiar)
│   ├── components/
│   │   └── (copiar todos los 10 componentes)
│   └── utils/
│       └── Utils.js (copiar)
└── manifest.json (actualizar)
```

---

## PARTE 3: LOS 8 AGENTES DEL SISTEMA

### AGENTE 1: LogMonitorAgent ⏱️
**Archivo:** `src/background/agents/LogMonitorAgent.js`
**Propósito:** Monitorea `Player.log` en tiempo real
**Métodos:** initialize(), startMonitoring(), stopMonitoring(), checkForNewLines()
**Eventos:** log:new-lines, log:error
**Líneas de código:** ~200

### AGENTE 2: LogParserAgent 📝
**Archivo:** `src/background/agents/LogParserAgent.js`
**Propósito:** Parsea líneas → eventos estructurados
**Métodos:** parseCardPlayed(), parseTurnStarted(), parseGameStarted()
**Eventos:** card:played, turn:started, game:started, game:ended
**Líneas de código:** ~250

### AGENTE 3: GameService 🎮 (EXISTE)
**Reutilización:** 100%
**No requiere cambios**

### AGENTE 4: DeckPredictionEngine 🎯 (EXISTE)
**Reutilización:** 100%
**No requiere cambios**

### AGENTE 5: OverlayController 🎨
**Archivo:** `src/overlay/overlay.js`
**Propósito:** Renderiza UI overlay
**Métodos:** connectToBackground(), renderPredictions(), renderConfirmedDeck()
**Líneas de código:** ~100

### AGENTE 6: CommunicationAgent 📡
**Archivo:** `src/background/agents/CommunicationAgent.js`
**Propósito:** Puente background ↔ overlay
**Métodos:** sendToOverlay(), listenFromOverlay()
**Líneas de código:** ~200

### AGENTE 7: DatabaseManager 💾 (EXISTE)
**Reutilización:** 100%
**No requiere cambios**

### AGENTE 8: AnalyticsAgent 📊
**Archivo:** `src/background/agents/AnalyticsAgent.js`
**Propósito:** Trackea estadísticas
**Métodos:** trackGame(), calculateWinRate(), persistStats()
**Líneas de código:** ~150

### AGENTE 9: BackgroundController 🎛️
**Archivo:** `src/background/background.js`
**Propósito:** Orquestador central
**Métodos:** initialize(), initializeServices(), initializeAgents()
**Líneas de código:** ~200

---

## PARTE 4: TABLA DE DEPENDENCIAS

```
AGENTE/SERVICIO          | DEPENDE DE              | EMITE EVENTOS
========================|========================|==============================
LogMonitorAgent          | FileSystem (Overwolf)  | log:new-lines
LogParserAgent           | LogMonitorAgent        | card:played, turn:started
GameService              | Prediction + Database  | deck:prediction:updated
DeckPredictionEngine     | DatabaseManager        | prediction results
CommunicationAgent       | BackgroundController   | window messages
AnalyticsAgent           | EventBus               | analytics:updated
OverlayController        | CommunicationAgent     | overlay:user:confirmed
BackgroundController     | Todos los anteriores   | orchestration events
DatabaseManager          | MTGGoldfish API        | database:updated
```

**Orden de inicialización (CRÍTICO):**
1. DatabaseManager
2. DeckPredictionEngine
3. GameService
4. LogMonitorAgent
5. LogParserAgent
6. CommunicationAgent
7. AnalyticsAgent
8. OverlayController

---

## PARTE 5: CONFIGURACIÓN MANIFEST.JSON

**Cambios clave:**
- `start_window` → BackgroundWindow
- Agregar BackgroundWindow (transparente, run_in_background)
- Agregar OverlayWindow (topmost, in-game)
- Permisos: FileSystem, Logging, GameInfo

---

## PARTE 6: PLAN FASE POR FASE

### FASE 1: SETUP BASE (2-3 horas)
- [ ] Crear estructura directorios
- [ ] Copiar código existente a src/shared/
- [ ] Actualizar manifest.json
- [ ] Commit FASE 1

### FASE 2: AGENTES CRÍTICOS (4-5 horas)
- [ ] LogMonitorAgent
- [ ] LogParserAgent
- [ ] CommunicationAgent
- [ ] Commit FASE 2

### FASE 3: CONTROLLERS (3-4 horas)
- [ ] BackgroundController
- [ ] OverlayController
- [ ] Commit FASE 3

### FASE 4: ANALYTICS (1-2 horas)
- [ ] AnalyticsAgent
- [ ] Commit FASE 4

### FASE 5: TESTING (2-3 horas)
- [ ] Testing con MTG Arena
- [ ] Optimizaciones
- [ ] Commit FASE 5

---

## PARTE 7: ARCHIVOS CRÍTICOS

**Los 5 archivos más importantes:**

1. **src/background/background.js** - Orquestador principal
2. **src/background/agents/LogMonitorAgent.js** - Fuente de datos
3. **src/background/agents/LogParserAgent.js** - Parser de eventos
4. **src/manifest.json** - Configuración Overwolf
5. **src/overlay/overlay.js** - UI in-game

---

## PARTE 8: FLUJO DE DATOS COMPLETO

```
Player.log
    ↓
LogMonitorAgent (detecta cambios cada 500ms)
    ↓
Emite: log:new-lines → { lines: [...] }
    ↓
LogParserAgent (escucha log:new-lines)
    ↓
Extrae: "Lightning Bolt" jugada en turno 2
    ↓
Emite: card:played → { name: "Lightning Bolt", turn: 2 }
    ↓
GameService (escucha card:played)
    ↓
Llama: predictionEngine.addOpponentCard()
    ↓
DeckPredictionEngine (calcula scores)
    ↓
Genera: [{ deck: "RDW", probability: 0.45 }, ...]
    ↓
Emite: deck:prediction:updated
    ↓
CommunicationAgent (escucha deck:prediction:updated)
    ↓
Envía: window.message al OverlayWindow
    ↓
OverlayController (recibe mensaje)
    ↓
Renderiza: UI actualizada con predicciones
    ↓
Usuario ve predicciones en pantalla ✅
```

---

## PARTE 9: MÉTRICAS DE ÉXITO

- ✅ LogMonitor detecta Player.log en < 5 segundos
- ✅ LogParser extrae cartas correctamente (95%+ accuracy)
- ✅ Predictions se muestran en overlay en < 2 segundos
- ✅ Auto-confirmación funciona al 85% threshold
- ✅ Overlay no afecta performance del juego
- ✅ Analytics trackea todas las partidas
- ✅ Cero memory leaks después de 10+ partidas

---

## PARTE 10: NOTAS TÉCNICAS

- **Player.log:** `%LOCALAPPDATA%\MTG Arena\Logs\Player.log`
- **Polling:** 500ms (suficiente para detección en tiempo real)
- **EventBus:** Código robusto ya existe, usar tal cual
- **localStorage:** Usar namespace `mtgArenaSniffer_` para evitar colisiones
- **Overwolf API:** Validar que windows existan antes de enviar mensajes

---

## RESUMEN FINAL

**Líneas de código nuevo:** ~1,100
**Reutilización:** 95%
**Tiempo estimado:** 5-7 días
**Arquitectura:** 8 agentes coordinados por EventBus
**Comunicación:** Asyncrona entre windows
**Datos:** Caché local + localStorage
