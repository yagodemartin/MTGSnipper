# Guía de Desarrollo - MTG Arena Sniffer

## Configuración del Entorno de Desarrollo

### Requisitos

- **Node.js** 14+ (aunque el proyecto es vanilla JavaScript)
- **Git** para control de versiones
- **VS Code** con extensiones recomendadas
- **Overwolf** instalado

### Extensiones de VS Code Recomendadas

```json
{
  "recommendations": [
    "dsznajder.es7-react-js-snippets",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "rangav.vscode-thunder-client",
    "intellsmi.comment-translate",
    "eamodio.gitlens",
    "ms-vscode.json-editor"
  ]
}
```

Instala con:

```bash
code --install-extension dsznajder.es7-react-js-snippets
code --install-extension esbenp.prettier-vscode
# ... etc
```

### Setup Inicial

```bash
# 1. Clonar repositorio
git clone https://github.com/yagodemartin/MTGSnipper.git
cd MTGSnipper

# 2. Abrir en VS Code
code .

# 3. Verificar estructura
ls -la mtgArenaSnipper/src/

# 4. Cargar en Overwolf como extensión de desarrollo
# (ver INSTALLATION.md para pasos)
```

## Estructura de Directorios

```
mtgArenaSnipper/
├── src/
│   ├── application/          # Servicios y orquestación
│   │   ├── events/
│   │   │   └── EventBus.js
│   │   └── services/
│   │       ├── GameService.js
│   │       ├── UIService.js
│   │       └── CardService.js
│   ├── infrastructure/       # Acceso a datos y APIs
│   │   └── data/
│   │       ├── DatabaseManager.js
│   │       ├── DeckPredictionEngine.js
│   │       └── MTGGoldfishCompleteScraper.js
│   ├── presentation/         # UI original
│   │   ├── components/
│   │   ├── index.html
│   │   └── test-app.js
│   ├── shared/              # Código compartido
│   │   ├── events/
│   │   ├── services/
│   │   ├── data/
│   │   ├── components/
│   │   ├── config/
│   │   └── utils/
│   ├── background/          # Background window
│   │   ├── agents/
│   │   ├── background.html
│   │   └── background.js
│   ├── overlay/             # Overlay window
│   │   ├── overlay.html
│   │   ├── overlay.js
│   │   └── overlay.css
│   ├── config/
│   │   └── AppConfig.js
│   ├── utils/
│   │   └── Utils.js
│   └── manifest.json
├── css/
│   └── main.css
├── docs/
│   ├── ARCHITECTURE.md
│   ├── INSTALLATION.md
│   ├── DEVELOPMENT.md
│   ├── ROADMAP.md
│   └── IMPLEMENTATION_PLAN.md
└── README.md
```

## Convenciones de Código

### Naming Conventions

```javascript
// Clases: PascalCase
class GameService { }
class DeckPredictionEngine { }

// Métodos: camelCase
myMethod()
addOpponentCard()

// Constantes: UPPER_SNAKE_CASE
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000;
const DEFAULT_THRESHOLD = 0.85;

// Privadas: prefijo _
_internalMethod()
_cachedData

// Variables: camelCase
let currentTurn;
const selectedDeck;
```

### Formatting

Usa Prettier (auto-configurado):

```bash
# Formatear archivo
code -command editor.action.formatDocument

# O configurar auto-format on save en VS Code settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### JSDoc Comments

Documenta funciones públicas:

```javascript
/**
 * Agrega una carta jugada por el oponente al análisis
 *
 * @param {string} cardName - Nombre de la carta
 * @param {number} turn - Número del turno
 * @returns {Promise<void>}
 * @throws {Error} Si la carta no existe
 *
 * @example
 * await gameService.addOpponentCard('Lightning Bolt', 2);
 */
async addOpponentCard(cardName, turn) {
  // implementation
}
```

## Flujo de Desarrollo

### 1. Crear Feature Branch

```bash
# Usa conventional commits para naming
git checkout -b feature/my-feature
git checkout -b fix/bug-name
git checkout -b docs/update-readme
```

### 2. Hacer Cambios

Sigue estas prácticas:

- Una responsabilidad por archivo
- Mantén métodos pequeños (<50 líneas)
- Comenta lógica compleja
- Escribe tests si es posible

### 3. Testing Local

```bash
# Opción 1: Usar test-app.js
# Abre en navegador: src/test-app.js
# O carga en Overwolf desde presentation/

# Opción 2: Testing en Overwolf
# 1. Carga extensión en desarrollo
# 2. Abre DevTools (F12)
# 3. Prueba manualmente
# 4. Revisa consola para errores
```

### 4. Commit con Conventional Commits

```bash
# Formato: <type>(<scope>): <subject>

git commit -m "feat(prediction): improve scoring algorithm"
git commit -m "fix(parser): handle edge case in log parsing"
git commit -m "docs: update architecture diagram"
git commit -m "refactor(services): reorganize GameService"
git commit -m "test: add unit tests for DeckPredictionEngine"
```

**Tipos válidos:**
- `feat`: Nueva funcionalidad
- `fix`: Bug fix
- `docs`: Documentación
- `refactor`: Cambios de código sin añadir features
- `test`: Tests o fixing tests
- `perf`: Mejoras de performance
- `chore`: Cambios en build, deps, etc.

### 5. Push y Pull Request

```bash
git push origin feature/my-feature

# En GitHub, abre PR con descripción:
# - Qué cambios hace
# - Por qué es necesario
# - Screenshots si aplica
# - Testing que hiciste
```

## Desarrollo de Nuevas Features

### Agregar nuevo componente UI

1. **Crear archivo en `src/shared/components/`**

```javascript
// src/shared/components/MyComponent.js
class MyComponent extends BaseComponent {
  async initialize() {
    this.setupEventListeners();
  }

  async render() {
    return `
      <div class="my-component">
        <h2>Mi Componente</h2>
      </div>
    `;
  }

  async cleanup() {
    this.unsubscribeAll();
  }
}

export default MyComponent;
```

2. **Registrar en el inicializador**

```javascript
// En background.js o main inicializador
const myComponent = new MyComponent();
await myComponent.initialize();
```

3. **Escuchar eventos si es necesario**

```javascript
EventBus.on('DECK_PREDICTION_UPDATED', (predictions) => {
  this.updateView(predictions);
});
```

### Agregar nuevo servicio

1. **Crear clase en `src/shared/services/`**

```javascript
class MyService {
  constructor(eventBus, database) {
    this.eventBus = eventBus;
    this.database = database;
  }

  async initialize() {
    // Setup
  }

  async doSomething() {
    try {
      // implementación
      this.eventBus.emit('MY_SERVICE_UPDATED', data);
    } catch (error) {
      this.eventBus.emit('SYSTEM_ERROR', { error });
    }
  }
}
```

2. **Inyectar dependencias**

```javascript
const myService = new MyService(EventBus, databaseManager);
await myService.initialize();
```

### Agregar nuevo algoritmo de predicción

1. **Extender `DeckPredictionEngine`**

```javascript
// En DeckPredictionEngine.js
calculateMyNewScore(deck, playedCards) {
  // Tu lógica aquí
  let score = 0;

  // scoring logic

  return score;
}

// Integrar en calculateScore()
calculateScore(deck, playedCards) {
  const baseScore = this.calculateBaseScore(deck, playedCards);
  const newScore = this.calculateMyNewScore(deck, playedCards);

  return baseScore * 0.8 + newScore * 0.2; // pesar
}
```

2. **Testear con datos reales**

```javascript
const testCards = ['Lightning Bolt', 'Sprite Dragon'];
const scores = engine.generateRealCardPredictions(testCards);
console.log(scores);
```

## Testing

### Testing Manual

En Overwolf:

```javascript
// En DevTools (F12)

// Testear EventBus
EventBus.on('CARD_PLAYED', (card) => console.log('Card:', card));
EventBus.emit('CARD_PLAYED', { name: 'Lightning Bolt', turn: 2 });

// Testear servicio
const game = new GameService(engine, db, EventBus);
await game.addOpponentCard('Lightning Bolt');
console.log(game.getGameState());
```

### Testing Automatizado (si lo implementas)

```javascript
// test/gameService.test.js
describe('GameService', () => {
  let service;

  beforeEach(() => {
    const mockEngine = { /* mocks */ };
    const mockDb = { /* mocks */ };
    const mockEventBus = { /* mocks */ };

    service = new GameService(mockEngine, mockDb, mockEventBus);
  });

  test('should add opponent card', async () => {
    await service.addOpponentCard('Lightning Bolt');
    expect(service.getGameState().cardsPlayed).toHaveLength(1);
  });
});
```

## Debugging

### DevTools de Overwolf

```javascript
// Abre DevTools con F12 en la ventana principal

// Ver logs
console.log('Debug:', value);

// Ver eventos
EventBus.setDebugMode(true);
EventBus.debugRecentEvents();

// Inspeccionar estado
console.log(GameService.getGameState());
console.log(localStorage);

// Testear métodos
const result = await engine.generatePredictions();
console.table(result);
```

### Debug Panel

Si existe `DebugComponent.js`, abre el panel de debugging:

1. Abre la aplicación principal
2. Busca "Debug" en la UI
3. Ver eventos, estado, métricas

### Breakpoints

En Chrome DevTools:

1. Abre DevTools (F12)
2. Ir a Sources tab
3. Click en número de línea para breakpoint
4. Usa Step over/into para debuggear

## Performance Optimization

### Profiling

```javascript
// Medir tiempo de ejecución
console.time('myOperation');
// ... código ...
console.timeEnd('myOperation');

// Medir memory
console.memory.usedJSHeapSize / 1048576 + ' MB'

// Usar Performance API
performance.mark('start');
// ... código ...
performance.mark('end');
performance.measure('myMeasure', 'start', 'end');
```

### Optimizaciones comunes

1. **Cachear resultados**

```javascript
let cachedPredictions = null;
let cacheTimestamp = 0;

function getPredictions() {
  if (cachedPredictions && Date.now() - cacheTimestamp < 5000) {
    return cachedPredictions;
  }
  cachedPredictions = // calcular
  cacheTimestamp = Date.now();
  return cachedPredictions;
}
```

2. **Debouncing de eventos**

```javascript
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Uso
const debouncedUpdate = debounce(updateUI, 300);
EventBus.on('CARD_PLAYED', debouncedUpdate);
```

3. **Cleanup automático**

```javascript
async cleanup() {
  // Remover todos los listeners
  EventBus.off('CARD_PLAYED', this.onCardPlayed);

  // Limpiar timers
  clearTimeout(this.timer);

  // Limpiar referencias
  this.data = null;
}
```

## Documentación

### Actualizar documentación

1. **Cambios en arquitectura**: Actualizar [ARCHITECTURE.md](./ARCHITECTURE.md)
2. **Nuevas features**: Actualizar [README.md](../README.md)
3. **Roadmap**: Actualizar [ROADMAP.md](./ROADMAP.md)
4. **Guías de desarrollo**: Actualizar este archivo

### Generar documentación automática

Si usas JSDoc:

```bash
# Instalar jsdoc
npm install --save-dev jsdoc

# Generar docs
jsdoc src/ -d docs/api/

# Abre docs/api/index.html
```

## Git Workflow

### Branches

```bash
# Desarrollo
git checkout -b feature/new-feature

# Fixes
git checkout -b fix/bug-name

# Documentación
git checkout -b docs/update

# Cambios críticos
git checkout -b hotfix/critical-bug
```

### Commits regulares

```bash
# Haz commits pequeños y frecuentes
git commit -m "feat: add new prediction algorithm"
git commit -m "fix: handle edge case in parser"
git commit -m "docs: improve architecture docs"

# No commits monolíticos de 100 líneas
```

### Before Push

```bash
# Verifica que el código está limpio
git status

# Verifica que no hay errores
# (abre DevTools y revisa console)

# Verifica commits están en orden
git log --oneline -5

# Push
git push origin feature/my-feature
```

## Troubleshooting de Desarrollo

### Cambios no aparecen

**Solución:**
1. Recarga la extensión en Overwolf (Settings > Extensions)
2. Limpia cache de navegador (Ctrl+Shift+Del)
3. Reinicia Overwolf completamente

### Errores de imports

**Solución:**
1. Verifica que la ruta es correcta
2. Verifica que el archivo existe
3. Usa rutas absolutas desde `src/`

### EventBus no funciona

**Solución:**
```javascript
// Verifica que EventBus está inicializado
console.log(window.EventBus);

// Verifica listeners
EventBus.debugListeners();

// Reinicias listeners si es necesario
EventBus.clear();
```

### Memory leaks

**Solución:**
```javascript
// En cleanup(), siempre remover listeners
async cleanup() {
  EventBus.off('CARD_PLAYED', this.boundHandler);
  clearTimeout(this.timer);
  this.data = null;
}
```

## Recursos Útiles

- [Overwolf Dev Docs](https://dev.overwolf.com/)
- [MTG Arena Logs Format](https://mtgatool.com/docs/logs)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [JavaScript Design Patterns](https://www.patterns.dev/posts/observer-pattern/)

---

Ahora estás listo para desarrollar. Sigue las convenciones, escribe tests, y mantén la documentación actualizada.

¡Feliz coding!
