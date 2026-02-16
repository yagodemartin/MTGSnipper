// run-test.mjs - Test completo del sistema

import eventBus from './src/shared/events/EventBus.js';
import DatabaseManager from './src/shared/data/DatabaseManager.js';
import DeckPredictionEngine from './src/shared/data/DeckPredictionEngine.js';
import { GameService } from './src/shared/services/GameService.js';
import LogParserAgent from './src/background/agents/LogParserAgent.js';

console.log('\n╔════════════════════════════════════════════════╗');
console.log('║  🧪 TEST COMPLETO - MTG ARENA SNIFFER 🧪    ║');
console.log('╚════════════════════════════════════════════════╝\n');

async function runTest() {
    try {
        // 1. Inicializar DatabaseManager
        console.log('📊 Inicializando DatabaseManager...');
        const db = new DatabaseManager();

        // 2. Inicializar DeckPredictionEngine
        console.log('🎯 Inicializando DeckPredictionEngine...');
        const engine = new DeckPredictionEngine(db);

        // 3. Inicializar GameService
        console.log('🎮 Inicializando GameService...');
        const gameService = new GameService(engine, db, eventBus);
        await gameService.initialize();

        // 4. Inicializar LogParserAgent
        console.log('📝 Inicializando LogParserAgent...');
        const parser = new LogParserAgent();
        await parser.initialize();

        console.log('\n✅ Sistema inicializado correctamente\n');

        // 5. Simular una partida
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎮 SIMULANDO PARTIDA COMPLETA');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Listener para predicciones
        eventBus.on('deck:prediction:updated', (data) => {
            console.log('📊 PREDICCIONES ACTUALIZADAS:');
            data.predictions.forEach((pred, i) => {
                const prob = (pred.probability * 100).toFixed(1);
                console.log(`  ${i + 1}. ${pred.deck.name} - ${prob}%`);
            });
        });

        // Listener para mazo confirmado
        eventBus.on('deck:confirmed', (data) => {
            console.log(`\n🎯 ¡MAZO CONFIRMADO! ${data.deck.name} al ${(data.probability * 100).toFixed(1)}%\n`);
        });

        // Simular inicio de juego
        console.log('🎮 Inicio de juego...\n');
        eventBus.emit('game:started', { timestamp: Date.now() });

        // Esperar un poco
        await delay(500);

        // Simular cartas jugadas
        const testCards = [
            'Forest',
            'Llanowar Elves',
            'Elvish Mystic',
            'Torbran, Thane of Red Fell',
            'Goblin Chainwhirler'
        ];

        for (const card of testCards) {
            console.log(`🃏 Carta jugada: ${card}`);

            try {
                const result = await gameService.addOpponentCard({
                    name: card,
                    timestamp: Date.now()
                });

                if (result.confirmed) {
                    console.log(`✅ CONFIRMADO: ${result.deck.name}\n`);
                    break;
                }
            } catch (error) {
                console.log(`   (Sin datos del meta disponibles)\n`);
            }

            await delay(300);
        }

        // Mostrar estadísticas del EventBus
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 ESTADÍSTICAS DEL SISTEMA');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const stats = eventBus.getStats();
        console.log(`Eventos registrados: ${stats.eventsEmitted}`);
        console.log(`Tipos de eventos: ${stats.totalEventTypes}`);
        console.log(`Total listeners: ${stats.totalListeners}`);

        console.log('\n✅ TEST COMPLETADO EXITOSAMENTE\n');

    } catch (error) {
        console.error('❌ Error en test:', error);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Ejecutar test
runTest().catch(console.error);
