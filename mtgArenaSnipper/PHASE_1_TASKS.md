# FASE 1: SETUP BASE - INSTRUCCIONES DETALLADAS

**Creado para**: General-Purpose Agent
**Fecha**: 2026-02-16
**Directorio**: C:\Users\yagod\Documents\Proyectos\MTGSnipper\mtgArenaSnipper
**Duración estimada**: 2-3 horas
**Prioridad**: ALTA

---

## 📋 RESUMEN DE TAREAS

```
TAREA 1: Crear estructura de directorios (30 minutos)
TAREA 2: Copiar código reutilizable (45 minutos)
TAREA 3: Crear OverwolfBridge.js nuevo (45 minutos)
TAREA 4: Actualizar manifest.json (30 minutos)
TAREA 5: Crear archivos HTML placeholder (15 minutos)
TAREA 6: Validar y testear (15 minutos)
```

---

## ✅ TAREA 1: CREAR ESTRUCTURA DE DIRECTORIOS

**Objetivo**: Crear la estructura base para src/shared/

**Directorios a crear**:
```
src/shared/
├── events/
├── services/
├── data/
├── components/
├── config/
└── utils/

src/background/
└── agents/

src/overlay/
```

**Comandos**:
```bash
mkdir -p src/shared/events
mkdir -p src/shared/services
mkdir -p src/shared/data
mkdir -p src/shared/components
mkdir -p src/shared/config
mkdir -p src/shared/utils
mkdir -p src/background/agents
mkdir -p src/overlay
```

**Validación**:
- ✅ Verificar que todos los directorios existen
- ✅ `ls -la src/shared/` debe mostrar 6 directorios
- ✅ `ls -la src/background/` debe mostrar directorio agents
- ✅ `ls -la src/overlay/` debe existir

---

## ✅ TAREA 2: COPIAR CÓDIGO REUTILIZABLE

**Objetivo**: Copiar 9 archivos core sin modificaciones

### ARCHIVOS A COPIAR

#### 1. EventBus.js
- **Desde**: `src/application/events/EventBus.js`
- **Hacia**: `src/shared/events/EventBus.js`
- **Líneas**: 332
- **Sin cambios**: ✅ EXACTAMENTE IGUAL

#### 2. GameService.js (+ UIService + CardService)
- **Desde**: `src/application/services/GameService.js`
- **Hacia**: `src/shared/services/GameService.js`
- **Líneas**: 776 (contiene 3 clases)
- **Sin cambios**: ✅ EXACTAMENTE IGUAL

#### 3. DatabaseManager.js
- **Desde**: `src/infrastructure/data/DatabaseManager.js`
- **Hacia**: `src/shared/data/DatabaseManager.js`
- **Líneas**: 527
- **Sin cambios**: ✅ EXACTAMENTE IGUAL

#### 4. DeckPredictionEngine.js
- **Desde**: `src/infrastructure/data/DeckPredictionEngine.js`
- **Hacia**: `src/shared/data/DeckPredictionEngine.js`
- **Líneas**: 754
- **Sin cambios**: ✅ EXACTAMENTE IGUAL

#### 5. MTGGoldfishCompleteScraper.js
- **Desde**: `src/infrastructure/data/MTGGoldfishCompleteScraper.js`
- **Hacia**: `src/shared/data/MTGGoldfishCompleteScraper.js`
- **Sin cambios**: ✅ EXACTAMENTE IGUAL

#### 6. AppConfig.js
- **Desde**: `src/config/AppConfig.js`
- **Hacia**: `src/shared/config/AppConfig.js`
- **Líneas**: 289
- **Sin cambios**: ✅ EXACTAMENTE IGUAL

#### 7. Utils.js
- **Desde**: `src/utils/Utils.js`
- **Hacia**: `src/shared/utils/Utils.js`
- **Sin cambios**: ✅ EXACTAMENTE IGUAL

#### 8-16. COMPONENTES UI (9 archivos)
- **Desde**: `src/presentation/components/`
- **Hacia**: `src/shared/components/`
- **Archivos**:
  1. BaseComponent.js
  2. HeaderComponent.js
  3. CardInputComponent.js
  4. PredictionsComponent.js
  5. ConfirmedDeckComponent.js
  6. MetaBrowserComponent.js
  7. DeckDetailComponent.js
  8. StatusComponent.js
  9. DebugComponent.js
  10. MTGArenaSnifferApp.js (opcional, puede quedarse en presentation)

**Sin cambios**: ✅ EXACTAMENTE IGUAL

### VALIDACIÓN TAREA 2

Después de copiar, verificar:
```bash
ls -la src/shared/events/
ls -la src/shared/services/
ls -la src/shared/data/
ls -la src/shared/components/
ls -la src/shared/config/
ls -la src/shared/utils/
```

**Todos deben tener archivos**

---

## ✅ TAREA 3: CREAR OverwolfBridge.js

**Objetivo**: Crear nuevo archivo para comunicación multi-window

**Archivo**: `src/shared/utils/OverwolfBridge.js`

**Contenido EXACTO**:
```javascript
// src/shared/utils/OverwolfBridge.js
// 🌉 Bridge para comunicación entre windows de Overwolf

class OverwolfBridge {
  constructor() {
    this.overlayWindowId = null;
    this.mainWindow = null;
    this.messageHandlers = new Map();
    this.debugMode = true;
  }

  async initialize() {
    this.log('🌉 OverwolfBridge: Inicializando...');
    await this.findMainWindow();
    await this.findOverlayWindow();
    this.setupMessageListener();
    this.log('✅ OverwolfBridge: Listo');
  }

  async findMainWindow() {
    return new Promise((resolve) => {
      overwolf.windows.getMainWindow((result) => {
        if (result.success) {
          this.mainWindow = result.window;
          this.log(`✅ Main window encontrado: ${this.mainWindow.id}`);
        }
        resolve();
      });
    });
  }

  async findOverlayWindow() {
    return new Promise((resolve) => {
      overwolf.windows.obtainDeclaredWindow('OverlayWindow', (result) => {
        if (result.success) {
          this.overlayWindowId = result.window.id;
          this.log(`✅ Overlay window encontrado: ${this.overlayWindowId}`);
        } else {
          this.log('⚠️ Overlay window no disponible');
        }
        resolve();
      });
    });
  }

  setupMessageListener() {
    overwolf.windows.onMessageReceived.addListener((message) => {
      this.log(`📨 Mensaje recibido: ${message.id}`);

      if (this.messageHandlers.has(message.id)) {
        const handler = this.messageHandlers.get(message.id);
        handler(message.data);
      }
    });
  }

  async sendToOverlay(messageId, data) {
    if (!this.overlayWindowId) {
      this.log('⚠️ Overlay window no disponible');
      return false;
    }

    return new Promise((resolve) => {
      overwolf.windows.sendMessage(
        this.overlayWindowId,
        messageId,
        data,
        (response) => {
          if (response?.success) {
            this.log(`✅ Mensaje enviado al overlay: ${messageId}`);
            resolve(true);
          } else {
            this.log(`❌ Error enviando mensaje: ${messageId}`);
            resolve(false);
          }
        }
      );
    });
  }

  async sendToBackground(messageId, data) {
    if (!this.mainWindow) {
      this.log('⚠️ Main window no disponible');
      return false;
    }

    return new Promise((resolve) => {
      overwolf.windows.sendMessage(
        this.mainWindow.id,
        messageId,
        data,
        (response) => {
          if (response?.success) {
            this.log(`✅ Mensaje enviado al background: ${messageId}`);
            resolve(true);
          } else {
            this.log(`❌ Error enviando mensaje: ${messageId}`);
            resolve(false);
          }
        }
      );
    });
  }

  registerMessageHandler(messageId, callback) {
    this.messageHandlers.set(messageId, callback);
    this.log(`📝 Handler registrado: ${messageId}`);
  }

  unregisterMessageHandler(messageId) {
    this.messageHandlers.delete(messageId);
    this.log(`🗑️ Handler removido: ${messageId}`);
  }

  isOverlayReady() {
    return !!this.overlayWindowId;
  }

  isBackgroundReady() {
    return !!this.mainWindow;
  }

  log(message) {
    if (!this.debugMode) return;
    console.log(`🌉 [OverwolfBridge] ${message}`);
  }
}

export default OverwolfBridge;
```

**Validación**:
- ✅ Archivo creado sin errores de sintaxis
- ✅ Clase OverwolfBridge completa
- ✅ Métodos: initialize, findMainWindow, findOverlayWindow, setupMessageListener, sendToOverlay, sendToBackground, registerMessageHandler, unregisterMessageHandler, isOverlayReady, isBackgroundReady, log

---

## ✅ TAREA 4: ACTUALIZAR manifest.json

**Objetivo**: Configurar windows de Overwolf

**Archivo**: `src/manifest.json`

**PASO 1**: Cambiar `start_window`
```javascript
// CAMBIAR DE:
"start_window": "MainWindow",

// CAMBIAR A:
"start_window": "BackgroundWindow",
```

**PASO 2**: Agregar BackgroundWindow en sección `windows`
```javascript
// DENTRO DE "windows": { ... }
"BackgroundWindow": {
  "file": "src/background/background.html",
  "transparent": true,
  "show_in_taskbar": false,
  "override_on_update": true,
  "run_in_background": true,
  "resizable": false,
  "size": {
    "width": 1,
    "height": 1
  }
},
```

**PASO 3**: Agregar OverlayWindow en sección `windows`
```javascript
// DENTRO DE "windows": { ... }
"OverlayWindow": {
  "file": "src/overlay/overlay.html",
  "transparent": true,
  "override_on_update": true,
  "grab_keyboard_focus": false,
  "grab_focus_on_desktop": false,
  "topmost": true,
  "size": {
    "width": 500,
    "height": 600
  },
  "min_size": {
    "width": 400,
    "height": 400
  },
  "start_position": {
    "top": 100,
    "right": 50
  },
  "focus_game_takeover": "ReleaseOnHidden"
},
```

**PASO 4**: Mantener MainWindow sin cambios

**Resultado esperado**:
```javascript
"windows": {
  "BackgroundWindow": { ... },
  "OverlayWindow": { ... },
  "MainWindow": { ... } // SIN CAMBIOS
}
```

**Validación**:
- ✅ manifest.json es JSON válido (sin errores de sintaxis)
- ✅ Tiene 3 windows: BackgroundWindow, OverlayWindow, MainWindow
- ✅ start_window es "BackgroundWindow"
- ✅ Todos los campos requeridos están presentes

---

## ✅ TAREA 5: CREAR ARCHIVOS HTML PLACEHOLDER

**Objetivo**: Crear archivos HTML básicos (serán implementados en FASE 3)

### ARCHIVO 1: src/background/background.html
```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>MTG Arena Sniffer - Background</title>
</head>
<body>
    <h1>Background Window</h1>
    <p>Procesando eventos...</p>
    <script src="background.js"></script>
</body>
</html>
```

### ARCHIVO 2: src/overlay/overlay.html
```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MTG Arena Sniffer - Overlay</title>
</head>
<body>
    <div id="overlay-container">
        <p>Cargando overlay...</p>
    </div>
    <script src="overlay.js"></script>
</body>
</html>
```

**Validación**:
- ✅ Ambos archivos creados
- ✅ HTML válido
- ✅ Script tags correctos

---

## ✅ TAREA 6: VALIDAR Y TESTEAR

**Objetivo**: Verificar que todo está correcto

### VALIDACIONES

```bash
# Verificar estructura directorios
ls -la src/shared/events/
ls -la src/shared/services/
ls -la src/shared/data/
ls -la src/shared/components/
ls -la src/shared/config/
ls -la src/shared/utils/
ls -la src/background/
ls -la src/overlay/

# Verificar archivos copiados
test -f src/shared/events/EventBus.js && echo "✅ EventBus.js" || echo "❌ EventBus.js"
test -f src/shared/services/GameService.js && echo "✅ GameService.js" || echo "❌ GameService.js"
test -f src/shared/data/DatabaseManager.js && echo "✅ DatabaseManager.js" || echo "❌ DatabaseManager.js"
test -f src/shared/data/DeckPredictionEngine.js && echo "✅ DeckPredictionEngine.js" || echo "❌ DeckPredictionEngine.js"
test -f src/shared/config/AppConfig.js && echo "✅ AppConfig.js" || echo "❌ AppConfig.js"
test -f src/shared/utils/Utils.js && echo "✅ Utils.js" || echo "❌ Utils.js"
test -f src/shared/utils/OverwolfBridge.js && echo "✅ OverwolfBridge.js" || echo "❌ OverwolfBridge.js"

# Verificar HTML
test -f src/background/background.html && echo "✅ background.html" || echo "❌ background.html"
test -f src/overlay/overlay.html && echo "✅ overlay.html" || echo "❌ overlay.html"

# Verificar manifest.json es JSON válido
node -e "require('./src/manifest.json')" && echo "✅ manifest.json válido" || echo "❌ manifest.json inválido"
```

### CHECKLIST FINAL

- [ ] Todos los directorios creados
- [ ] 9 archivos copiados correctamente
- [ ] OverwolfBridge.js creado
- [ ] manifest.json actualizado con 3 windows
- [ ] Archivos HTML placeholder creados
- [ ] No hay errores de sintaxis
- [ ] manifest.json es JSON válido
- [ ] Estructura completa lista

---

## 🎯 SALIDA ESPERADA

Después de completar todas las tareas:

```
✅ src/shared/ poblado completamente
✅ 7 módulos core copiados
✅ 9 componentes UI copiados
✅ OverwolfBridge.js funcional
✅ Archivos HTML placeholder listos
✅ manifest.json con 3 windows configuradas
✅ Cero errores de sintaxis
✅ Listo para commit FASE 1
```

---

## 📝 COMMIT FINAL

Después de completar TODO:

```bash
git add -A
git commit -m "🎬 FASE 1: Setup base - Estructura y código copiado

- Creada estructura src/shared/ con 6 subdirectorios
- Copiados 7 módulos core (EventBus, GameService, DeckPredictionEngine, DatabaseManager, AppConfig, Utils, Scraper)
- Copiados 9 componentes UI (BaseComponent, Header, CardInput, Predictions, ConfirmedDeck, MetaBrowser, DeckDetail, Status, Debug)
- Creado OverwolfBridge.js para comunicación multi-window
- Actualizado manifest.json con BackgroundWindow y OverlayWindow
- Archivos HTML placeholder creados
- Estructura FASE 1 completada

PRÓXIMO: FASE 2 - Implementar agentes críticos

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

git push origin main
```

---

## 🆘 SI HAY ERRORES

1. **Error copiando archivos**: Verificar rutas exactas
2. **Error JSON manifest**: Validar comillas y llaves
3. **Error sintaxis HTML**: Verificar apertura/cierre tags
4. **Error JavaScript**: Verificar comillas, puntos y comas

Reportar exactamente qué error ocurrió y en qué archivo.

---

## ✅ ESTADO FINAL

Cuando todo esté completado:
- ✅ FASE 1: SETUP BASE - COMPLETADA
- ✅ Estructura base lista
- ✅ Código copiado
- ✅ OverwolfBridge funcional
- ✅ manifest.json configurado
- ✅ Commit en GitHub
- ➡️ FASE 2: AGENTES CRÍTICOS (próxima)

