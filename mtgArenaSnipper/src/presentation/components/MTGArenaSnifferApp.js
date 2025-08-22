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

        // Inicializar componentes UI
        this.components = {
            header: new HeaderComponent(this.eventBus, this.uiService),
            cardInput: new CardInputComponent(this.eventBus, this.gameService),
            predictions: new PredictionsComponent(this.eventBus, this.uiService),
            confirmedDeck: new ConfirmedDeckComponent(this.eventBus, this.uiService),
            status: new StatusComponent(this.eventBus, this.databaseManager),
            debug: new DebugComponent(this.eventBus, {
                database: this.databaseManager,
                prediction: this.predictionEngine,
                game: this.gameService ,
        metaBrowser: new MetaBrowserComponent(this.eventBus, {
            databaseManager: this.databaseManager,
            uiService: this.uiService
        }),
        deckDetail: new DeckDetailComponent(this.eventBus, {
            databaseManager: this.databaseManager,
            uiService: this.uiService
        })
            })
            
        };

        // Inicializar cada componente
        for (const [name, component] of Object.entries(this.components)) {
            await component.initialize();
            this.log(`✅ Componente ${name} inicializado`);
        }

        this.log('✅ Componentes UI inicializados');
    }

    /**
     * 📡 Configurar event listeners globales
     */
 setupEventListeners() {
    this.log('📡 Configurando event listeners...');

    // Eventos de predicción
    this.eventBus.on(GAME_EVENTS.DECK_PREDICTION_UPDATED, (data) => {
        this.handlePredictionUpdated(data);
    });

    this.eventBus.on(GAME_EVENTS.DECK_CONFIRMED, (data) => {
        this.handleDeckConfirmed(data);
    });

    // ✅ CORREGIR: Un solo listener para view-change-requested
    this.eventBus.on('ui:view-change-requested', (data) => {
        if (data.view === 'deck-detail' && data.deckId) {
            this.showDeckDetail(data.deckId);
        } else {
            this.changeView(data.view);
        }
    });

    // ✅ AÑADIR: Eventos específicos de navegador de mazos
    this.eventBus.on('ui:show-deck-detail', (data) => {
        this.showDeckDetail(data.deckId);
    });

    this.eventBus.on('ui:test-deck', (data) => {
        this.handleTestDeck(data);
    });

    this.eventBus.on('ui:card-added', (data) => {
        this.handleCardAdded(data);
    });

    // Eventos de sistema
    this.eventBus.on(GAME_EVENTS.SYSTEM_ERROR, (data) => {
        this.handleSystemError(data);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        this.handleKeyboardShortcuts(e);
    });

    // Window events
    window.addEventListener('beforeunload', () => {
        this.cleanup();
    });

    this.log('✅ Event listeners configurados');
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

                        <!-- ✅ AÑADIR: Meta Browser View -->
                        <section id="meta-browser-container" 
                                 class="view-section ${this.state.currentView === 'meta-browser' ? 'active' : 'hidden'}">
                        </section>

                        <!-- ✅ AÑADIR: Deck Detail View -->
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
            <div id="loading-overlay" class="loading-overlay"></div>
        </div>
    `;
}
    /**
     * 🎨 Renderizar todos los componentes
     */
    async renderComponents() {
        const renderPromises = Object.entries(this.components).map(async ([name, component]) => {
            try {
                // Mapear nombres de componentes a IDs de contenedores
                const containerMap = {
                    header: 'header-container',
                    cardInput: 'card-input-container', 
                    predictions: 'predictions-container',
                    confirmedDeck: 'confirmed-deck-container',
                      metaBrowser: 'meta-browser-container',    // ✅ AÑADIR
                deckDetail: 'deck-detail-container',      
                    status: 'status-container',
                    debug: 'debug-container'
                };
                
                const containerId = containerMap[name];
                const container = document.getElementById(containerId);
                
                if (container && component.render) {
                    await component.render(container);
                }
            } catch (error) {
                this.logError(`Error renderizando componente ${name}:`, error);
            }
        });

        await Promise.all(renderPromises);
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
    if (this.state.currentView === newView) return;

    this.log(`👀 Cambiando vista: ${this.state.currentView} → ${newView}`);

    // Ocultar vista actual
    const currentContainer = document.querySelector('.view-section.active');
    if (currentContainer) {
        currentContainer.classList.remove('active');
        currentContainer.classList.add('hidden');
    }

    // ✅ CORREGIR: Mapeo correcto de vistas a contenedores
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
        this.log(`✅ Vista cambiada a: ${newView} (${containerId})`);
    } else {
        this.logError(`❌ Contenedor no encontrado: ${containerId}`);
    }

    // Actualizar estado
    this.setState({ currentView: newView });

    // Emitir evento
    this.eventBus.emit('ui:view-changed', { 
        from: this.state.currentView,
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