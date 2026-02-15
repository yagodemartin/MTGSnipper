# MTG Arena Sniffer

Aplicación inteligente que detecta y predice el mazo del oponente en Magic: The Gathering Arena en tiempo real. Analiza las cartas jugadas por el oponente utilizando datos actualizados del meta para generar predicciones precisas.

## Características Principales

- **Predicción en Tiempo Real**: Analiza cartas jugadas para predecir el mazo del oponente
- **Base de Datos Actualizada**: Scraping automático de MTGGoldfish para datos del meta actual
- **Auto-Confirmación**: Confirma automáticamente mazos con 85%+ de certeza
- **Interfaz Moderna**: UI intuitiva con tema oscuro y animaciones suaves
- **Debug Avanzado**: Panel completo de debugging y análisis
- **Cache Inteligente**: Sistema de cache de 24 horas para datos del meta

## Inicio Rápido

### Requisitos

- Navegador moderno con soporte ES6+
- Conexión a internet para scraping
- Local storage habilitado
- MTG Arena instalado (para usar como overlay)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/yagodemartin/MTGSnipper.git
cd MTGSnipper

# Instalar como aplicación Overwolf
# 1. Abre Overwolf
# 2. Ve a Settings > Extensions > Develop an extension
# 3. Carga el archivo manifest.json del proyecto
```

### Uso Básico

1. Abre MTG Arena
2. Inicia MTG Arena Sniffer desde Overwolf
3. La aplicación monitorea automáticamente el log de MTG Arena
4. Las predicciones se actualizan en tiempo real mientras juegas

## Documentación

- [Arquitectura y Diseño](./docs/ARCHITECTURE.md) - Estructura técnica detallada
- [Guía de Instalación](./docs/INSTALLATION.md) - Pasos para configurar el proyecto
- [Desarrollo y Contribución](./docs/DEVELOPMENT.md) - Cómo contribuir al proyecto
- [Roadmap](./docs/ROADMAP.md) - Futuras características planificadas
- [Plan de Implementación](./docs/IMPLEMENTATION_PLAN.md) - Detalles del sistema multi-agente

## Arquitectura

La aplicación sigue **Clean Architecture** con separación clara de responsabilidades:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  • Overlay UI Components                │
│  • Card Input Interface                 │
│  • Predictions Display                  │
│  • Confirmed Deck Analysis              │
│  • Debug Panel                          │
├─────────────────────────────────────────┤
│         Application Layer               │
│  • GameService                          │
│  • UIService                            │
│  • CardService                          │
│  • EventBus (Pub/Sub)                   │
├─────────────────────────────────────────┤
│           Domain Layer                  │
│  • DeckPredictionEngine                 │
│  • Scoring Algorithms                   │
│  • Game State Logic                     │
├─────────────────────────────────────────┤
│        Infrastructure Layer            │
│  • DatabaseManager                      │
│  • MTGGoldfish Scraper                  │
│  • Cache Management                     │
│  • Overwolf Bridge                      │
└─────────────────────────────────────────┘
```

## Estructura del Proyecto

```
MTGSnipper/mtgArenaSnipper/
├── src/
│   ├── application/
│   │   ├── events/EventBus.js
│   │   └── services/
│   ├── infrastructure/
│   │   └── data/
│   ├── presentation/
│   │   ├── components/
│   │   └── index.html
│   ├── shared/
│   │   ├── events/
│   │   ├── services/
│   │   ├── data/
│   │   ├── components/
│   │   └── utils/
│   ├── background/
│   │   ├── agents/
│   │   └── background.js
│   ├── overlay/
│   │   ├── overlay.js
│   │   └── overlay.css
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

## Motor de Predicción

### Algoritmo de Scoring

El motor calcula puntuaciones usando múltiples factores:

```
Score Total = Signature Cards (×2.0) +
              Key Cards (peso variable) +
              Color Match (×1.3) +
              Timing Bonus (×1.2) +
              Meta Popularity (×1.5)
```

### Niveles de Confianza

- **Very High (85%+)**: Auto-confirmación automática
- **High (70-84%)**: Alta probabilidad
- **Medium (50-69%)**: Probabilidad moderada
- **Low (<50%)**: Baja probabilidad

## Sistema de Eventos

EventBus centralizado con 30+ eventos predefinidos:

```javascript
// Eventos de juego
GAME_STARTED, GAME_ENDED, TURN_STARTED, CARD_PLAYED

// Eventos de predicción
DECK_PREDICTION_UPDATED, DECK_CONFIRMED, DECK_UNCONFIRMED

// Eventos de UI
UI_READY, UI_NOTIFICATION, UI_VIEW_CHANGED

// Eventos de sistema
SYSTEM_READY, SYSTEM_ERROR, DATABASE_UPDATED
```

## Desarrollo

### Configuración del Entorno

```bash
# Instalar dependencias (si las hay)
npm install

# Para desarrollo local, usar test-app.js
npm run test

# Para debugging
npm run debug
```

### VS Code Extensions Recomendadas

- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Thunder Client o REST Client

### Testing

Usa la aplicación de pruebas en `src/test-app.js` para testing sin MTG Arena:

```javascript
const testApp = new SimpleTestApp();
await testApp.initialize();
testApp.testSequence();
```

## Performance

### Optimizaciones

- Event Bus optimizado con cleanup automático
- Cache inteligente para reducir requests
- Lazy loading de componentes
- Rate limiting en scraping (2s entre requests)
- Memory management con cleanup automático

### Métricas

- Tiempo de startup: ~2-3 segundos
- Predicción por carta: ~100-200ms
- Uso de memoria: ~10-20MB
- Cache hit rate: ~90%+

## Robustez

### Error Handling

- Múltiples estrategias de parsing
- Fallback automático en fallos de scraping
- Retry logic con exponential backoff
- Graceful degradation sin datos

### Logging

Sistema completo de logging:

- Console logs con formato consistente
- Historial de eventos para debugging
- Error tracking detallado
- Performance metrics

## Roadmap

### Próximas Características

1. **Machine Learning**: Predicciones más precisas con ML
2. **Múltiples Formatos**: Standard, Historic, Pioneer, Commander
3. **Tracking Personal**: Estadísticas de win rate personal
4. **Sugerencias de Play**: IA que sugiere jugadas óptimas
5. **Mobile App**: Versión para dispositivos móviles
6. **Integración MTGO**: Soporte para Magic Online

### APIs Adicionales Planeadas

- **Scryfall**: Información detallada de cartas
- **MTGTop8**: Datos de torneos competitivos
- **EDHRec**: Datos de Commander
- **17Lands**: Estadísticas de Limited

## Contribuir

### Guidelines

1. Seguir Clean Architecture
2. Mantener separación de responsabilidades
3. Añadir tests para nuevas funcionalidades
4. Documentar cambios en el código
5. Usar conventional commits

### Áreas de Contribución

- Mejoras en algoritmos de predicción
- Nuevos scrapers para otras fuentes
- Optimizaciones de performance
- Nuevas funcionalidades UI
- Tests automatizados

### Cómo Contribuir

1. Fork el repositorio
2. Crea una rama con tu feature: `git checkout -b feature/tu-feature`
3. Commit con conventional commits: `git commit -m "feat: descripción"`
4. Push a la rama: `git push origin feature/tu-feature`
5. Abre un Pull Request

## Licencia

MIT License - Ver LICENSE file para detalles.

## Agradecimientos

- **MTGGoldfish**: Por proporcionar datos del meta
- **Scryfall**: Por la API de cartas
- **Overwolf**: Por la plataforma de gaming apps
- **Comunidad MTG**: Por feedback y sugerencias

## Soporte

Para reportar bugs o solicitar funcionalidades:

1. [Crear issue en GitHub](https://github.com/yagodemartin/MTGSnipper/issues)
2. Incluir información de reproducción
3. Adjuntar logs de debug si es posible

## Stack Técnico

- **JavaScript (Vanilla)**: Sin frameworks externos
- **Overwolf API**: Para integración con MTG Arena
- **LocalStorage**: Para persistencia de datos
- **Clean Architecture**: Patrón de diseño
- **Pub/Sub Pattern**: Para comunicación entre componentes

---

**MTG Arena Sniffer** - Detecta el mazo del oponente como un profesional

Desarrollado con pasión por la comunidad MTG.
