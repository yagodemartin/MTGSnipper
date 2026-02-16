// src/overlay/overlay.js
// 🎨 Overlay Controller - Renderizador de predicciones

import OverwolfBridge from '../shared/utils/OverwolfBridge.js';

class OverlayController {
    constructor() {
        this.bridge = new OverwolfBridge();
        this.container = null;
        this.currentPredictions = [];
        this.confirmedDeck = null;
        this.isConnected = false;
        this.debugMode = true;
    }

    /**
     * 🚀 Inicializar overlay
     */
    async initialize() {
        try {
            this.log('🎨 OverlayController: Inicializando...');

            // Esperar DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.initializeDom();
                });
            } else {
                this.initializeDom();
            }

            // Inicializar bridge
            await this.bridge.initialize();
            this.isConnected = true;

            // Registrar handlers de mensajes
            this.setupMessageHandlers();

            this.log('✅ OverlayController inicializado');
            return true;

        } catch (error) {
            this.logError('Error inicializando OverlayController:', error);
            return false;
        }
    }

    /**
     * 🎨 Inicializar DOM
     */
    initializeDom() {
        this.container = document.getElementById('overlay-container');

        if (!this.container) {
            this.log('⚠️ Contenedor no encontrado, creando...');
            this.container = document.createElement('div');
            this.container.id = 'overlay-container';
            this.container.className = 'mtg-overlay';
            document.body.appendChild(this.container);
        }

        this.renderInitialState();
        this.log('✅ DOM inicializado');
    }

    /**
     * 🎨 Renderizar estado inicial
     */
    renderInitialState() {
        this.container.innerHTML = `
            <div class="overlay-content">
                <div class="overlay-header">
                    <h2>MTG Arena Sniffer</h2>
                    <span class="status-indicator loading">Conectando...</span>
                </div>
                <div class="overlay-body">
                    <p>Esperando inicio de partida...</p>
                </div>
            </div>
        `;
    }

    /**
     * 🔌 Configurar handlers de mensajes desde background
     */
    setupMessageHandlers() {
        // Predicciones actualizadas
        this.bridge.registerMessageHandler('predictions:update', (message) => {
            this.handlePredictionsUpdate(message);
        });

        // Mazo confirmado
        this.bridge.registerMessageHandler('deck:confirmed', (message) => {
            this.handleDeckConfirmed(message);
        });

        // Estado del juego
        this.bridge.registerMessageHandler('game:state', (message) => {
            this.handleGameStateUpdate(message);
        });

        // Carta jugada
        this.bridge.registerMessageHandler('card:played', (message) => {
            this.handleCardPlayed(message);
        });

        // Error del sistema
        this.bridge.registerMessageHandler('system:error', (message) => {
            this.handleSystemError(message);
        });

        this.log('🔌 Message handlers registrados');
    }

    /**
     * 📊 Manejar actualización de predicciones
     */
    handlePredictionsUpdate(message) {
        const { predictions } = message.data;

        this.log(`📊 Actualizando ${predictions.length} predicciones`);
        this.currentPredictions = predictions;

        this.renderPredictions(predictions);
    }

    /**
     * 🎯 Manejar mazo confirmado
     */
    handleDeckConfirmed(message) {
        const { deck } = message.data;

        this.log(`🎯 Mazo confirmado: ${deck.name}`);
        this.confirmedDeck = deck;

        this.renderConfirmedDeck(deck);
    }

    /**
     * 🎮 Manejar actualización de estado del juego
     */
    handleGameStateUpdate(message) {
        const { gameState } = message.data;

        this.log(`🎮 Estado del juego actualizado`);
        this.renderGameState(gameState);
    }

    /**
     * 🃏 Manejar carta jugada
     */
    handleCardPlayed(message) {
        const { cardName } = message.data;

        this.log(`🃏 Carta jugada: ${cardName}`);
        this.addCardToPlayedCards(cardName);
    }

    /**
     * ⚠️ Manejar error del sistema
     */
    handleSystemError(message) {
        const { error } = message.data;

        this.logError(`Sistema: ${error}`);
        this.showErrorNotification(error);
    }

    /**
     * 📊 Renderizar predicciones
     */
    renderPredictions(predictions) {
        if (!this.container) return;

        let html = `
            <div class="overlay-content">
                <div class="overlay-header">
                    <h2>MTG Arena Sniffer</h2>
                    <span class="status-indicator active">Analizando...</span>
                </div>
                <div class="overlay-body">
                    <div class="predictions-list">
        `;

        predictions.forEach((pred, index) => {
            const percentage = (pred.probability * 100).toFixed(1);
            const confidence = pred.confidence || 'low';

            html += `
                <div class="prediction-item confidence-${confidence}">
                    <div class="prediction-rank">#${index + 1}</div>
                    <div class="prediction-info">
                        <h3>${pred.deck.name}</h3>
                        <div class="prediction-bar">
                            <div class="prediction-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="prediction-percentage">${percentage}%</span>
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.log(`✅ Renderizadas ${predictions.length} predicciones`);
    }

    /**
     * 🎯 Renderizar mazo confirmado
     */
    renderConfirmedDeck(deck) {
        if (!this.container) return;

        const html = `
            <div class="overlay-content confirmed">
                <div class="overlay-header">
                    <h2>Mazo Confirmado</h2>
                    <span class="status-indicator confirmed">✓ Confirmado</span>
                </div>
                <div class="overlay-body">
                    <div class="confirmed-deck">
                        <h3>${deck.name}</h3>
                        <div class="deck-colors">
                            ${(deck.colors || []).map(c => `<span class="color-${c}">${c}</span>`).join('')}
                        </div>
                        <div class="deck-stats">
                            <div class="stat">
                                <label>Meta Share</label>
                                <value>${(deck.metaShare || 0).toFixed(1)}%</value>
                            </div>
                            <div class="stat">
                                <label>Cartas</label>
                                <value>${deck.mainboard?.length || 0}</value>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.log(`✅ Renderizado mazo confirmado`);
    }

    /**
     * 🎮 Renderizar estado del juego
     */
    renderGameState(gameState) {
        // Actualizar información de turno y cartas analizadas
        const statsDiv = this.container?.querySelector('.game-stats');

        if (statsDiv) {
            statsDiv.innerHTML = `
                <div class="stat">
                    <label>Turno</label>
                    <value>${gameState.currentTurn || 0}</value>
                </div>
                <div class="stat">
                    <label>Cartas</label>
                    <value>${gameState.totalCardsAnalyzed || 0}</value>
                </div>
            `;
        }
    }

    /**
     * 🃏 Agregar carta a lista de jugadas
     */
    addCardToPlayedCards(cardName) {
        // Actualizar lista visual de cartas jugadas si existe
        const cardsList = this.container?.querySelector('.played-cards-list');

        if (cardsList) {
            const cardItem = document.createElement('div');
            cardItem.className = 'card-item';
            cardItem.textContent = cardName;
            cardsList.appendChild(cardItem);

            // Mantener solo últimas 5 cartas
            const items = cardsList.querySelectorAll('.card-item');
            if (items.length > 5) {
                items[0].remove();
            }
        }
    }

    /**
     * ⚠️ Mostrar notificación de error
     */
    showErrorNotification(errorMessage) {
        const notification = document.createElement('div');
        notification.className = 'overlay-notification error';
        notification.textContent = `Error: ${errorMessage}`;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    /**
     * 🔄 Verificar conexión
     */
    async checkConnection() {
        if (!this.isConnected) {
            this.log('⚠️ Reconectando...');
            await this.bridge.initialize();
            this.isConnected = true;
        }

        return this.isConnected;
    }

    /**
     * 📝 Logging
     */
    log(message) {
        if (!this.debugMode) return;
        console.log(`🎨 [OverlayController] ${message}`);
    }

    /**
     * ❌ Error logging
     */
    logError(message, error = null) {
        console.error(`❌ [OverlayController] ${message}`, error || '');
    }
}

// Crear instancia global
const overlayController = new OverlayController();

// Inicializar
overlayController.initialize();

// Hacer disponible globalmente para debugging
window.overlayController = overlayController;

export default overlayController;
