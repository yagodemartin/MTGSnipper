// src/presentation/components/MTGArenaSnifferApp.js
// 🏗️ Aplicación principal con Clean Architecture - IMPORTS CORREGIDOS

import DatabaseManager from '../../infrastructure/data/DatabaseManager.js';
import DeckPredictionEngine from '../../infrastructure/data/DeckPredictionEngine.js';
import EventBus, { GAME_EVENTS } from '../../application/events/EventBus.js';

// Componentes UI - RUTAS CORREGIDAS
import HeaderComponent from './HeaderComponent.js';
import CardInputComponent from './CardInputComponent.js';
import PredictionsComponent from './PredictionsComponent.js';
import ConfirmedDeckComponent from './ConfirmedDeckComponent.js';
import StatusComponent from './StatusComponent.js';
import DebugComponent from './DebugComponent.js';
import MetaBrowserComponent from './MetaBrowserComponent.js';
import DeckDetailComponent from './DeckDetailComponent.js';

// Servicios de aplicación - RUTAS CORREGIDAS
import { GameService, UIService, CardService } from '../../application/services/GameService.js';

/**
 * 🎮 Aplicación principal - Orchestrator de componentes
 */
class MTGArenaSnifferApp {
    constructor() {
        // Core dependencies (Domain Layer)
        this.databaseManager = null;
        this.predictionEngine = null;
        
        // Application Services
        this.gameService = null;
        this.uiService = null;
        
        // UI Components
        this.components = {};
        
        // State
        this.state = {
            isInitialized: false,
            isLoading: false,
            currentView: 'prediction', // prediction | confirmed | debug
            error: null
        };

        // Configuration
        this.config = {
            autoUpdate: true,
            debugMode: true,
            theme: 'dark'
        };

        this.eventBus = EventBus;
    }

    /**
     * 🚀 Inicializar aplicación completa
     */
    async initialize() {
        try {
            this.log('🚀 Inicializando MTGArenaSniffer...');
            this.setState({ isLoading: true });

            // 1. Inicializar infraestructura (Data Layer)
            await this.initializeInfrastructure();
            
            // 2. Inicializar casos de uso (Domain Layer)
            await this.initializeDomain();
            
            // 3. Inicializar servicios (Application Layer)
            await this.initializeApplication();
            
            // 4. Inicializar componentes UI (Presentation Layer)
            await this.initializePresentation();
            
            // 5. Configurar event listeners
            this.setupEventListeners();
            
            // 6. Renderizar interfaz inicial
            await this.render();

            this.setState({ 
                isInitialized: true, 
                isLoading: false,
                error: null
            });

            this.log('✅ MTGArenaSniffer inicializado completamente');
            this.eventBus.emit(GAME_EVENTS.SYSTEM_READY, { component: 'MTGArenaSnifferApp' });

            return { success: true };

        } catch (error) {
            this.logError('❌ Error inicializando aplicación:', error);
            this.setState({ 
                isLoading: false, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * 🗄️ Inicializar capa de infraestructura
     */
    async initializeInfrastructure() {
        this.log('🗄️ Inicializando infraestructura...');
        
        // Database Manager
        this.databaseManager = new DatabaseManager();
        await this.databaseManager.initialize();
        
        this.log('✅ Infraestructura inicializada');
    }

    /**
     * 🎯 Inicializar capa de dominio  
     */
    async initializeDomain() {
        this.log('🎯 Inicializando dominio...');
        
        // Prediction Engine
        this.predictionEngine = new DeckPredictionEngine(this.databaseManager);
        
        this.log('✅ Dominio inicializado');
    }

    /**
     * ⚙️ Inicializar capa de aplicación
     */
    async initializeApplication() {
        this.log('⚙️ Inicializando servicios de aplicación...');
        
        // Game Service - Gestiona estado del juego
        this.gameService = new GameService(
            this.predictionEngine,
            this.databaseManager,
            this.eventBus
        );
        await this.gameService.initialize();
        
        // UI Service - Gestiona estado de la interfaz
        this.uiService = new UIService(this.eventBus);
        await this.uiService.initialize();
        
        this.log('✅ Servicios de aplicación inicializados');
    }

    /**
     * 🎨 Inicializar capa de presentación
     */
   async initializePresentation() {
    this.log('🎨 Inicializando componentes UI...');
    
    // Obtener contenedor principal
    const container = document.getElementById('app');
    if (!container) {
        throw new Error('Container #app no encontrado');
    }

    // Inicializar componentes UI - CORRECCIÓN COMPLETA
    this.components = {
        header: new HeaderComponent(this.eventBus, this.uiService),
        cardInput: new CardInputComponent(this.eventBus, this.gameService),
        predictions: new PredictionsComponent(this.eventBus, this.uiService),
        confirmedDeck: new ConfirmedDeckComponent(this.eventBus, this.uiService),
        metaBrowser: new MetaBrowserComponent(this.eventBus, {
            databaseManager: this.databaseManager,
            uiService: this.uiService
        }),
        deckDetail: new DeckDetailComponent(this.eventBus, {
            databaseManager: this.databaseManager,
            uiService: this.uiService
        }),
        status: new StatusComponent(this.eventBus, this.databaseManager),
        debug: new DebugComponent(this.eventBus, {
            database: this.databaseManager,
            prediction: this.predictionEngine,
            game: this.gameService
        })
    };

    // Inicializar todos los componentes
    const initPromises = Object.entries(this.components).map(async ([name, component]) => {
        try {
            if (component.initialize) {
                await component.initialize();
                this.log(`✅ Componente ${name} inicializado`);
            }
        } catch (error) {
            this.logError(`❌ Error inicializando componente ${name}:`, error);
        }
    });

    await Promise.all(initPromises);
    this.log('✅ Componentes UI inicializados');
}

    /**
     * 📡 Configurar event listeners globales
     */
setupEventListeners() {
    // Eventos de predicción
    this.eventBus.on('deck:prediction:updated', (data) => {
        this.handlePredictionUpdated(data);
    });

    this.eventBus.on('deck:confirmed', (data) => {
        this.handleDeckConfirmed(data);
    });

    // Eventos de UI
    this.eventBus.on('ui:view-change-requested', (data) => {
        this.handleViewChangeRequested(data);
    });

    this.eventBus.on('card:added', (data) => {
        this.handleCardAdded(data);
    });

    // AGREGAR: Eventos de base de datos desde Debug
    this.eventBus.on('database:force-update', async () => {
        this.log('🔄 Evento database:force-update recibido');
        await this.forceUpdateDatabase();
    });

    this.eventBus.on('database:clear-cache', async () => {
        this.log('🗑️ Evento database:clear-cache recibido');
        await this.clearDatabaseCache();
    });

    this.eventBus.on('database:reset', async () => {
        this.log('🔄 Evento database:reset recibido');
        await this.resetDatabase();
    });

    // Eventos de sistema
    this.eventBus.on('system:error', (data) => {
        this.handleSystemError(data);
    });

    // Teclado shortcuts
    document.addEventListener('keydown', (e) => {
        this.handleKeyboardShortcuts(e);
    });

    this.log('✅ Event listeners configurados');
}

// NUEVOS MÉTODOS:

async forceUpdateDatabase() {
    try {
        this.log('🔄 Forzando actualización de base de datos...');
        this.setState({ isLoading: true });
        
        // Forzar actualización completa
        await this.databaseManager.forceUpdate();
        
        this.setState({ isLoading: false });
        
        // Notificar éxito
        this.eventBus.emit('database:update:completed', {
            deckCount: this.databaseManager.currentMetaData?.deckCount || 0,
            message: 'Actualización forzada completada'
        });
        
        this.log('✅ Actualización forzada completada');

    } catch (error) {
        this.setState({ isLoading: false });
        this.logError('❌ Error en actualización forzada:', error);
        
        this.eventBus.emit('database:update:failed', {
            error: error.message
        });
    }
}

async clearDatabaseCache() {
    try {
        this.log('🗑️ Limpiando cache de base de datos...');
        
        // Limpiar cache en DatabaseManager
        this.databaseManager.clearCache();
        
        this.log('✅ Cache limpiado');
        
        // Notificar
        if (this.uiService?.showNotification) {
            this.uiService.showNotification({
                type: 'info',
                title: '🗑️ Cache limpiado',
                message: 'Los datos se recargarán en la próxima actualización',
                duration: 3000
            });
        }

    } catch (error) {
        this.logError('❌ Error limpiando cache:', error);
    }
}

async resetDatabase() {
    try {
        this.log('🔄 Reseteando base de datos completamente...');
        this.setState({ isLoading: true });
        
        // Limpiar cache
        this.databaseManager.clearCache();
        
        // Forzar nueva actualización
        await this.databaseManager.forceUpdate();
        
        this.setState({ isLoading: false });
        
        this.log('✅ Base de datos reseteada');
        
        // Notificar
        this.eventBus.emit('database:update:completed', {
            deckCount: this.databaseManager.currentMetaData?.deckCount || 0,
            message: 'Base de datos reseteada y actualizada'
        });

    } catch (error) {
        this.setState({ isLoading: false });
        this.logError('❌ Error reseteando base de datos:', error);
    }
}
    /**
     * 🎨 Renderizar interfaz principal
     */
    async render() {
        try {
            this.log('🎨 Renderizando interfaz...');

            const container = document.getElementById('app');
            container.innerHTML = this.getMainTemplate();

            // Renderizar cada componente en su contenedor
            await this.renderComponents();

            // Aplicar tema
            this.applyTheme();

            this.log('✅ Interfaz renderizada');

        } catch (error) {
            this.logError('Error renderizando interfaz:', error);
        }
    }

    /**
     * 🏗️ Template principal de la aplicación
     */
getMainTemplate() {
    return `
        <div class="mtg-sniffer-app ${this.config.theme}">
            <!-- Header -->
            <header id="header-container" class="app-header"></header>

            <!-- Main Content -->
            <main class="app-main">
                <!-- Status Bar -->
                <div id="status-container" class="status-bar"></div>

                <!-- Content Area -->
                <div class="content-area">
                    <!-- Card Input -->
                    <section id="card-input-container" class="card-input-section"></section>

                    <!-- Views Container -->
                    <div class="views-container">
                        <!-- Predictions View -->
                        <section id="predictions-container" 
                                 class="view-section ${this.state.currentView === 'prediction' ? 'active' : 'hidden'}">
                        </section>

                        <!-- Confirmed Deck View -->
                        <section id="confirmed-deck-container" 
                                 class="view-section ${this.state.currentView === 'confirmed' ? 'active' : 'hidden'}">
                        </section>

                        <!-- Meta Browser View -->
                        <section id="meta-browser-container" 
                                 class="view-section ${this.state.currentView === 'meta-browser' ? 'active' : 'hidden'}">
                        </section>

                        <!-- Deck Detail View -->
                        <section id="deck-detail-container" 
                                 class="view-section ${this.state.currentView === 'deck-detail' ? 'active' : 'hidden'}">
                        </section>

                        <!-- Debug View -->
                        <section id="debug-container" 
                                 class="view-section ${this.state.currentView === 'debug' ? 'active' : 'hidden'}">
                        </section>
                    </div>
                </div>
            </main>

            <!-- Loading Overlay -->
            <div id="loading-overlay" class="loading-overlay ${this.state.isLoading ? 'visible' : 'hidden'}"></div>
        </div>
    `;
}
    /**
     * 🎨 Renderizar todos los componentes
     */
  async renderComponents() {
    this.log('🎨 Renderizando componentes en contenedores...');
    
    const renderPromises = Object.entries(this.components).map(async ([name, component]) => {
        try {
            // Mapear nombres de componentes a IDs de contenedores
            const containerMap = {
                header: 'header-container',
                cardInput: 'card-input-container', 
                predictions: 'predictions-container',
                confirmedDeck: 'confirmed-deck-container',
                metaBrowser: 'meta-browser-container',    
                deckDetail: 'deck-detail-container',      
                status: 'status-container',
                debug: 'debug-container'
            };
            
            const containerId = containerMap[name];
            const container = document.getElementById(containerId);
            
            if (container && component.render) {
                await component.render(container);
                this.log(`✅ Componente ${name} renderizado en ${containerId}`);
                
                // Debug: verificar que el contenido se renderizó
                if (container.innerHTML.trim() === '') {
                    this.logError(`⚠️ Contenedor ${containerId} está vacío después del render`);
                }
            } else if (!container) {
                this.logError(`❌ Contenedor ${containerId} no encontrado para componente ${name}`);
            } else if (!component.render) {
                this.logError(`❌ Componente ${name} no tiene método render`);
            }
        } catch (error) {
            this.logError(`❌ Error renderizando componente ${name}:`, error);
        }
    });

    await Promise.all(renderPromises);
    this.log('✅ Todos los componentes renderizados');
}

    /**
     * 📊 Manejar actualización de predicciones
     */
    handlePredictionUpdated(data) {
        this.log('📊 Predicciones actualizadas', data);
        
        if (this.state.currentView === 'confirmed') {
            // Si ya hay mazo confirmado, no cambiar vista
            return;
        }

        // Asegurar que estamos en vista de predicciones
        if (this.state.currentView !== 'prediction') {
            this.changeView('prediction');
        }
    }

    /**
     * 🎯 Manejar confirmación de mazo
     */
 handleDeckConfirmed(data) {
    this.log('🎯 Mazo confirmado', data);
    
    // ✅ AÑADIR debug
    this.log(`🎯 Cambiando automáticamente a vista 'confirmed'`);
    this.log(`🎯 Datos del mazo:`, data.deck?.name);
    
    // Cambiar automáticamente a vista de mazo confirmado
    this.changeView('confirmed');
    
    // Notificación visual
    if (this.uiService && this.uiService.showNotification) {
        this.uiService.showNotification({
            type: 'success',
            title: 'Mazo Confirmado',
            message: `${data.deck.name} detectado con ${(data.probability * 100).toFixed(1)}% de probabilidad`,
            duration: 5000
        });
    }
}

    /**
     * 🎯 Manejar solicitud de cambio de vista
     */
    handleViewChangeRequested(data) {
        this.changeView(data.view);
    }

    /**
     * 🃏 Manejar adición de carta
     */
    async handleCardAdded(data) {
        try {
            this.log('🃏 Carta añadida por usuario', data);
            
            // La carta ya fue procesada por el GameService a través del CardInputComponent
            // Solo necesitamos emitir evento para logging/tracking
            
        } catch (error) {
            this.logError('Error procesando carta añadida:', error);
            this.uiService.showNotification({
                type: 'error',
                title: 'Error',
                message: 'No se pudo procesar la carta',
                duration: 3000
            });
        }
    }

    /**
     * 👀 Cambiar vista activa
     */
changeView(newView) {
    if (this.state.currentView === newView) {
        this.log(`⚠️ Ya estamos en la vista: ${newView}`);
        return;
    }

    this.log(`👀 Cambiando vista: ${this.state.currentView} → ${newView}`);

    // Ocultar vista actual
    const currentContainer = document.querySelector('.view-section.active');
    if (currentContainer) {
        currentContainer.classList.remove('active');
        currentContainer.classList.add('hidden');
        this.log(`👻 Ocultando vista actual: ${currentContainer.id}`);
    }

    // Mapeo de vistas a contenedores
    const containerMap = {
        'prediction': 'predictions-container',
        'confirmed': 'confirmed-deck-container',
        'meta-browser': 'meta-browser-container', 
        'deck-detail': 'deck-detail-container',      
        'debug': 'debug-container'
    };

    const containerId = containerMap[newView];
    const newContainer = document.getElementById(containerId);
    
    if (newContainer) {
        newContainer.classList.remove('hidden');
        newContainer.classList.add('active');
        
        // Debug: verificar contenido del contenedor
        const hasContent = newContainer.innerHTML.trim() !== '';
        this.log(`✅ Vista cambiada a: ${newView} (${containerId}) - Contenido: ${hasContent ? 'SÍ' : 'NO'}`);
        
        if (!hasContent) {
            this.logError(`⚠️ El contenedor ${containerId} está vacío!`);
            
            // Intentar re-renderizar el componente
            const componentName = Object.keys(containerMap).find(key => containerMap[key] === containerId);
            if (componentName && this.components[componentName]) {
                this.log(`🔄 Intentando re-renderizar componente: ${componentName}`);
                this.components[componentName].render(newContainer);
            }
        }
    } else {
        this.logError(`❌ Contenedor no encontrado: ${containerId}`);
        return;
    }

    // Actualizar estado
    const prevView = this.state.currentView;
    this.setState({ currentView: newView });

    // Emitir evento
    this.eventBus.emit('ui:view-changed', { 
        from: prevView,
        to: newView 
    });
}

    /**
     * ⌨️ Manejar shortcuts de teclado
     */
    handleKeyboardShortcuts(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case '1':
                    event.preventDefault();
                    this.changeView('prediction');
                    break;
                case '2':
                    event.preventDefault();
                    this.changeView('confirmed');
                    break;
                case '3':
                    event.preventDefault();
                    this.changeView('debug');
                    break;
                case 'r':
                    event.preventDefault();
                    this.resetGame();
                    break;
                case 'u':
                    event.preventDefault();
                    this.forceUpdate();
                    break;
            }
        }
    }

    /**
     * ❌ Manejar errores del sistema
     */
    handleSystemError(data) {
        this.logError('Error del sistema:', data);
        this.setState({ error: data.error || 'Error desconocido' });
    }

    /**
     * 🎨 Aplicar tema visual
     */
    applyTheme() {
        document.body.className = `theme-${this.config.theme}`;
        document.documentElement.setAttribute('data-theme', this.config.theme);
    }

    /**
     * 🔄 Reiniciar juego
     */
    async resetGame() {
        try {
            this.log('🔄 Reiniciando juego...');
            
            await this.gameService.resetGame();
            this.changeView('prediction');
            
            this.uiService.showNotification({
                type: 'info',
                title: 'Juego reiniciado',
                message: 'Listo para nueva partida',
                duration: 2000
            });

        } catch (error) {
            this.logError('Error reiniciando juego:', error);
        }
    }

    /**
     * 🔄 Forzar actualización de datos
     */
    async forceUpdate() {
        try {
            this.log('🔄 Forzando actualización...');
            this.setState({ isLoading: true });
            
            await this.databaseManager.forceUpdate();
            
            this.setState({ isLoading: false });
            this.uiService.showNotification({
                type: 'success',
                title: 'Actualización completa',
                message: 'Base de datos actualizada',
                duration: 3000
            });

        } catch (error) {
            this.setState({ isLoading: false });
            this.logError('Error en actualización forzada:', error);
        }
    }

    /**
     * ❌ Cerrar error modal
     */
    dismissError() {
        this.setState({ error: null });
    }

    /**
     * 🔧 Actualizar estado interno
     */
    setState(newState) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        if (this.config.debugMode) {
            this.log('🔧 Estado actualizado:', { prevState, newState: this.state });
        }

        // Re-render si es necesario
        this.updateUIState();
    }

    /**
     * 🎨 Actualizar estado visual
     */
    updateUIState() {
        // Actualizar loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.className = `loading-overlay ${this.state.isLoading ? 'visible' : 'hidden'}`;
        }

        // Actualizar error modal
        const errorModal = document.getElementById('error-modal');
        if (errorModal) {
            errorModal.className = `error-modal ${this.state.error ? 'visible' : 'hidden'}`;
            
            const errorText = errorModal.querySelector('p');
            if (errorText) {
                errorText.textContent = this.state.error || '';
            }
        }
    }

    /**
     * 📊 Obtener estadísticas de la aplicación
     */
    getAppStats() {
        return {
            // Estado de la aplicación
            isInitialized: this.state.isInitialized,
            currentView: this.state.currentView,
            hasError: !!this.state.error,
            
            // Estadísticas de componentes
            database: this.databaseManager?.getStats(),
            prediction: this.predictionEngine?.getStats(),
            game: this.gameService?.getStats(),
            
            // Configuración
            config: this.config
        };
    }

    /**
     * ⚙️ Configurar aplicación
     */
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.log('⚙️ Configuración actualizada', this.config);
        
        // Aplicar cambios inmediatos
        if (newConfig.theme) {
            this.applyTheme();
        }
        
        if (newConfig.debugMode !== undefined) {
            Object.values(this.components).forEach(component => {
                if (component.setDebugMode) {
                    component.setDebugMode(newConfig.debugMode);
                }
            });
        }
    }

    /**
 * 📋 Mostrar detalle de mazo específico
 */
async showDeckDetail(deckId) {
    this.log(`📋 Mostrando detalle del mazo: ${deckId}`);
    
    // Cambiar a vista de detalle
    this.changeView('deck-detail');
    
    // Cargar detalle del mazo
    this.eventBus.emit('ui:show-deck-detail', { deckId });
}

/**
 * 🧪 Manejar test de mazo
 */
handleTestDeck(data) {
    this.log('🧪 Probando mazo:', data.deck.name);
    
    // Simular cartas del mazo para testing
    if (data.testCards && data.testCards.length > 0) {
        data.testCards.forEach((card, index) => {
            setTimeout(() => {
                this.gameService.addOpponentCard({
                    name: card.name,
                    turn: index + 1,
                    timestamp: Date.now()
                });
            }, index * 1000); // 1 segundo entre cartas
        });
    }
    
    this.uiService.showNotification({
        type: 'info',
        title: 'Test iniciado',
        message: `Probando ${data.deck.name} con ${data.testCards.length} cartas`,
        duration: 3000
    });
}

    /**
     * 🧹 Cleanup al cerrar aplicación
     */
    cleanup() {
        this.log('🧹 Limpiando aplicación...');
        
        // Cleanup de componentes
        Object.values(this.components).forEach(component => {
            if (component.cleanup) {
                component.cleanup();
            }
        });
        
        // Cleanup de servicios
        if (this.gameService?.cleanup) {
            this.gameService.cleanup();
        }
        
        if (this.uiService?.cleanup) {
            this.uiService.cleanup();
        }
        
        this.log('✅ Cleanup completado');
    }

    /**
     * 🔧 Métodos de utilidad
     */
    log(message, data = null) {
        if (!this.config.debugMode) return;
        console.log(`🎮 [MTGArenaSnifferApp] ${message}`, data || '');
    }

    logError(message, error = null) {
        console.error(`❌ [MTGArenaSnifferApp] ${message}`, error || '');
    }
}

// Hacer disponible globalmente
window.MTGArenaSnifferApp = MTGArenaSnifferApp;

export default MTGArenaSnifferApp;