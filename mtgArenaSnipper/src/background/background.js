// src/background/background.js
// 🎬 Background Controller - Orquestador de agentes

import eventBus from '../shared/events/EventBus.js';
import GameService from '../shared/services/GameService.js';
import DeckPredictionEngine from '../shared/data/DeckPredictionEngine.js';
import DatabaseManager from '../shared/data/DatabaseManager.js';
import LogMonitorAgent from './agents/LogMonitorAgent.js';
import LogParserAgent from './agents/LogParserAgent.js';
import CommunicationAgent from './agents/CommunicationAgent.js';

class BackgroundController {
    constructor() {
        this.agents = {
            logMonitor: null,
            logParser: null,
            communication: null
        };

        this.services = {
            game: null,
            prediction: null,
            database: null
        };

        this.isRunning = false;
        this.debugMode = true;
    }

    /**
     * 🚀 Inicializar todo el sistema
     */
    async initialize() {
        try {
            this.log('🎬 BackgroundController: Inicializando...');

            // 1. Inicializar DatabaseManager
            this.log('📊 Inicializando DatabaseManager...');
            this.services.database = new DatabaseManager();
            await this.services.database.initialize();

            // 2. Inicializar DeckPredictionEngine
            this.log('🎯 Inicializando DeckPredictionEngine...');
            this.services.prediction = new DeckPredictionEngine(this.services.database);

            // 3. Inicializar GameService
            this.log('🎮 Inicializando GameService...');
            this.services.game = new GameService(
                this.services.prediction,
                this.services.database,
                eventBus
            );
            await this.services.game.initialize();

            // 4. Inicializar agentes
            this.log('🤖 Inicializando agentes...');
            await this.initializeAgents();

            // 5. Configurar listeners
            this.setupEventListeners();

            this.isRunning = true;
            this.log('✅ BackgroundController inicializado completamente');

            // Emitir evento de sistema listo
            eventBus.emit('system:ready', {
                timestamp: Date.now(),
                componentsReady: Object.keys(this.services).length + Object.keys(this.agents).length
            });

            return true;

        } catch (error) {
            this.logError('Error inicializando BackgroundController:', error);
            return false;
        }
    }

    /**
     * 🤖 Inicializar todos los agentes
     */
    async initializeAgents() {
        try {
            // Inicializar LogMonitorAgent
            this.log('⏱️ Inicializando LogMonitorAgent...');
            this.agents.logMonitor = new LogMonitorAgent();
            const monitorReady = await this.agents.logMonitor.initialize();

            // Inicializar LogParserAgent
            this.log('📝 Inicializando LogParserAgent...');
            this.agents.logParser = new LogParserAgent();
            const parserReady = await this.agents.logParser.initialize();

            // Inicializar CommunicationAgent
            this.log('📡 Inicializando CommunicationAgent...');
            this.agents.communication = new CommunicationAgent();
            const commReady = await this.agents.communication.initialize();

            if (monitorReady && parserReady && commReady) {
                this.log('✅ Todos los agentes inicializados');
                return true;
            } else {
                this.logError('⚠️ Algunos agentes no se inicializaron correctamente');
                return false;
            }

        } catch (error) {
            this.logError('Error inicializando agentes:', error);
            return false;
        }
    }

    /**
     * 🔌 Configurar listeners de eventos
     */
    setupEventListeners() {
        // Eventos del LogParser
        eventBus.on('log:event:card-played', (event) => {
            this.handleCardPlayed(event);
        });

        eventBus.on('log:event:game-started', (event) => {
            this.handleGameStarted(event);
        });

        eventBus.on('log:event:game-ended', (event) => {
            this.handleGameEnded(event);
        });

        eventBus.on('log:event:turn-started', (event) => {
            this.handleTurnStarted(event);
        });

        // Error handling
        eventBus.on('system:error', (error) => {
            this.handleSystemError(error);
        });

        this.log('🔌 Event listeners configurados');
    }

    /**
     * 🃏 Manejar carta jugada
     */
    async handleCardPlayed(event) {
        try {
            const { cardName } = event.data;

            this.log(`🃏 Procesando carta jugada: ${cardName}`);

            // Agregar carta al servicio de juego
            const result = await this.services.game.addOpponentCard({
                name: cardName,
                timestamp: event.timestamp
            });

            if (result && result.confirmed) {
                // Mazo confirmado - enviar al overlay
                this.log(`🎯 Mazo confirmado: ${result.deck.name}`);
                await this.agents.communication.sendConfirmedDeck(result.deck);
            } else if (result && result.predictions) {
                // Predicciones actualizadas - enviar al overlay
                this.log(`📊 ${result.predictions.length} predicciones actualizadas`);
                await this.agents.communication.sendPredictions(result.predictions);
            }

        } catch (error) {
            this.logError('Error procesando carta jugada:', error);
        }
    }

    /**
     * 🎮 Manejar inicio de juego
     */
    async handleGameStarted(event) {
        try {
            this.log('🎮 Juego iniciado');

            // Resetear estado del juego
            this.services.game.gameState.isActive = true;

            eventBus.emit('game:started', {
                timestamp: event.timestamp
            });

            await this.agents.communication.sendGameState(this.services.game.getGameState());

        } catch (error) {
            this.logError('Error en inicio de juego:', error);
        }
    }

    /**
     * 🏁 Manejar fin de juego
     */
    async handleGameEnded(event) {
        try {
            this.log('🏁 Juego finalizado');

            // Guardar estadísticas
            const stats = this.services.game.getStats();

            eventBus.emit('game:ended', {
                timestamp: event.timestamp,
                stats
            });

            // Reiniciar para nueva partida
            await this.services.game.resetGame();

        } catch (error) {
            this.logError('Error en fin de juego:', error);
        }
    }

    /**
     * ⏰ Manejar inicio de turno
     */
    async handleTurnStarted(event) {
        try {
            const { turn } = event.data;

            this.log(`⏰ Turno ${turn} iniciado`);

            this.services.game.setTurn(turn);

            await this.agents.communication.sendGameState(this.services.game.getGameState());

        } catch (error) {
            this.logError('Error en inicio de turno:', error);
        }
    }

    /**
     * ⚠️ Manejar errores del sistema
     */
    handleSystemError(errorData) {
        this.logError('Error del sistema reportado:', errorData);

        // Enviar error al overlay para notificar al usuario
        this.agents.communication.propagateToOverlay('system:error', errorData);
    }

    /**
     * ▶️ Iniciar monitoreo
     */
    start() {
        if (!this.isRunning) {
            this.logError('BackgroundController no está inicializado');
            return false;
        }

        this.log('▶️ Iniciando monitoreo...');
        this.agents.logMonitor.startMonitoring();

        return true;
    }

    /**
     * ⏹️ Detener monitoreo
     */
    stop() {
        this.log('⏹️ Deteniendo monitoreo...');
        this.agents.logMonitor.stopMonitoring();
    }

    /**
     * 📊 Obtener estadísticas del sistema
     */
    getSystemStats() {
        return {
            isRunning: this.isRunning,
            agents: {
                logMonitor: this.agents.logMonitor?.getStats(),
                logParser: this.agents.logParser?.getStats(),
                communication: this.agents.communication?.getStats()
            },
            services: {
                database: this.services.database?.getStats(),
                game: this.services.game?.getStats(),
                prediction: this.services.prediction?.getStats()
            }
        };
    }

    /**
     * 📝 Logging
     */
    log(message) {
        if (!this.debugMode) return;
        console.log(`🎬 [BackgroundController] ${message}`);
    }

    /**
     * ❌ Error logging
     */
    logError(message, error = null) {
        console.error(`❌ [BackgroundController] ${message}`, error || '');
    }
}

// Crear instancia global
const backgroundController = new BackgroundController();

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await backgroundController.initialize();
        backgroundController.start();
    });
} else {
    backgroundController.initialize().then(() => {
        backgroundController.start();
    });
}

// Hacer disponible globalmente para debugging
window.backgroundController = backgroundController;

export default backgroundController;
