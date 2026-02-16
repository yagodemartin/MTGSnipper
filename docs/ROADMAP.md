# Roadmap - MTG Arena Sniffer

Visión del proyecto y características planeadas para los próximos meses.

## Visión General

**MTG Arena Sniffer** busca convertirse en la herramienta definitiva para analizar el meta de MTG Arena y obtener ventaja competitiva mediante predicción inteligente de mazos.

## Versiones Planeadas

### v1.0 - MVP (Current)

**Estado:** En progreso

Funcionalidades core:

- ✅ Monitoreo en tiempo real de logs de MTG Arena
- ✅ Predicción de mazos basada en cartas jugadas
- ✅ Base de datos actualizada del meta
- ✅ Auto-confirmación de mazos al 85%+
- ✅ Interface de overlay in-game
- ✅ Sistema de cache de 24 horas
- ✅ Panel de debugging

**Fecha estimada:** Q1 2026

**Tareas pendientes:**

- [ ] Testing completo con MTG Arena
- [ ] Optimizaciones de performance
- [ ] Documentación de usuario
- [ ] Release en Overwolf Appstore

### v1.1 - Mejoras de Precisión

**Estado:** Planeado

Mejoras en el algoritmo de predicción:

- [ ] Agregar más fuentes de datos (MTGTop8, 17Lands)
- [ ] Machine Learning básico para ajustar pesos
- [ ] Historial de cambios del meta en tiempo real
- [ ] Análisis de sideboard
- [ ] Predicción de próxima carta basada en mazo

**Características:**

- [ ] Rastreo de cambios del meta por día
- [ ] Gráficos de popularidad de mazos
- [ ] Análisis de "meta shifts"
- [ ] Sugerencias de techs basadas en meta

**Fecha estimada:** Q2 2026

### v1.2 - Analytics y Estadísticas

**Estado:** Planeado

Seguimiento de rendimiento personal:

- [ ] Historial de predicciones vs resultados
- [ ] Estadísticas de win rate por mazo predicho
- [ ] Precisión de predicciones (accuracy metrics)
- [ ] Comparación con otros jugadores (anónimo)
- [ ] Reporte mensual de estadísticas

**Características:**

- [ ] Dashboard de analytics personal
- [ ] Gráficos de performance
- [ ] Exportar estadísticas
- [ ] Integración con trackers externos (opcional)

**Fecha estimada:** Q2 2026

### v2.0 - Multi-Format

**Estado:** Futuro

Soporte para múltiples formatos:

- [ ] Historic
- [ ] Pioneer
- [ ] Modern
- [ ] Commander (EDH)
- [ ] Limited (Draft/Sealed)

**Características:**

- [ ] Selector de formato en UI
- [ ] Bases de datos separadas por formato
- [ ] Algoritmo adaptado por formato
- [ ] Cartas legales por formato

**Fecha estimada:** Q3 2026

### v2.1 - AI y Machine Learning

**Estado:** Futuro

Predicciones basadas en ML:

- [ ] Entrenar modelo con datos históricos
- [ ] Predicción de sideboard post-game-1
- [ ] Análisis de patrones de juego del oponente
- [ ] Predicción de mulligans
- [ ] Sugerencias de play óptimas

**Características:**

- [ ] ML model entrenado localmente
- [ ] Predicción de estrategia del oponente
- [ ] Análisis de decisiones de juego
- [ ] Feedback loop de entrenamiento

**Fecha estimada:** Q4 2026

### v3.0 - Eco-sistema

**Estado:** Futuro

Expansión a múltiples plataformas:

- [ ] Mobile app (iOS/Android)
- [ ] Web version
- [ ] Magic Online (MTGO) support
- [ ] Integraciones con streaming
- [ ] API pública

**Características:**

- [ ] Sincronización multi-dispositivo
- [ ] Livestream overlay
- [ ] Estadísticas en la nube
- [ ] API para terceros
- [ ] Plugin para Discord

**Fecha estimada:** 2027

## Roadmap Detallado por Trimestre

### Q1 2026

```
Enero:
- [ ] Completar FASE 1-3 de implementación
- [ ] Testing inicial con MTG Arena
- [ ] Documentación de usuario

Febrero:
- [ ] FASE 4-5: Analytics y testing
- [ ] Bug fixes basados en testing
- [ ] Optimizaciones de performance

Marzo:
- [ ] Release v1.0
- [ ] Submitter a Overwolf Appstore
- [ ] Feedback inicial de usuarios
```

### Q2 2026

```
Abril:
- [ ] v1.1: Nuevas fuentes de datos
- [ ] Mejoras en algoritmo de scoring
- [ ] Analytics básico

Mayo:
- [ ] Machine Learning MVP
- [ ] Dashboard de estadísticas
- [ ] Support de MTGTop8

Junio:
- [ ] v1.2 release
- [ ] Análisis de "meta shifts"
- [ ] Sugerencias de techs
```

### Q3 2026

```
Julio:
- [ ] Soporte para Historic
- [ ] Soporte para Pioneer
- [ ] Bases de datos separadas

Agosto:
- [ ] Soporte para Modern
- [ ] UI mejorada para multi-format
- [ ] Selector de formato

Septiembre:
- [ ] v2.0 release
- [ ] Feedback de comunidad
- [ ] Optimizaciones finales
```

### Q4 2026

```
Octubre:
- [ ] Machine Learning avanzado
- [ ] Análisis de sideboard
- [ ] Predicción de mulligans

Noviembre:
- [ ] Soporte Commander
- [ ] Análisis de patrones de juego
- [ ] V2.1 release

Diciembre:
- [ ] Planificación para 2027
- [ ] Community feedback
- [ ] Roadmap 2027
```

## Características por Prioridad

### Alta Prioridad (Q1-Q2)

1. **Precisión de predicciones**
   - Mejorar algoritmo de scoring
   - Integrar más fuentes de datos
   - Machine Learning básico

2. **Performance**
   - Optimización de scrapers
   - Reducción de memory footprint
   - Cache más inteligente

3. **Estabilidad**
   - Error handling robusto
   - Testing completo
   - Logging detallado

### Media Prioridad (Q2-Q3)

1. **User Analytics**
   - Estadísticas de predicción
   - Dashboard personal
   - Tracking de performance

2. **Multi-Format**
   - Soporte Historic
   - Soporte Pioneer
   - Arquitectura flexible

3. **UI/UX**
   - Mejoras visuales
   - Temas personalizables
   - Shortcuts de teclado

### Baja Prioridad (Q4+)

1. **Integraciones externas**
   - API pública
   - Webhooks
   - Plugins

2. **Plataformas adicionales**
   - Mobile app
   - Web version
   - MTGO support

3. **Features avanzadas**
   - Streaming integration
   - Social features
   - Torneos (si es viable)

## Criterios de Éxito

### Por Versión

**v1.0:**
- Detección de cartas > 95% accuracy
- Predicción de mazos > 85% accuracy
- Performance < 5% CPU en idle
- 0 memory leaks

**v1.1:**
- Predicción mejorada a > 90% accuracy
- Machine Learning model entrenado
- Analytics dashboard funcional
- Multi-source data integration

**v2.0:**
- Soporte de todos los formatos
- Same performance en todos
- Base de datos de 1000+ mazos
- Community feedback positivo

## Solicitud de Features

### Cómo solicitar

1. Abre un [GitHub Issue](https://github.com/yagodemartin/MTGSnipper/issues)
2. Usa template: `[FEATURE] Nombre breve`
3. Describe la funcionalidad en detalle
4. Explica por qué la necesitas

### Ejemplos de buenos issues

```
[FEATURE] Soporte para Limited (Draft/Sealed)

Descripción:
La mayoría de mis partidas son en Limited, me gustaría que MTG Arena Sniffer
también funcionara para Draft y Sealed.

Beneficio:
Predicción de mazos en Limited es igualmente importante que en Constructed.

Detalles técnicos:
- Usar scryfall para cartas legales en limited
- Adaptar algoritmo para fewer cards
```

## Dependencias Externas

### Planeadas para integración

- **Scryfall API** - Info de cartas (Ya integrado parcialmente)
- **MTGGoldfish** - Meta data (Ya integrado)
- **MTGTop8** - Torneos competitivos (Planeado)
- **17Lands** - Limited stats (Planeado)
- **Overwolf API** - Plataforma (Ya integrado)

## Consideraciones de Diseño

### Problemas a resolver

1. **Cartas nuevas** - Mazos con cartas del día anterior
2. **Cambios de meta** - Algoritmo debe adaptarse rápidamente
3. **Rogue decks** - Mazos fuera del meta
4. **Sideboard changes** - Predicción post-game-1
5. **Performance** - No afectar gameplay

### Soluciones planeadas

1. Daily meta updates
2. Weighted recency in scoring
3. Rogue deck detection
4. Sideboard analysis
5. Background processing

## Métricas de Éxito

Queremos medir:

- **Accuracy**: % de predicciones correctas
- **Timing**: Cuándo se confirma predicción
- **Performance**: CPU/Memory usage
- **User adoption**: # de usuarios activos
- **Feedback**: Rating en Overwolf Appstore

## Comunicación

### Canales

- **GitHub Issues**: Bugs y features
- **GitHub Discussions**: Ideas generales
- **Discord** (si se crea): Comunidad
- **Twitter**: Actualizaciones públicas

### Actualizaciones

- Roadmap revisado cada trimestre
- Cambios publicados en releases
- Feedback de comunidad considerado

## Próximos Pasos Inmediatos

```
SEMANA 1:
- [ ] Completar FASE 1-5 de implementación
- [ ] Release v1.0 MVP
- [ ] Documentación de usuario

SEMANA 2-4:
- [ ] Testing con usuarios
- [ ] Bug fixes
- [ ] Optimizaciones

SEMANA 5+:
- [ ] Planeación para v1.1
- [ ] Community feedback
- [ ] Roadmap 2026 final
```

---

Este roadmap es flexible y sujeto a cambios basados en feedback de usuarios y viabilidad técnica.

Última actualización: 2026-02-16
