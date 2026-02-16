// src/background/agents/CommunicationAgent.js
// 📡 Agente de comunicación entre windows

import eventBus from '../../shared/events/EventBus.js';
import OverwolfBridge from '../../shared/utils/OverwolfBridge.js';

class CommunicationAgent {
    constructor() {
        this.bridge = new OverwolfBridge();
        this.debugMode = true;
        this.messageQueue = [];
        this.isConnected = false;
    }

    /**
     * 🚀 Inicializar el agente
     */
    async initialize() {
        try {
            this.log('📡 CommunicationAgent: Inicializando...');

            // Inicializar bridge
            await this.bridge.initialize();
            this.isConnected = true;

            // Suscribirse a eventos del EventBus
            this.setupEventListeners();

            this.log('✅ CommunicationAgent inicializado');
            return true;

        } catch (error) {
            this.logError('Error inicializando CommunicationAgent:', error);
            return false;
        }
    }

    /**
     * 🔌 Configurar listeners de eventos
     */
    setupEventListeners() {
        // Predicciones actualizadas
        eventBus.on('deck:prediction:updated', (predictions) => {
            this.propagateToOverlay('predictions:update', predictions);
        });

        // Mazo confirmado
        eventBus.on('deck:confirmed', (deckData) => {
            this.propagateToOverlay('deck:confirmed', deckData);
        });

        // Estado del juego actualizado
        eventBus.on('game:state:update', (gameState) => {
            this.propagateToOverlay('game:state', gameState);
        });

        // Cartas jugadas
        eventBus.on('card:played', (cardData) => {
            this.propagateToOverlay('card:played', cardData);
        });

        // Errores
        eventBus.on('system:error', (errorData) => {
            this.propagateToOverlay('system:error', errorData);
        });

        this.log('🔌 Event listeners configurados');
    }

    /**
     * 📤 Propagar evento al overlay
     */
    async propagateToOverlay(messageType, data) {
        if (!this.isConnected) {
            this.log(`⚠️ No conectado, encolando mensaje: ${messageType}`);
            this.messageQueue.push({ messageType, data, timestamp: Date.now() });
            return false;
        }

        try {
            const message = {
                type: messageType,
                data,
                timestamp: Date.now()
            };

            const success = await this.bridge.sendToOverlay(messageType, message);

            if (success) {
                this.log(`📤 Mensaje enviado al overlay: ${messageType}`);
            } else {
                this.logError(`Error enviando mensaje: ${messageType}`);
                this.messageQueue.push({ messageType, data, timestamp: Date.now() });
            }

            return success;

        } catch (error) {
            this.logError(`Error en propagación: ${messageType}`, error);
            return false;
        }
    }

    /**
     * 📤 Propagar evento al background
     */
    async propagateToBackground(messageType, data) {
        try {
            const message = {
                type: messageType,
                data,
                timestamp: Date.now()
            };

            const success = await this.bridge.sendToBackground(messageType, message);

            if (success) {
                this.log(`📤 Mensaje enviado al background: ${messageType}`);
            } else {
                this.logError(`Error enviando mensaje: ${messageType}`);
            }

            return success;

        } catch (error) {
            this.logError(`Error en propagación: ${messageType}`, error);
            return false;
        }
    }

    /**
     * 💬 Registrar handler de mensajes desde overlay
     */
    registerOverlayMessageHandler(messageType, callback) {
        this.bridge.registerMessageHandler(messageType, (data) => {
            this.log(`📨 Mensaje desde overlay: ${messageType}`);
            callback(data);
        });
    }

    /**
     * 📨 Procesar cola de mensajes pendientes
     */
    async processMessageQueue() {
        if (this.messageQueue.length === 0 || !this.isConnected) {
            return;
        }

        this.log(`📨 Procesando ${this.messageQueue.length} mensajes encolados...`);

        const queue = [...this.messageQueue];
        this.messageQueue = [];

        for (const { messageType, data } of queue) {
            await this.propagateToOverlay(messageType, data);
        }
    }

    /**
     * 🔌 Verificar conexión
     */
    async checkConnection() {
        const overlayReady = this.bridge.isOverlayReady();
        const backgroundReady = this.bridge.isBackgroundReady();

        this.isConnected = overlayReady && backgroundReady;

        if (!this.isConnected) {
            this.log('⚠️ Conexión perdida, intentando reconectar...');
            await this.bridge.initialize();
            this.isConnected = true;
        }

        return this.isConnected;
    }

    /**
     * 🎯 Enviar predicciones al overlay
     */
    async sendPredictions(predictions) {
        return this.propagateToOverlay('predictions:update', {
            predictions,
            timestamp: Date.now()
        });
    }

    /**
     * 🎯 Enviar mazo confirmado al overlay
     */
    async sendConfirmedDeck(deck) {
        return this.propagateToOverlay('deck:confirmed', {
            deck,
            timestamp: Date.now()
        });
    }

    /**
     * 🎮 Enviar estado del juego al overlay
     */
    async sendGameState(gameState) {
        return this.propagateToOverlay('game:state', {
            gameState,
            timestamp: Date.now()
        });
    }

    /**
     * 📊 Obtener estadísticas
     */
    getStats() {
        return {
            isConnected: this.isConnected,
            messageQueueLength: this.messageQueue.length,
            overlayReady: this.bridge.isOverlayReady(),
            backgroundReady: this.bridge.isBackgroundReady()
        };
    }

    /**
     * 📝 Logging
     */
    log(message) {
        if (!this.debugMode) return;
        console.log(`📡 [CommunicationAgent] ${message}`);
    }

    /**
     * ❌ Error logging
     */
    logError(message, error = null) {
        console.error(`❌ [CommunicationAgent] ${message}`, error || '');
    }
}

export default CommunicationAgent;
