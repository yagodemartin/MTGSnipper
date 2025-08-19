
// src/test-app.js
// 🧪 Aplicación simplificada para testing inicial

console.log('🚀 Cargando test-app.js...');

// Mock de EventBus simplificado
class SimpleEventBus {
    constructor() {
        this.listeners = new Map();
        this.eventHistory = [];
    }

    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(callback);
        console.log(`📡 Listener registrado para: ${eventName}`);
    }

    emit(eventName, data) {
        this.eventHistory.push({ eventName, data, timestamp: Date.now() });
        console.log(`🚀 Evento emitido: ${eventName}`, data);
        
        if (this.listeners.has(eventName)) {
            this.listeners.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Error en listener para ${eventName}:`, error);
                }
            });
        }
    }

    getStats() {
        return {
            totalEvents: this.eventHistory.length,
            totalListeners: Array.from(this.listeners.values()).reduce((sum, arr) => sum + arr.length, 0),
            eventTypes: this.listeners.size
        };
    }
}

// Mock de DatabaseManager simplificado
class SimpleDatabaseManager {
    constructor() {
        this.isReady = false;
        this.decks = this.getMockDecks();
    }

    async initialize() {
        console.log('🗄️ Inicializando DatabaseManager...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simular carga
        this.isReady = true;
        console.log('✅ DatabaseManager listo');
    }

    getMockDecks() {
        return [
            {
                id: 'mono-red-aggro',
                name: 'Mono Red Aggro',
                metaShare: 15.8,
                rank: 1,
                colors: ['R'],
                archetype: 'aggro',
                keyCards: [
                    { name: 'Lightning Bolt', weight: 95 },
                    { name: 'Monastery Swiftspear', weight: 90 },
                    { name: 'Goblin Guide', weight: 85 }
                ]
            },
            {
                id: 'azorius-control',
                name: 'Azorius Control',
                metaShare: 12.4,
                rank: 2,
                colors: ['W', 'U'],
                archetype: 'control',
                keyCards: [
                    { name: 'Teferi, Hero of Dominaria', weight: 95 },
                    { name: 'Counterspell', weight: 90 },
                    { name: 'Supreme Verdict', weight: 80 }
                ]
            },
            {
                id: 'domain-ramp',
                name: 'Domain Ramp',
                metaShare: 18.2,
                rank: 3,
                colors: ['W', 'U', 'B', 'R', 'G'],
                archetype: 'ramp',
                keyCards: [
                    { name: 'Leyline of the Guildpact', weight: 100 },
                    { name: 'Up the Beanstalk', weight: 85 },
                    { name: 'Atraxa, Grand Unifier', weight: 90 }
                ]
            }
        ];
    }

    async getMetaData() {
        return {
            decks: this.decks,
            lastUpdated: new Date().toISOString(),
            deckCount: this.decks.length
        };
    }

    getStats() {
        return {
            isReady: this.isReady,
            deckCount: this.decks.length,
            lastUpdate: Date.now() - 300000 // 5 minutos atrás
        };
    }
}

// Mock de PredictionEngine simplificado
class SimplePredictionEngine {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.opponentCards = [];
        this.predictions = [];
        this.confirmedDeck = null;
    }

    async addOpponentCard(cardData) {
        console.log(`🃏 Procesando carta: ${cardData.name}`);
        
        this.opponentCards.push(cardData);
        
        // Generar predicciones mock
        const metaData = await this.db.getMetaData();
        this.predictions = this.generateMockPredictions(metaData.decks, cardData);
        
        // Auto-confirmar si tenemos 4+ cartas
        if (this.opponentCards.length >= 4 && this.predictions.length > 0) {
            const topPrediction = this.predictions[0];
            if (topPrediction.probability > 0.8) {
                this.confirmedDeck = topPrediction;
                return { confirmed: true, deck: topPrediction };
            }
        }
        
        return { confirmed: false, predictions: this.predictions };
    }

    generateMockPredictions(decks, newCard) {
        return decks.map(deck => {
            // Calcular score mock basado en coincidencias de cartas
            let score = Math.random() * 50; // Base random
            
            // Bonus si la carta coincide con las key cards
            const matchedCards = deck.keyCards.filter(keyCard => 
                keyCard.name.toLowerCase().includes(newCard.name.toLowerCase()) ||
                newCard.name.toLowerCase().includes(keyCard.name.toLowerCase())
            );
            
            score += matchedCards.length * 30;
            
            // Bonus por colores si es tierra
            if (newCard.name.toLowerCase().includes('mountain') && deck.colors.includes('R')) {
                score += 20;
            }
            if (newCard.name.toLowerCase().includes('island') && deck.colors.includes('U')) {
                score += 20;
            }
            
            const probability = Math.min(score / 100, 0.95);
            
            return {
                deck,
                score,
                probability,
                confidence: probability > 0.8 ? 'high' : probability > 0.5 ? 'medium' : 'low',
                matchedCards: matchedCards.map(card => ({
                    card: card.name,
                    score: 30,
                    type: 'key'
                }))
            };
        }).sort((a, b) => b.score - a.score);
    }

    getStats() {
        return {
            cardsAnalyzed: this.opponentCards.length,
            predictionsCount: this.predictions.length,
            isConfirmed: !!this.confirmedDeck,
            confirmedDeck: this.confirmedDeck?.deck?.name || null
        };
    }

    reset() {
        this.opponentCards = [];
        this.predictions = [];
        this.confirmedDeck = null;
        console.log('🔄 PredictionEngine reseteado');
    }
}

// Aplicación principal simplificada
class SimpleTestApp {
    constructor() {
        this.eventBus = new SimpleEventBus();
        this.databaseManager = new SimpleDatabaseManager();
        this.predictionEngine = new SimplePredictionEngine(this.databaseManager);
        this.currentView = 'input';
        this.gameState = {
            turn: 1,
            cardsPlayed: []
        };
    }

    async initialize() {
        console.log('🚀 Inicializando SimpleTestApp...');
        
        try {
            // Inicializar componentes
            await this.databaseManager.initialize();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Renderizar interfaz
            this.render();
            
            console.log('✅ SimpleTestApp inicializada');
            
        } catch (error) {
            console.error('❌ Error inicializando:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Ejemplo de event listeners
        this.eventBus.on('card:added', async (data) => {
            console.log('🃏 Carta añadida:', data);
            const result = await this.predictionEngine.addOpponentCard(data);
            
            if (result.confirmed) {
                this.eventBus.emit('deck:confirmed', result.deck);
                this.currentView = 'confirmed';
            } else {
                this.eventBus.emit('predictions:updated', { predictions: result.predictions });
                this.currentView = 'predictions';
            }
            
            this.updateUI();
        });

        this.eventBus.on('game:reset', () => {
            this.predictionEngine.reset();
            this.gameState = { turn: 1, cardsPlayed: [] };
            this.currentView = 'input';
            this.updateUI();
        });
    }

    render() {
        const appContainer = document.getElementById('app');
        
        appContainer.innerHTML = `
            <div class="simple-test-app">
                <header class="test-header">
                    <h1>🔍 mtgArenaSniffer - Test Mode</h1>
                    <div class="test-controls">
                        <button id="reset-btn" class="btn btn-sm">🔄 Reset</button>
                        <button id="debug-btn" class="btn btn-sm">🔧 Debug</button>
                        <span class="turn-display">Turno: ${this.gameState.turn}</span>
                    </div>
                </header>

                <main class="test-main">
                    <div class="test-input">
                        <h3>🃏 Añadir carta del oponente</h3>
                        <div class="input-group">
                            <input type="text" id="card-input" placeholder="Nombre de la carta..." />
                            <input type="number" id="turn-input" value="${this.gameState.turn}" min="1" max="20" />
                            <button id="add-card-btn" class="btn">Añadir</button>
                        </div>
                        
                        <div class="quick-cards">
                            <button class="quick-card" data-card="Mountain">🔴 Mountain</button>
                            <button class="quick-card" data-card="Island">🔵 Island</button>
                            <button class="quick-card" data-card="Lightning Bolt">⚡ Lightning Bolt</button>
                            <button class="quick-card" data-card="Counterspell">🚫 Counterspell</button>
                        </div>
                    </div>

                    <div class="test-content">
                        <div id="view-container">
                            ${this.getViewContent()}
                        </div>
                    </div>

                    <div class="test-debug">
                        <details>
                            <summary>🔧 Debug Info</summary>
                            <div id="debug-info">
                                <pre>${JSON.stringify({
                                    gameState: this.gameState,
                                    currentView: this.currentView,
                                    cardsPlayed: this.predictionEngine.opponentCards,
                                    stats: this.predictionEngine.getStats()
                                }, null, 2)}</pre>
                            </div>
                        </details>
                    </div>
                </main>
            </div>
        `;

        this.setupUIEventListeners();
    }

    getViewContent() {
        switch (this.currentView) {
            case 'input':
                return `
                    <div class="view-input">
                        <h3>👋 ¡Bienvenido!</h3>
                        <p>Añade cartas del oponente para comenzar la predicción.</p>
                    </div>
                `;
            
            case 'predictions':
                return `
                    <div class="view-predictions">
                        <h3>🎯 Predicciones de mazos</h3>
                        ${this.getPredictionsHTML()}
                    </div>
                `;
            
            case 'confirmed':
                return `
                    <div class="view-confirmed">
                        <h3>✅ Mazo confirmado</h3>
                        ${this.getConfirmedDeckHTML()}
                    </div>
                `;
            
            default:
                return '<div>Vista desconocida</div>';
        }
    }

    getPredictionsHTML() {
        const predictions = this.predictionEngine.predictions;
        
        if (predictions.length === 0) {
            return '<p>No hay predicciones disponibles.</p>';
        }

        return predictions.slice(0, 3).map((pred, index) => `
            <div class="prediction-card ${index === 0 ? 'top-prediction' : ''}">
                <div class="prediction-header">
                    <span class="rank">#${index + 1}</span>
                    <span class="deck-name">${pred.deck.name}</span>
                    <span class="probability">${(pred.probability * 100).toFixed(1)}%</span>
                </div>
                <div class="deck-info">
                    <small>${pred.deck.archetype} | ${pred.deck.metaShare}% meta</small>
                </div>
                ${pred.matchedCards.length > 0 ? `
                    <div class="matched-cards">
                        <strong>Cartas detectadas:</strong> ${pred.matchedCards.map(c => c.card).join(', ')}
                    </div>
                ` : ''}
                <button class="btn btn-sm confirm-btn" data-deck-id="${pred.deck.id}">
                    ✅ Confirmar este mazo
                </button>
            </div>
        `).join('');
    }

    getConfirmedDeckHTML() {
        const deck = this.predictionEngine.confirmedDeck;
        
        if (!deck) {
            return '<p>No hay mazo confirmado.</p>';
        }

        return `
            <div class="confirmed-deck-card">
                <h4>${deck.deck.name}</h4>
                <p><strong>Probabilidad:</strong> ${(deck.probability * 100).toFixed(1)}%</p>
                <p><strong>Arquetipo:</strong> ${deck.deck.archetype}</p>
                <p><strong>Meta Share:</strong> ${deck.deck.metaShare}%</p>
                
                <div class="key-cards">
                    <strong>Cartas clave del mazo:</strong>
                    <ul>
                        ${deck.deck.keyCards.map(card => `<li>${card.name}</li>`).join('')}
                    </ul>
                </div>
                
                <button class="btn btn-secondary" id="unconfirm-btn">
                    ↩️ Volver a predicciones
                </button>
            </div>
        `;
    }

    setupUIEventListeners() {
        // Añadir carta
        const addBtn = document.getElementById('add-card-btn');
        const cardInput = document.getElementById('card-input');
        const turnInput = document.getElementById('turn-input');
        
        const addCard = () => {
            const cardName = cardInput.value.trim();
            const turn = parseInt(turnInput.value);
            
            if (cardName) {
                this.addCard(cardName, turn);
                cardInput.value = '';
                turnInput.value = turn + 1;
            }
        };

        addBtn?.addEventListener('click', addCard);
        cardInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addCard();
        });

        // Quick cards
        document.querySelectorAll('.quick-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cardName = e.target.getAttribute('data-card');
                this.addCard(cardName, this.gameState.turn);
                turnInput.value = this.gameState.turn + 1;
            });
        });

        // Reset
        document.getElementById('reset-btn')?.addEventListener('click', () => {
            this.eventBus.emit('game:reset');
        });

        // Debug
        document.getElementById('debug-btn')?.addEventListener('click', () => {
            console.log('🔧 Debug Info:', {
                eventBusStats: this.eventBus.getStats(),
                databaseStats: this.databaseManager.getStats(),
                predictionStats: this.predictionEngine.getStats()
            });
        });

        // Confirmar deck
        document.querySelectorAll('.confirm-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const deckId = e.target.getAttribute('data-deck-id');
                const prediction = this.predictionEngine.predictions.find(p => p.deck.id === deckId);
                if (prediction) {
                    this.predictionEngine.confirmedDeck = prediction;
                    this.eventBus.emit('deck:confirmed', prediction);
                    this.currentView = 'confirmed';
                    this.updateUI();
                }
            });
        });

        // Unconfirm
        document.getElementById('unconfirm-btn')?.addEventListener('click', () => {
            this.predictionEngine.confirmedDeck = null;
            this.currentView = 'predictions';
            this.updateUI();
        });
    }

    addCard(cardName, turn) {
        const cardData = {
            name: cardName,
            turn: turn,
            timestamp: Date.now()
        };

        this.gameState.cardsPlayed.push(cardData);
        this.gameState.turn = turn;
        
        this.eventBus.emit('card:added', cardData);
    }

    updateUI() {
        const viewContainer = document.getElementById('view-container');
        const debugInfo = document.getElementById('debug-info');
        const turnDisplay = document.querySelector('.turn-display');
        
        if (viewContainer) {
            viewContainer.innerHTML = this.getViewContent();
            this.setupUIEventListeners(); // Re-setup listeners
        }
        
        if (debugInfo) {
            debugInfo.innerHTML = `<pre>${JSON.stringify({
                gameState: this.gameState,
                currentView: this.currentView,
                cardsPlayed: this.predictionEngine.opponentCards,
                stats: this.predictionEngine.getStats()
            }, null, 2)}</pre>`;
        }

        if (turnDisplay) {
            turnDisplay.textContent = `Turno: ${this.gameState.turn}`;
        }
    }

    // Métodos para testing manual
    testSequence() {
        const testCards = [
            { name: 'Mountain', turn: 1 },
            { name: 'Lightning Bolt', turn: 1 },
            { name: 'Mountain', turn: 2 },
            { name: 'Monastery Swiftspear', turn: 2 },
            { name: 'Goblin Guide', turn: 3 }
        ];

        let index = 0;
        const interval = setInterval(() => {
            if (index < testCards.length) {
                const card = testCards[index];
                this.addCard(card.name, card.turn);
                index++;
            } else {
                clearInterval(interval);
                console.log('✅ Secuencia de test completada');
            }
        }, 1500);
    }
}

// Exportar para uso global
window.SimpleTestApp = SimpleTestApp;

console.log('✅ test-app.js cargado correctamente');

export default SimpleTestApp;