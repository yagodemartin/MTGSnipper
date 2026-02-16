// src/background/agents/AnalyticsAgent.js
// 📊 Agente de análisis y estadísticas

import eventBus from '../../shared/events/EventBus.js';

class AnalyticsAgent {
    constructor() {
        this.debugMode = true;

        this.stats = {
            gamesPlayed: 0,
            correctPredictions: 0,
            cardsAnalyzed: 0,
            averageConfidence: 0,
            predictionAccuracy: 0,
            sessionStart: Date.now()
        };

        this.gameHistory = [];
        this.predictionHistory = [];
    }

    /**
     * 🚀 Inicializar agente
     */
    async initialize() {
        try {
            this.log('📊 AnalyticsAgent: Inicializando...');

            // Cargar estadísticas guardadas
            this.loadStats();

            // Suscribirse a eventos
            this.setupEventListeners();

            this.log('✅ AnalyticsAgent inicializado');
            return true;

        } catch (error) {
            this.logError('Error inicializando AnalyticsAgent:', error);
            return false;
        }
    }

    /**
     * 🔌 Configurar listeners de eventos
     */
    setupEventListeners() {
        // Juego iniciado
        eventBus.on('game:started', (data) => {
            this.handleGameStarted(data);
        });

        // Juego finalizado
        eventBus.on('game:ended', (data) => {
            this.handleGameEnded(data);
        });

        // Predicción confirmada
        eventBus.on('deck:confirmed', (data) => {
            this.handleDeckConfirmed(data);
        });

        // Actualización de predicciones
        eventBus.on('deck:prediction:updated', (data) => {
            this.handlePredictionsUpdated(data);
        });

        this.log('🔌 Event listeners configurados');
    }

    /**
     * 🎮 Manejar inicio de juego
     */
    handleGameStarted(data) {
        this.log('🎮 Registrando inicio de juego');

        const gameRecord = {
            gameNumber: this.stats.gamesPlayed + 1,
            startTime: Date.now(),
            cardsPlayed: 0,
            predictedDeck: null,
            confirmedDeck: null,
            predictionAccurate: false
        };

        this.gameHistory.push(gameRecord);
        this.stats.gamesPlayed++;

        this.saveStats();
    }

    /**
     * 🏁 Manejar fin de juego
     */
    handleGameEnded(data) {
        this.log('🏁 Registrando fin de juego');

        const lastGame = this.gameHistory[this.gameHistory.length - 1];

        if (lastGame) {
            lastGame.endTime = Date.now();
            lastGame.duration = lastGame.endTime - lastGame.startTime;
        }

        this.saveStats();
    }

    /**
     * 🎯 Manejar mazo confirmado
     */
    handleDeckConfirmed(data) {
        this.log('🎯 Registrando mazo confirmado');

        const lastGame = this.gameHistory[this.gameHistory.length - 1];

        if (lastGame) {
            lastGame.confirmedDeck = data.deck;
            lastGame.confirmationTime = Date.now();

            // Verificar si la predicción fue correcta
            if (lastGame.predictedDeck && lastGame.predictedDeck.id === data.deck.id) {
                lastGame.predictionAccurate = true;
                this.stats.correctPredictions++;
            }
        }

        this.calculateAccuracy();
        this.saveStats();
    }

    /**
     * 📊 Manejar actualización de predicciones
     */
    handlePredictionsUpdated(data) {
        const { predictions, cardsAnalyzed } = data;

        const lastGame = this.gameHistory[this.gameHistory.length - 1];

        if (lastGame) {
            lastGame.cardsPlayed = cardsAnalyzed || 0;

            // Guardar predicción principal
            if (predictions && predictions.length > 0) {
                lastGame.predictedDeck = predictions[0].deck;
                lastGame.topPredictionConfidence = predictions[0].confidence;
                lastGame.topPredictionProbability = predictions[0].probability;
            }
        }

        // Agregar cartas analizadas
        this.stats.cardsAnalyzed += (cardsAnalyzed || 0);

        // Guardar predicción en historial
        if (predictions && predictions.length > 0) {
            this.predictionHistory.push({
                timestamp: Date.now(),
                predictions,
                cardsAnalyzed
            });

            // Mantener solo últimas 100 predicciones
            if (this.predictionHistory.length > 100) {
                this.predictionHistory.shift();
            }
        }

        this.saveStats();
    }

    /**
     * 📈 Calcular precisión de predicciones
     */
    calculateAccuracy() {
        if (this.stats.gamesPlayed === 0) {
            this.stats.predictionAccuracy = 0;
            return;
        }

        this.stats.predictionAccuracy = (this.stats.correctPredictions / this.stats.gamesPlayed) * 100;

        this.log(`📈 Precisión: ${this.stats.predictionAccuracy.toFixed(1)}% (${this.stats.correctPredictions}/${this.stats.gamesPlayed})`);
    }

    /**
     * 💾 Guardar estadísticas en localStorage
     */
    saveStats() {
        try {
            const data = {
                stats: this.stats,
                gameHistory: this.gameHistory,
                predictionHistory: this.predictionHistory,
                lastSaved: Date.now()
            };

            localStorage.setItem('mtgArenaSniffer_analytics', JSON.stringify(data));
            this.log('💾 Estadísticas guardadas');

        } catch (error) {
            this.logError('Error guardando estadísticas:', error);
        }
    }

    /**
     * 📂 Cargar estadísticas desde localStorage
     */
    loadStats() {
        try {
            const stored = localStorage.getItem('mtgArenaSniffer_analytics');

            if (stored) {
                const data = JSON.parse(stored);
                this.stats = { ...this.stats, ...data.stats };
                this.gameHistory = data.gameHistory || [];
                this.predictionHistory = data.predictionHistory || [];

                this.log(`📂 Estadísticas cargadas: ${this.stats.gamesPlayed} juegos, ${this.stats.predictionAccuracy.toFixed(1)}% precisión`);
            }

        } catch (error) {
            this.logError('Error cargando estadísticas:', error);
        }
    }

    /**
     * 📊 Obtener resumen de estadísticas
     */
    getSummary() {
        return {
            ...this.stats,
            sessionDuration: Date.now() - this.stats.sessionStart,
            gamesPerHour: this.stats.gamesPlayed / ((Date.now() - this.stats.sessionStart) / 3600000)
        };
    }

    /**
     * 🔄 Resetear estadísticas
     */
    reset() {
        this.log('🔄 Resetando estadísticas...');

        this.stats = {
            gamesPlayed: 0,
            correctPredictions: 0,
            cardsAnalyzed: 0,
            averageConfidence: 0,
            predictionAccuracy: 0,
            sessionStart: Date.now()
        };

        this.gameHistory = [];
        this.predictionHistory = [];

        localStorage.removeItem('mtgArenaSniffer_analytics');
    }

    /**
     * 📝 Logging
     */
    log(message) {
        if (!this.debugMode) return;
        console.log(`📊 [AnalyticsAgent] ${message}`);
    }

    /**
     * ❌ Error logging
     */
    logError(message, error = null) {
        console.error(`❌ [AnalyticsAgent] ${message}`, error || '');
    }
}

export default AnalyticsAgent;
