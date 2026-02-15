# Arquitectura y Diseño - MTG Arena Sniffer

## Visión General

MTG Arena Sniffer utiliza **Clean Architecture** con 4 capas bien definidas para garantizar mantenibilidad, escalabilidad y separación clara de responsabilidades.

## Capas de Arquitectura

### 1. Infrastructure Layer (Capa de Infraestructura)

Maneja la persistencia de datos, integraciones externas y acceso a APIs.

**Componentes:**

- **DatabaseManager.js** - Gestión de base de datos de mazos
  - Carga datos del meta desde MTGGoldfish
  - Caching de 24 horas
  - Queries complejas para búsqueda de mazos
  - Fallback data en caso de fallos

- **MTGGoldfishCompleteScraper.js** - Scraper de datos del meta
  - Parsea múltiples estrategias (tabla, regex, patrones)
  - Manejo de CORS con proxies rotativos
  - Rate limiting automático
  - Error recovery robusto

- **OverwolfBridge.js** - Comunicación multi-window
  - Envío de mensajes entre windows
  - Handlers de mensajes
  - Sincronización de estado

**Responsabilidades:**
- Acceso a datos externos
- Persistencia local
- Manejo de APIs
- Network communication

### 2. Domain Layer (Capa de Dominio)

Contiene la lógica de negocio central del proyecto.

**Componentes:**

- **DeckPredictionEngine.js** - Motor de predicción de mazos
  - Algoritmo de scoring multicriterio
  - Clasificación de cartas (signature, key, common)
  - Thresholds de confianza (85% para auto-confirm)
  - Cálculo de probabilidades

**Responsabilidades:**
- Lógica de predicción
- Algoritmos de scoring
- Reglas de negocio
- Validación de datos

### 3. Application Layer (Capa de Aplicación)

Orquesta la interacción entre capas y mantiene el estado de la aplicación.

**Componentes:**

- **GameService.js** - Gestión del estado del juego
  - Tracking de cartas jugadas
  - Control del turno actual
  - Confirmación manual de mazos
  - Reset de estado

- **UIService.js** - Gestión de UI
  - Actualización de vistas
  - Gestión de notificaciones
  - Control de visibilidad

- **CardService.js** - Gestión de cartas
  - Validación de cartas
  - Búsqueda de cartas
  - Información de cartas

- **EventBus.js** - Sistema de eventos centralizado
  - Patrón Pub/Sub robusto
  - 30+ eventos predefinidos
  - Listener cleanup automático
  - Debug mode para tracing

**Responsabilidades:**
- Orquestación de servicios
- Gestión de estado
- Comunicación entre módulos
- Event handling

### 4. Presentation Layer (Capa de Presentación)

Interfaz visual y componentes UI.

**Componentes:**

- **BaseComponent.js** - Clase base para todos los componentes
  - Lifecycle hooks (initialize, render, cleanup)
  - Sistema de estado reactivo
  - Rerendering inteligente
  - Auto-cleanup de listeners

- **Componentes especializados:**
  - **HeaderComponent** - Navegación y estado
  - **CardInputComponent** - Entrada de cartas con autocompletado
  - **PredictionsComponent** - Visualización de predicciones
  - **ConfirmedDeckComponent** - Análisis del mazo confirmado
  - **MetaBrowserComponent** - Explorador del meta
  - **DeckDetailComponent** - Detalles de mazo
  - **StatusComponent** - Barra de estado
  - **DebugComponent** - Panel de debugging

**Responsabilidades:**
- Renderización de UI
- Manejo de eventos de usuario
- Actualización visual
- Animaciones y transiciones

## Patrones Utilizados

### 1. Pub/Sub (EventBus)

El EventBus es el corazón de la comunicación entre módulos:

```javascript
// Emitir evento
EventBus.emit('CARD_PLAYED', { card: 'Lightning Bolt', turn: 2 });

// Escuchar evento
EventBus.on('DECK_PREDICTION_UPDATED', (predictions) => {
  console.log('Nuevas predicciones:', predictions);
});

// Escuchar una sola vez
EventBus.once('GAME_STARTED', (gameData) => {
  console.log('Juego iniciado:', gameData);
});
```

**Ventajas:**
- Bajo acoplamiento entre módulos
- Comunicación asincrónica
- Fácil testing
- Escalabilidad

### 2. Inyección de Dependencias

Los servicios reciben sus dependencias como parámetros:

```javascript
class GameService {
  constructor(predictionEngine, databaseManager, eventBus) {
    this.predictionEngine = predictionEngine;
    this.databaseManager = databaseManager;
    this.eventBus = eventBus;
  }
}
```

**Ventajas:**
- Mejor testabilidad
- Desacoplamiento
- Flexibilidad
- Facilita mocking

### 3. Component Lifecycle

Cada componente tiene un ciclo de vida claro:

```javascript
class MyComponent extends BaseComponent {
  async initialize() {
    // Setup inicial
    this.loadData();
  }

  async render() {
    // Renderizar UI
    return '<div>...</div>';
  }

  async cleanup() {
    // Limpiar listeners y recursos
    this.unsubscribeAll();
  }
}
```

### 4. Singleton Pattern

Algunos módulos se instancian una sola vez:

- **EventBus**: Global instance en `window.EventBus`
- **DatabaseManager**: Instancia única con caché compartida
- **AppConfig**: Configuración centralizada

## Flujo de Datos

### Flujo Principal

```
Player.log (MTG Arena)
    ↓
LogMonitorAgent (detecta cambios)
    ↓
EventBus emite: 'log:new-lines'
    ↓
LogParserAgent (escucha evento)
    ↓
Extrae: { card: 'Lightning Bolt', turn: 2 }
    ↓
EventBus emite: 'CARD_PLAYED'
    ↓
GameService (escucha evento)
    ↓
Llama: predictionEngine.addOpponentCard(card)
    ↓
DeckPredictionEngine (calcula scores)
    ↓
EventBus emite: 'DECK_PREDICTION_UPDATED'
    ↓
CommunicationAgent (escucha evento)
    ↓
Envía mensaje al OverlayWindow
    ↓
OverlayController (recibe mensaje)
    ↓
Renderiza predicciones en la UI
    ↓
Usuario ve predicciones en tiempo real
```

## Gestión de Estado

### Estado del Juego

Mantenido por `GameService`:

```javascript
{
  gameId: 'game-123',
  isActive: true,
  currentTurn: 5,
  playerSide: 'opponent',
  cardsPlayed: [
    { name: 'Lightning Bolt', turn: 1 },
    { name: 'Sprite Dragon', turn: 2 }
  ],
  confirmedDeck: null,
  predictions: [
    { deck: 'RDW', probability: 0.85 },
    { deck: 'Gruul Aggro', probability: 0.1 }
  ]
}
```

### Persistencia

- **localStorage**: Caché de meta data, estadísticas
- **Memory**: Estado del juego actual (se limpia al terminar)
- **DatabaseManager**: Caché de 24 horas

## Algoritmo de Predicción

### Scoring Detallado

```javascript
// Para cada mazo en la base de datos:

signature_score = cartas.signature.length * 2.0
key_score = cartas.key.length * 1.5
common_score = cartas.common.length * 1.0

color_match = (colores coinciden) ? 1.3 : 1.0
timing_bonus = (el timing es correcto) ? 1.2 : 1.0
meta_popular = popularidad_en_meta * 1.5

TOTAL_SCORE = (
  signature_score +
  key_score +
  common_score
) * color_match * timing_bonus * meta_popular

// Normalizar entre 0-1
probability = TOTAL_SCORE / max_possible_score
```

### Clasificación de Cartas

Cada mazo en la base de datos tiene cartas clasificadas:

- **Signature Cards**: Cartas que definen el mazo (Lightning Bolt en RDW)
- **Key Cards**: Cartas importantes con peso variable
- **Common Cards**: Cartas frecuentes que ayudan en la identificación

## Integración con Overwolf

### Windows

```
BackgroundWindow (src/background/background.html)
├─ LogMonitorAgent
├─ LogParserAgent
├─ GameService
├─ DeckPredictionEngine
├─ DatabaseManager
├─ AnalyticsAgent
└─ CommunicationAgent

OverlayWindow (src/overlay/overlay.html)
└─ OverlayController (muestra predicciones)

MainWindow (original - opcional)
└─ Para testing y debugging
```

### Comunicación entre Windows

Usa `OverwolfBridge` para enviar mensajes:

```javascript
// En BackgroundWindow
await bridge.sendToOverlay('DECK_PREDICTION_UPDATED', predictions);

// En OverlayWindow
bridge.registerMessageHandler('DECK_PREDICTION_UPDATED', (predictions) => {
  updateUI(predictions);
});
```

## Manejo de Errores

### Estrategia Multi-layer

1. **Try-catch en métodos críticos**
2. **Error events en EventBus** → `SYSTEM_ERROR`
3. **Fallback automático** → Usar datos cached o defaults
4. **Logging detallado** → Para debugging

### Ejemplo

```javascript
try {
  const predictions = await engine.generatePredictions();
  EventBus.emit('DECK_PREDICTION_UPDATED', predictions);
} catch (error) {
  console.error('Error generating predictions:', error);
  EventBus.emit('SYSTEM_ERROR', {
    component: 'DeckPredictionEngine',
    error: error.message,
    timestamp: Date.now()
  });
  // Usar predicciones en cache o arrays vacíos
  const fallbackPredictions = this.getCachedPredictions() || [];
  EventBus.emit('DECK_PREDICTION_UPDATED', fallbackPredictions);
}
```

## Testing

### Arquitectura amigable para testing

1. **Inyección de dependencias** → Fácil de mockear
2. **EventBus centralizado** → Fácil de hacer spy/stub
3. **Servicios sin estado global** → Cada test es independiente
4. **Componentes con clear lifecycle** → Fácil de inicializar/limpiar

### Ejemplo de test

```javascript
// Mock del engine
const mockEngine = {
  addOpponentCard: jest.fn(),
  generatePredictions: jest.fn().mockResolvedValue([...])
};

// Mock de database
const mockDb = {
  findDecksByCard: jest.fn().mockResolvedValue([...])
};

// Mock de eventBus
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn()
};

// Crear servicio con mocks
const service = new GameService(mockEngine, mockDb, mockEventBus);

// Testear
await service.addOpponentCard('Lightning Bolt');
expect(mockEngine.addOpponentCard).toHaveBeenCalledWith('Lightning Bolt');
```

## Extensibilidad

### Agregar nuevo componente UI

1. Extender `BaseComponent`
2. Implementar `initialize()`, `render()`, `cleanup()`
3. Escuchar eventos relevantes
4. Emitir eventos propios

### Agregar nuevo servicio

1. Crear clase con inyección de dependencias
2. Escuchar/emitir eventos del EventBus
3. Registrar en el inicializador principal
4. Documentar eventos emitidos

### Agregar nueva fuente de datos

1. Crear nuevo scraper (similar a MTGGoldfishCompleteScraper)
2. Implementar métodos: `scrape()`, `parse()`, `validate()`
3. Integrar en `DatabaseManager`
4. Cachear resultados

## Performance

### Optimizaciones implementadas

1. **Lazy Loading**: Componentes cargados bajo demanda
2. **Event Cleanup**: Listeners removidos automáticamente
3. **Smart Caching**: 24 horas para datos de meta
4. **Rate Limiting**: 2s entre requests de scraping
5. **Debouncing**: Para actualizaciones frecuentes de UI

### Métricas

- Startup: 2-3 segundos
- Predicción por carta: 100-200ms
- Memory footprint: 10-20MB
- Cache hit rate: 90%+

## Seguridad

### Consideraciones

1. **No almacenar datos sensibles** en localStorage
2. **Validar entrada de usuario** en CardInputComponent
3. **CORS proxy** para requests de scraping
4. **Rate limiting** para evitar abuse

## Documentación de Código

Cada archivo principal debe incluir:

```javascript
/**
 * Descripción general del módulo
 *
 * @class MyService
 * @example
 * const service = new MyService(dep1, dep2);
 * await service.initialize();
 */
```

Cada método público debe tener JSDoc:

```javascript
/**
 * Descripción de qué hace el método
 *
 * @param {Type} param1 - Descripción del parámetro
 * @returns {Promise<Type>} Descripción del retorno
 * @throws {Error} Cuándo lanza error
 */
async myMethod(param1) {
  // implementation
}
```

## Conclusión

La arquitectura de MTG Arena Sniffer está diseñada para ser:

- **Mantenible**: Capas claras y separadas
- **Escalable**: Fácil agregar nuevas features
- **Testeable**: Dependencias inyectables
- **Robusto**: Error handling multi-layer
- **Eficiente**: Optimizaciones implementadas
- **Documentada**: Clear code y JSDoc comments
