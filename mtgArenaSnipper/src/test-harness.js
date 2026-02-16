// src/test-harness.js
// 🧪 Testing harness para simular eventos sin MTG Arena

import eventBus from './shared/events/EventBus.js';
import LogParserAgent from './background/agents/LogParserAgent.js';
import GameService from './shared/services/GameService.js';
import DeckPredictionEngine from './shared/data/DeckPredictionEngine.js';
import DatabaseManager from './shared/data/DatabaseManager.js';

class TestHarness {
    constructor() {
        this.debugMode = true;
        this.isRunning = false;
    }

    /**
     * 🚀 Inicializar harness
     */
    async initialize() {
        try {
            this.log('🧪 TestHarness: Inicializando...');

            // Inicializar servicios mínimos para testing
            const database = new DatabaseManager();
            await database.initialize();

            const predictionEngine = new DeckPredictionEngine(database);
            const gameService = new GameService(predictionEngine, database, eventBus);
            await gameService.initialize();

            // Inicializar LogParser
            const logParser = new LogParserAgent();
            await logParser.initialize();

            this.log('✅ TestHarness inicializado');
            return true;

        } catch (error) {
            this.logError('Error inicializando:', error);
            return false;
        }
    }

    /**
     * 🎮 Simular inicio de juego
     */
    simulateGameStart() {
        this.log('🎮 Simulando inicio de juego...');

        const line = 'Game Start';
        eventBus.emit('log:new-lines', {
            lines: [line],
            timestamp: Date.now()
        });
    }

    /**
     * 🃏 Simular carta jugada
     */
    simulateCardPlayed(cardName) {
        this.log(`🃏 Simulando carta jugada: ${cardName}`);

        const line = `[CARD] Playing card: ${cardName}`;
        eventBus.emit('log:new-lines', {
            lines: [line],
            timestamp: Date.now()
        });
    }

    /**
     * ⏰ Simular turno
     */
    simulateTurn(turnNumber) {
        this.log(`⏰ Simulando turno ${turnNumber}...`);

        const line = `Turn ${turnNumber} Starting`;
        eventBus.emit('log:new-lines', {
            lines: [line],
            timestamp: Date.now()
        });
    }

    /**
     * 🏁 Simular fin de juego
     */
    simulateGameEnd() {
        this.log('🏁 Simulando fin de juego...');

        const line = 'Game Over';
        eventBus.emit('log:new-lines', {
            lines: [line],
            timestamp: Date.now()
        });
    }

    /**
     * 🔄 Ejecutar test scenario
     */
    async runTestScenario() {
        this.log('🔄 Ejecutando test scenario...');

        // Simular una partida completa
        this.simulateGameStart();
        await this.delay(1000);

        // Turno 1
        this.simulateTurn(1);
        await this.delay(500);

        // Primeras cartas
        this.simulateCardPlayed('Forest');
        await this.delay(500);

        this.simulateCardPlayed('Elvish Mystic');
        await this.delay(500);

        // Turno 2
        this.simulateTurn(2);
        await this.delay(500);

        this.simulateCardPlayed('Mountain');
        await this.delay(500);

        this.simulateCardPlayed('Llanowar Elves');
        await this.delay(500);

        // Más cartas
        this.simulateCardPlayed('Torbran, Thane of Red Fell');
        await this.delay(1000);

        // Fin de juego
        this.simulateGameEnd();
        await this.delay(500);

        this.log('✅ Test scenario completado');
    }

    /**
     * ⏱️ Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 📊 Mostrar estadísticas de EventBus
     */
    showEventBusStats() {
        const stats = eventBus.getStats();
        console.log('📊 EventBus Statistics:', stats);
        return stats;
    }

    /**
     * 📝 Logging
     */
    log(message) {
        if (!this.debugMode) return;
        console.log(`🧪 [TestHarness] ${message}`);
    }

    /**
     * ❌ Error logging
     */
    logError(message, error = null) {
        console.error(`❌ [TestHarness] ${message}`, error || '');
    }
}

// Exportar instancia global
const testHarness = new TestHarness();

// Hacer disponible para testing
if (typeof window !== 'undefined') {
    window.testHarness = testHarness;
    window.runTest = async () => {
        await testHarness.initialize();
        await testHarness.runTestScenario();
        testHarness.showEventBusStats();
    };

    console.log('🧪 TestHarness disponible. Ejecutar: window.runTest()');
}

export default testHarness;
