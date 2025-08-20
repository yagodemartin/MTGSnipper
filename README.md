# 🔍 MTG Arena Sniffer

## 📋 Descripción

**MTG Arena Sniffer** es una aplicación inteligente que detecta y predice el mazo del oponente en Magic: The Gathering Arena en tiempo real. Analiza las cartas jugadas por el oponente y utiliza datos actualizados del meta para generar predicciones precisas sobre qué mazo está usando.

## 🎯 Características Principales

- **🔮 Predicción en Tiempo Real**: Analiza cartas jugadas para predecir el mazo del oponente
- **📊 Base de Datos Actualizada**: Scraping automático de MTGGoldfish para datos del meta actual
- **🎯 Auto-Confirmación**: Confirma automáticamente mazos con 95%+ de certeza
- **🎨 Interfaz Moderna**: UI intuitiva con tema oscuro y animaciones suaves
- **🔧 Debug Avanzado**: Panel completo de debugging y análisis
- **💾 Cache Inteligente**: Sistema de cache de 24 horas para datos del meta

## 🏗️ Arquitectura

La aplicación sigue **Clean Architecture** con separación clara de responsabilidades:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  • HeaderComponent                      │
│  • CardInputComponent                   │
│  • PredictionsComponent                 │
│  • ConfirmedDeckComponent               │
│  • DebugComponent                       │
├─────────────────────────────────────────┤
│         Application Layer               │
│  • GameService                         │
│  • UIService                           │
│  • CardService                         │
│  • EventBus                            │
├─────────────────────────────────────────┤
│           Domain Layer                  │
│  • DeckPredictionEngine                 │
│  • Business Logic                      │
│  • Scoring Algorithms                  │
├─────────────────────────────────────────┤
│        Infrastructure Layer            │
│  • DatabaseManager                     │
│  • MTGGoldfishCompleteScraper          │
│  • Cache Management                    │
└─────────────────────────────────────────┘
```

## 📁 Estructura del Proyecto

```
mtgArenaSnipper/
├── src/
│   ├── application/
│   │   ├── services/
│   │   │   ├── GameService.js          # Gestión del estado del juego
│   │   │   ├── UIService.js            # Gestión de la interfaz
│   │   │   └── CardService.js          # Gestión de cartas
│   │   └── events/
│   │       └── EventBus.js             # Sistema de eventos centralizado
│   ├── infrastructure/
│   │   └── data/
│   │       ├── DatabaseManager.js      # Gestión de datos del meta
│   │       ├── MTGGoldfishCompleteScraper.js  # Scraping de MTGGoldfish
│   │       └── DeckPredictionEngine.js # Motor de predicción
│   ├── presentation/
│   │   └── components/
│   │       ├── BaseComponent.js        # Componente base
│   │       ├── HeaderComponent.js      # Header y navegación
│   │       ├── CardInputComponent.js   # Entrada de cartas
│   │       ├── PredictionsComponent.js # Vista de predicciones
│   │       ├── ConfirmedDeckComponent.js # Mazo confirmado
│   │       ├── StatusComponent.js      # Barra de estado
│   │       ├── DebugComponent.js       # Panel de debug
│   │       └── MTGArenaSnifferApp.js   # Aplicación principal
│   ├── index.html                      # Punto de entrada
│   ├── test-app.js                     # Aplicación de pruebas
│   └── manifest.json                   # Configuración Overwolf
├── css/
│   └── main.css                        # Estilos principales
└── README.md                           # Documentación
```

## 🧠 Motor de Predicción

### Algoritmo de Scoring

El motor calcula puntuaciones usando múltiples factores:

```
Score Total = Signature Cards (×2.0) + 
              Key Cards (peso variable) + 
              Color Match (×1.3) + 
              Timing Bonus (×1.2) + 
              Meta Popularity (×1.5) + 
              Archetype Modifier
```

### Tipos de Cartas

1. **Signature Cards**: Cartas que confirman un mazo específico (peso máximo)
2. **Key Cards**: Cartas importantes con peso variable según copias
3. **Common Cards**: Cartas frecuentes que ayudan a la identificación

### Niveles de Confianza

- **Very High (95%+)**: Auto-confirmación automática
- **High (80-94%)**: Alta probabilidad
- **Medium (50-79%)**: Probabilidad moderada  
- **Low (<50%)**: Baja probabilidad

## 📊 Sistema de Datos

### Fuentes de Datos

- **MTGGoldfish**: Scraping automático del meta Standard
- **Cache Local**: Almacenamiento de 24 horas
- **Fallback Data**: Datos estáticos de respaldo

### Estrategias de Scraping

El scraper utiliza 4 estrategias de parsing para máxima robustez:

1. **Modern Table Parser**: Análisis de tablas modernas
2. **Text Pattern Parser**: Búsqueda por patrones de texto
3. **Regex Scanner**: Escaneo con expresiones regulares
4. **Fallback Method**: Método de respaldo con estimaciones

### CORS y Proxies

Sistema de proxies rotativos para evitar restricciones CORS:
- `api.allorigins.win`
- `corsproxy.io`
- `cors.bridged.cc`

## 🎨 Componentes UI

### BaseComponent

Clase base para todos los componentes con:
- Sistema de estado reactivo
- Lifecycle hooks (initialize, render, cleanup)
- Event management automático
- Re-rendering inteligente

### Componentes Principales

1. **HeaderComponent**: Navegación y estado de conexión
2. **CardInputComponent**: Entrada de cartas con autocompletado
3. **PredictionsComponent**: Visualización de predicciones rankeadas
4. **ConfirmedDeckComponent**: Análisis detallado del mazo confirmado
5. **DebugComponent**: Panel avanzado de debugging

## 🔧 Sistema de Eventos

EventBus centralizado con +40 eventos predefinidos:

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

## 🚀 Instalación y Uso

### Requisitos

- Navegador moderno con soporte ES6+
- Conexión a internet para scraping
- Local storage habilitado
- VS Code (recomendado para desarrollo)

### 🔧 Configuración del Entorno de Desarrollo

#### VS Code Extensions Recomendadas

Instalar las siguientes extensiones para una experiencia de desarrollo óptima:

```json
{
  "recommendations": [

### Configuración Overwolf

Para usar como aplicación de Overwolf:

1. Copiar el proyecto a la carpeta de Overwolf
2. Configurar `manifest.json` según necesidades
3. Activar en Overwolf para MTG Arena (Game ID: 21308)

## 🔧 Configuración

### DatabaseManager

```javascript
const config = {
    maxCacheAge: 24 * 60 * 60 * 1000, // 24 horas
    fallbackData: true,                // Usar datos de respaldo
    autoUpdate: true,                  // Auto-actualizar al inicio
    debugMode: true                    // Modo debug
};
```

### PredictionEngine

```javascript
const config = {
    confirmationThreshold: 0.95,    // 95% para auto-confirmar
    minCardsForPrediction: 2,       // Mínimo 2 cartas
    maxPredictions: 5,              // Top 5 predicciones
    decayFactor: 0.9,               // Decay para cartas antiguas
    bonusMultipliers: {
        signature: 2.0,             // Signature cards ×2
        meta_popular: 1.5,          // Mazos populares ×1.5
        color_match: 1.3,           // Match exacto ×1.3
        turn_timing: 1.2            // Timing correcto ×1.2
    }
};
```

## 🧪 Testing

### Aplicación de Pruebas

`test-app.js` incluye una aplicación simplificada para testing:

```javascript
const testApp = new SimpleTestApp();
await testApp.initialize();

// Secuencia de prueba automática
testApp.testSequence();
```

### Debug Dashboard

Panel completo con 7 tabs:
- **Overview**: Estado general del sistema
- **Events**: Monitor de eventos en tiempo real
- **Database**: Estado de la base de datos
- **Predictions**: Análisis del motor de predicción
- **Game State**: Estado actual del juego
- **Performance**: Métricas de rendimiento
- **API Tests**: Pruebas de conectividad

## 📈 Performance

### Optimizaciones

- **Event Bus** optimizado con cleanup automático
- **Cache inteligente** para reducir requests
- **Lazy loading** de componentes
- **Rate limiting** en scraping (2s entre requests)
- **Memory management** con cleanup automático

### Métricas

- Tiempo de startup: ~2-3 segundos
- Predicción por carta: ~100-200ms
- Uso de memoria: ~10-20MB
- Cache hit rate: ~90%+

## 🛡️ Robustez

### Error Handling

- **Múltiples estrategias** de parsing
- **Fallback automático** en fallos de scraping
- **Retry logic** con exponential backoff
- **Graceful degradation** sin datos

### Logging

Sistema completo de logging:
- Console logs con formato consistente
- Historial de eventos para debugging
- Error tracking detallado
- Performance metrics

## 🔮 Roadmap

### Próximas Características

1. **Machine Learning**: Predicciones más precisas con ML
2. **Múltiples Formatos**: Standard, Historic, Pioneer, Commander
3. **Tracking Personal**: Estadísticas de win rate personal
4. **Sugerencias de Play**: IA que sugiere jugadas óptimas
5. **Mobile App**: Versión para dispositivos móviles
6. **Integración MTGO**: Soporte para Magic Online

### APIs Adicionales

- **Scryfall**: Información detallada de cartas
- **MTGTop8**: Datos de torneos competitivos
- **EDHRec**: Datos de Commander
- **17Lands**: Estadísticas de Limited

## 🤝 Contribuir

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

## 📄 Licencia

MIT License - Ver LICENSE file para detalles.

## 🙏 Agradecimientos

- **MTGGoldfish**: Por proporcionar datos del meta
- **Scryfall**: Por la API de cartas
- **Overwolf**: Por la plataforma de gaming apps
- **Comunidad MTG**: Por feedback y sugerencias

## 📞 Soporte

Para reportar bugs o solicitar funcionalidades:
1. Crear issue en GitHub
2. Incluir información de reproducción
3. Adjuntar logs de debug si es posible

---

**MTG Arena Sniffer** - Detecta el mazo del oponente como un profesional 🎯# MTGSnipper
