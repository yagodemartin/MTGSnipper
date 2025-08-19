// src/presentation/components/ui/BaseComponent.js
// 🏗️ Componente base para arquitectura consistente

class BaseComponent {
    constructor(eventBus, dependencies = {}) {
        this.eventBus = eventBus;
        this.dependencies = dependencies;
        this.container = null;
        this.state = {};
        this.isInitialized = false;
        this.eventListeners = [];
        this.debugMode = true;
    }

    async initialize() {
        if (this.isInitialized) return;
        
        this.log('🏗️ Inicializando componente...');
        
        // Hook para inicialización específica del componente
        await this.onInitialize();
        
        this.isInitialized = true;
        this.log('✅ Componente inicializado');
    }

    async render(container) {
        if (!container) {
            throw new Error('Container es requerido para renderizar');
        }

        this.container = container;
        
        // Generar HTML del componente
        const html = await this.getTemplate();
        container.innerHTML = html;
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Hook post-render
        await this.onRender();
        
        this.log('🎨 Componente renderizado');
    }

    setState(newState) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        // Hook para manejar cambios de estado
        this.onStateChange(prevState, this.state);
        
        // Re-render si es necesario
        if (this.shouldRerender(prevState, this.state)) {
            this.rerender();
        }
    }

    async rerender() {
        if (!this.container) return;
        
        this.log('🔄 Re-renderizando componente...');
        await this.render(this.container);
    }

    cleanup() {
        this.log('🧹 Limpiando componente...');
        
        // Remover event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        
        // Hook para cleanup específico
        this.onCleanup();
        
        this.isInitialized = false;
    }

    // Métodos para sobrescribir en componentes específicos
    async onInitialize() {}
    async onRender() {}
    onStateChange(prevState, newState) {}
    shouldRerender(prevState, newState) { return false; }
    onCleanup() {}
    
    getTemplate() {
        return '<div>Base Component</div>';
    }
    
    setupEventListeners() {}

    // Utilidades
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    $(selector) {
        return this.container?.querySelector(selector);
    }

    $$(selector) {
        return this.container?.querySelectorAll(selector);
    }

    log(message, data = null) {
        if (!this.debugMode) return;
        console.log(`🧩 [${this.constructor.name}] ${message}`, data || '');
    }

    logError(message, error = null) {
        console.error(`❌ [${this.constructor.name}] ${message}`, error || '');
    }
}

// ===============================================

// src/presentation/components/ui/CardInputComponent.js
// 🃏 Componente de entrada de cartas

class CardInputComponent extends BaseComponent {
    constructor(eventBus, gameService) {
        super(eventBus, { gameService });
        
        this.state = {
            currentCard: '',
            suggestions: [],
            turn: 1,
            isLoading: false,
            recentCards: []
        };
    }

    async onInitialize() {
        // Configurar listeners de eventos globales
        this.eventBus.on('turn:updated', (data) => {
            this.setState({ turn: data.turn });
        });

        this.eventBus.on('game:reset', () => {
            this.setState({ 
                currentCard: '', 
                turn: 1, 
                recentCards: [] 
            });
        });
    }

    getTemplate() {
        return `
            <div class="card-input-component">
                <div class="input-header">
                    <h3>🃏 Cartas del oponente</h3>
                    <div class="turn-controls">
                        <label for="turn-input">Turno:</label>
                        <input type="number" 
                               id="turn-input" 
                               min="1" 
                               max="20" 
                               value="${this.state.turn}"
                               class="turn-input">
                        <button id="turn-update-btn" class="btn btn-sm">Actualizar</button>
                    </div>
                </div>

                <div class="card-input-form">
                    <div class="input-group">
                        <input type="text" 
                               id="card-name-input" 
                               placeholder="Nombre de la carta jugada..."
                               value="${this.state.currentCard}"
                               class="card-input"
                               autocomplete="off">
                        <button id="add-card-btn" 
                                class="btn btn-primary"
                                ${this.state.isLoading ? 'disabled' : ''}>
                            ${this.state.isLoading ? '⏳' : 'Añadir'}
                        </button>
                    </div>
                    
                    ${this.state.suggestions.length > 0 ? `
                        <div class="suggestions-dropdown">
                            ${this.state.suggestions.map((suggestion, index) => `
                                <div class="suggestion-item" data-index="${index}">
                                    <span class="suggestion-name">${suggestion.name}</span>
                                    <span class="suggestion-type">${suggestion.type || ''}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>

                <div class="quick-actions">
                    <h4>🎯 Acciones rápidas</h4>
                    <div class="quick-buttons">
                        <button class="btn btn-sm btn-secondary" data-card="Mountain">Mountain</button>
                        <button class="btn btn-sm btn-secondary" data-card="Island">Island</button>
                        <button class="btn btn-sm btn-secondary" data-card="Plains">Plains</button>
                        <button class="btn btn-sm btn-secondary" data-card="Swamp">Swamp</button>
                        <button class="btn btn-sm btn-secondary" data-card="Forest">Forest</button>
                    </div>
                </div>

                ${this.state.recentCards.length > 0 ? `
                    <div class="recent-cards">
                        <h4>📋 Cartas recientes</h4>
                        <div class="recent-cards-list">
                            ${this.state.recentCards.slice(-5).map(card => `
                                <div class="recent-card">
                                    <span class="card-name">${card.name}</span>
                                    <span class="card-turn">T${card.turn}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    setupEventListeners() {
        // Input de carta
        const cardInput = this.$('#card-name-input');
        if (cardInput) {
            this.addEventListener(cardInput, 'input', (e) => {
                this.handleCardInput(e.target.value);
            });

            this.addEventListener(cardInput, 'keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addCard();
                }
            });
        }

        // Botón añadir carta
        const addBtn = this.$('#add-card-btn');
        if (addBtn) {
            this.addEventListener(addBtn, 'click', () => {
                this.addCard();
            });
        }

        // Control de turno
        const turnBtn = this.$('#turn-update-btn');
        if (turnBtn) {
            this.addEventListener(turnBtn, 'click', () => {
                this.updateTurn();
            });
        }

        // Botones rápidos
        this.$$('[data-card]').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const cardName = e.target.getAttribute('data-card');
                this.addQuickCard(cardName);
            });
        });

        // Sugerencias
        this.$$('.suggestion-item').forEach(item => {
            this.addEventListener(item, 'click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                this.selectSuggestion(index);
            });
        });
    }

    async handleCardInput(value) {
        this.setState({ currentCard: value });

        // Buscar sugerencias si hay texto
        if (value.length >= 2) {
            const suggestions = await this.searchCardSuggestions(value);
            this.setState({ suggestions });
        } else {
            this.setState({ suggestions: [] });
        }
    }

    async addCard() {
        const cardName = this.state.currentCard.trim();
        
        if (!cardName) {
            this.showError('Por favor ingresa el nombre de una carta');
            return;
        }

        try {
            this.setState({ isLoading: true });

            // Crear datos de la carta
            const cardData = {
                name: cardName,
                turn: this.state.turn,
                timestamp: Date.now()
            };

            // Enviar al GameService
            await this.dependencies.gameService.addOpponentCard(cardData);

            // Actualizar estado local
            const recentCards = [...this.state.recentCards, cardData];
            this.setState({ 
                currentCard: '', 
                suggestions: [],
                recentCards,
                isLoading: false 
            });

            // Emitir evento
            this.eventBus.emit('ui:card-added', { card: cardData });

            this.log(`✅ Carta añadida: ${cardName}`);

        } catch (error) {
            this.setState({ isLoading: false });
            this.logError('Error añadiendo carta:', error);
            this.showError('Error procesando la carta');
        }
    }

    addQuickCard(cardName) {
        this.setState({ currentCard: cardName });
        this.addCard();
    }

    updateTurn() {
        const turnInput = this.$('#turn-input');
        if (turnInput) {
            const newTurn = parseInt(turnInput.value);
            if (newTurn >= 1 && newTurn <= 20) {
                this.setState({ turn: newTurn });
                this.dependencies.gameService.setTurn(newTurn);
                this.eventBus.emit('turn:updated', { turn: newTurn });
            }
        }
    }

    selectSuggestion(index) {
        const suggestion = this.state.suggestions[index];
        if (suggestion) {
            this.setState({ 
                currentCard: suggestion.name,
                suggestions: []
            });
        }
    }

    async searchCardSuggestions(query) {
        // Mock de búsqueda - en implementación real usaría CardService
        const commonCards = [
            'Lightning Bolt', 'Counterspell', 'Teferi, Hero of Dominaria',
            'Monastery Swiftspear', 'Goblin Guide', 'Atraxa, Grand Unifier',
            'Up the Beanstalk', 'Leyline of the Guildpact'
        ];

        return commonCards
            .filter(card => card.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5)
            .map(name => ({ name, type: 'Unknown' }));
    }

    showError(message) {
        this.eventBus.emit('ui:notification', {
            type: 'error',
            message: message,
            duration: 3000
        });
    }

    shouldRerender(prevState, newState) {
        return prevState.suggestions.length !== newState.suggestions.length ||
               prevState.recentCards.length !== newState.recentCards.length ||
               prevState.isLoading !== newState.isLoading;
    }
}

// ===============================================

// src/presentation/components/ui/PredictionsComponent.js
// 📊 Componente de predicciones de mazos

class PredictionsComponent extends BaseComponent {
    constructor(eventBus, uiService) {
        super(eventBus, { uiService });
        
        this.state = {
            predictions: [],
            isLoading: false,
            cardsAnalyzed: 0,
            lastUpdate: null
        };
    }

    async onInitialize() {
        this.eventBus.on('deck:prediction:updated', (data) => {
            this.setState({
                predictions: data.predictions || [],
                cardsAnalyzed: data.cardsAnalyzed || 0,
                lastUpdate: Date.now(),
                isLoading: false
            });
        });

        this.eventBus.on('game:reset', () => {
            this.setState({
                predictions: [],
                cardsAnalyzed: 0,
                lastUpdate: null
            });
        });
    }

    getTemplate() {
        if (this.state.predictions.length === 0) {
            return this.getEmptyStateTemplate();
        }

        return `
            <div class="predictions-component">
                <div class="predictions-header">
                    <h3>🎯 Predicciones de mazos</h3>
                    <div class="predictions-meta">
                        <span class="cards-analyzed">${this.state.cardsAnalyzed} cartas analizadas</span>
                        ${this.state.lastUpdate ? `
                            <span class="last-update">
                                Actualizado ${this.formatTimeAgo(this.state.lastUpdate)}
                            </span>
                        ` : ''}
                    </div>
                </div>

                <div class="predictions-list">
                    ${this.state.predictions.map((prediction, index) => 
                        this.getPredictionTemplate(prediction, index)
                    ).join('')}
                </div>

                <div class="predictions-actions">
                    <button class="btn btn-sm btn-secondary" id="refresh-predictions">
                        🔄 Actualizar
                    </button>
                    <button class="btn btn-sm btn-secondary" id="view-details">
                        📊 Ver detalles
                    </button>
                </div>
            </div>
        `;
    }

    getEmptyStateTemplate() {
        return `
            <div class="predictions-component empty-state">
                <div class="empty-content">
                    <div class="empty-icon">🎯</div>
                    <h3>Esperando cartas del oponente</h3>
                    <p>Añade cartas jugadas por el oponente para comenzar a predecir su mazo.</p>
                    
                    <div class="empty-tips">
                        <h4>💡 Consejos:</h4>
                        <ul>
                            <li>Añade al menos 2-3 cartas para obtener predicciones</li>
                            <li>Las tierras básicas ayudan a identificar colores</li>
                            <li>Las cartas clave confirman arquetipos específicos</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    getPredictionTemplate(prediction, index) {
        const isTop = index === 0;
        const probability = (prediction.probability * 100).toFixed(1);
        const confidence = prediction.confidence;

        return `
            <div class="prediction-item ${isTop ? 'top-prediction' : ''} confidence-${confidence}">
                <div class="prediction-header">
                    <div class="prediction-rank">#${index + 1}</div>
                    <div class="prediction-main">
                        <h4 class="deck-name">${prediction.deck.name}</h4>
                        <div class="deck-meta">
                            <span class="meta-share">${prediction.deck.metaShare?.toFixed(1)}% del meta</span>
                            <span class="archetype">${prediction.deck.archetype}</span>
                        </div>
                    </div>
                    <div class="prediction-stats">
                        <div class="probability">${probability}%</div>
                        <div class="confidence confidence-${confidence}">${confidence.replace('-', ' ')}</div>
                    </div>
                </div>

                <div class="prediction-details">
                    ${prediction.matchedCards.length > 0 ? `
                        <div class="matched-cards">
                            <strong>🔑 Cartas detectadas:</strong>
                            ${prediction.matchedCards.map(card => `
                                <span class="matched-card ${card.type}">
                                    ${card.card} <small>(+${card.score.toFixed(0)})</small>
                                </span>
                            `).join('')}
                        </div>
                    ` : ''}

                    ${isTop && prediction.deck.strategy ? `
                        <div class="deck-strategy">
                            <strong>💡 Estrategia:</strong> ${prediction.deck.strategy}
                        </div>
                    ` : ''}

                    ${isTop && prediction.deck.weakness ? `
                        <div class="deck-weakness">
                            <strong>⚠️ Debilidad:</strong> ${prediction.deck.weakness}
                        </div>
                    ` : ''}

                    ${prediction.reasoning && prediction.reasoning.length > 0 ? `
                        <div class="prediction-reasoning">
                            <details>
                                <summary>🔍 Ver análisis</summary>
                                <ul class="reasoning-list">
                                    ${prediction.reasoning.map(reason => `<li>${reason}</li>`).join('')}
                                </ul>
                            </details>
                        </div>
                    ` : ''}
                </div>

                <div class="prediction-actions">
                    <button class="btn btn-sm btn-primary confirm-deck-btn" 
                            data-deck-id="${prediction.deck.id}">
                        ✅ Confirmar este mazo
                    </button>
                    <button class="btn btn-sm btn-secondary view-deck-btn" 
                            data-deck-id="${prediction.deck.id}">
                        📋 Ver lista completa
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Botones de confirmar mazo
        this.$('.confirm-deck-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const deckId = e.target.getAttribute('data-deck-id');
                this.confirmDeck(deckId);
            });
        });

        // Botones de ver lista completa
        this.$('.view-deck-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const deckId = e.target.getAttribute('data-deck-id');
                this.viewDeckList(deckId);
            });
        });

        // Botón de refresh
        const refreshBtn = this.$('#refresh-predictions');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => {
                this.refreshPredictions();
            });
        }

        // Botón de ver detalles
        const detailsBtn = this.$('#view-details');
        if (detailsBtn) {
            this.addEventListener(detailsBtn, 'click', () => {
                this.showDetailedAnalysis();
            });
        }
    }

    confirmDeck(deckId) {
        this.log(`🎯 Confirmando mazo: ${deckId}`);
        this.eventBus.emit('deck:manual-confirm', { deckId });
    }

    viewDeckList(deckId) {
        const prediction = this.state.predictions.find(p => p.deck.id === deckId);
        if (prediction) {
            this.dependencies.uiService.showModal({
                title: `📋 ${prediction.deck.name}`,
                content: this.getDeckListModalContent(prediction.deck),
                size: 'large',
                buttons: [
                    { text: 'Cerrar', action: 'close' },
                    { text: 'Confirmar mazo', action: 'confirm', type: 'primary' }
                ]
            });
        }
    }

    getDeckListModalContent(deck) {
        return `
            <div class="deck-list-modal">
                <div class="deck-info">
                    <h4>${deck.name}</h4>
                    <div class="deck-stats">
                        <span>📊 ${deck.metaShare?.toFixed(1)}% del meta</span>
                        <span>🏗️ ${deck.archetype}</span>
                        <span>🎨 ${deck.colors?.join('') || 'Sin colores'}</span>
                    </div>
                </div>

                ${deck.mainboard && deck.mainboard.length > 0 ? `
                    <div class="mainboard">
                        <h5>Mainboard (${deck.cardCount || 60} cartas)</h5>
                        <div class="card-grid">
                            ${deck.mainboard.slice(0, 20).map(card => `
                                <div class="card-entry">
                                    <span class="quantity">${card.quantity || 1}x</span>
                                    <span class="name">${card.name}</span>
                                </div>
                            `).join('')}
                            ${deck.mainboard.length > 20 ? `
                                <div class="card-entry more">
                                    +${deck.mainboard.length - 20} cartas más...
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : `
                    <div class="no-decklist">
                        <p>📝 Lista completa no disponible</p>
                        <p>Mostrando cartas clave detectadas:</p>
                        <div class="key-cards">
                            ${deck.keyCards?.map(card => `
                                <span class="key-card">${card.name}</span>
                            `).join('') || 'Sin cartas clave'}
                        </div>
                    </div>
                `}

                ${deck.strategy ? `
                    <div class="strategy-info">
                        <h5>💡 Estrategia</h5>
                        <p>${deck.strategy}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    refreshPredictions() {
        this.setState({ isLoading: true });
        this.eventBus.emit('predictions:refresh-requested');
    }

    showDetailedAnalysis() {
        this.eventBus.emit('ui:view-change-requested', { view: 'debug' });
    }

    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'hace unos segundos';
        if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
        if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
        return `hace ${Math.floor(seconds / 86400)} días`;
    }

    shouldRerender(prevState, newState) {
        return prevState.predictions.length !== newState.predictions.length ||
               prevState.cardsAnalyzed !== newState.cardsAnalyzed ||
               prevState.isLoading !== newState.isLoading;
    }
}

// ===============================================

// src/presentation/components/ui/ConfirmedDeckComponent.js
// 🎯 Componente de mazo confirmado

class ConfirmedDeckComponent extends BaseComponent {
    constructor(eventBus, uiService) {
        super(eventBus, { uiService });
        
        this.state = {
            confirmedDeck: null,
            deckList: null,
            expectedCards: [],
            playedCards: [],
            isLoadingDeckList: false
        };
    }

    async onInitialize() {
        this.eventBus.on('deck:confirmed', (data) => {
            this.setState({
                confirmedDeck: data,
                isLoadingDeckList: true
            });
            this.loadFullDeckList(data.deck);
        });

        this.eventBus.on('card:played:confirmed', (data) => {
            this.updatePlayedCards(data);
        });

        this.eventBus.on('game:reset', () => {
            this.setState({
                confirmedDeck: null,
                deckList: null,
                expectedCards: [],
                playedCards: []
            });
        });
    }

    getTemplate() {
        if (!this.state.confirmedDeck) {
            return `
                <div class="confirmed-deck-component empty">
                    <div class="empty-content">
                        <div class="empty-icon">🎯</div>
                        <h3>No hay mazo confirmado</h3>
                        <p>Cuando se confirme un mazo (automático o manual), aparecerá aquí la información completa.</p>
                    </div>
                </div>
            `;
        }

        const deck = this.state.confirmedDeck.deck;
        const probability = (this.state.confirmedDeck.probability * 100).toFixed(1);

        return `
            <div class="confirmed-deck-component">
                <div class="deck-header">
                    <div class="deck-title">
                        <h3>🎯 Mazo confirmado</h3>
                        <div class="confirmation-badge">
                            ✅ ${probability}% de certeza
                        </div>
                    </div>
                    
                    <div class="deck-info">
                        <h2 class="deck-name">${deck.name}</h2>
                        <div class="deck-meta">
                            <span class="meta-share">📊 ${deck.metaShare?.toFixed(1)}% del meta</span>
                            <span class="archetype">🏗️ ${deck.archetype}</span>
                            <span class="colors">🎨 ${deck.colors?.join('') || 'Sin colores'}</span>
                        </div>
                    </div>
                </div>

                <div class="deck-content">
                    <div class="deck-analysis">
                        ${deck.strategy ? `
                            <div class="strategy-section">
                                <h4>💡 Estrategia del oponente</h4>
                                <p class="strategy-text">${deck.strategy}</p>
                            </div>
                        ` : ''}

                        ${deck.weakness ? `
                            <div class="weakness-section">
                                <h4>⚠️ Cómo contrarrestarlo</h4>
                                <p class="weakness-text">${deck.weakness}</p>
                            </div>
                        ` : ''}

                        ${this.state.expectedCards.length > 0 ? `
                            <div class="expected-cards-section">
                                <h4>🔮 Cartas esperadas</h4>
                                <div class="expected-cards-grid">
                                    ${this.state.expectedCards.map(card => `
                                        <div class="expected-card">
                                            <span class="card-name">${card.name}</span>
                                            <span class="probability">${(card.probability * 100).toFixed(0)}%</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <div class="deck-list-section">
                        <div class="section-header">
                            <h4>📋 Lista del mazo</h4>
                            <button class="btn btn-sm btn-secondary" id="toggle-deck-list">
                                ${this.state.isLoadingDeckList ? '⏳ Cargando...' : '👁️ Ver/Ocultar'}
                            </button>
                        </div>

                        ${this.state.deckList && !this.state.isLoadingDeckList ? `
                            <div class="deck-list" id="deck-list-content">
                                ${this.getDeckListTemplate()}
                            </div>
                        ` : ''}
                    </div>

                    ${this.state.playedCards.length > 0 ? `
                        <div class="played-tracking">
                            <h4>📝 Seguimiento de cartas</h4>
                            <div class="played-cards-list">
                                ${this.state.playedCards.map(card => `
                                    <div class="played-card ${card.expected ? 'expected' : 'unexpected'}">
                                        <span class="card-name">${card.name}</span>
                                        <span class="card-turn">T${card.turn}</span>
                                        <span class="card-status">
                                            ${card.expected ? '✅ Esperada' : '⚠️ Inesperada'}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="deck-actions">
                    <button class="btn btn-secondary" id="unconfirm-deck">
                        ↩️ Volver a predicciones
                    </button>
                    <button class="btn btn-primary" id="export-deck">
                        📤 Exportar lista
                    </button>
                    <button class="btn btn-secondary" id="view-details">
                        📊 Ver análisis completo
                    </button>
                </div>
            </div>
        `;
    }

    getDeckListTemplate() {
        if (!this.state.deckList) return '';

        return `
            <div class="mainboard">
                <h5>Mainboard (${this.state.deckList.cardCount || 60} cartas)</h5>
                <div class="card-categories">
                    ${this.getCategorizedCards(this.state.deckList.mainboard)}
                </div>
            </div>

            ${this.state.deckList.sideboard && this.state.deckList.sideboard.length > 0 ? `
                <div class="sideboard">
                    <h5>Sideboard (${this.state.deckList.sideboard.length} cartas)</h5>
                    <div class="card-list">
                        ${this.state.deckList.sideboard.map(card => `
                            <div class="card-entry">
                                <span class="quantity">${card.quantity || 1}x</span>
                                <span class="name">${card.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    getCategorizedCards(cards) {
        if (!cards || cards.length === 0) return '<p>No hay lista disponible</p>';

        // Categorizar cartas por tipo
        const categories = {
            creatures: [],
            spells: [],
            lands: [],
            others: []
        };

        cards.forEach(card => {
            const type = (card.type || '').toLowerCase();
            if (type.includes('creature')) {
                categories.creatures.push(card);
            } else if (type.includes('land')) {
                categories.lands.push(card);
            } else if (type.includes('instant') || type.includes('sorcery')) {
                categories.spells.push(card);
            } else {
                categories.others.push(card);
            }
        });

        return Object.entries(categories)
            .filter(([_, cards]) => cards.length > 0)
            .map(([category, cards]) => `
                <div class="card-category">
                    <h6 class="category-title">${this.getCategoryTitle(category)} (${cards.length})</h6>
                    <div class="card-list">
                        ${cards.map(card => `
                            <div class="card-entry">
                                <span class="quantity">${card.quantity || 1}x</span>
                                <span class="name">${card.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
    }

    getCategoryTitle(category) {
        const titles = {
            creatures: '👹 Criaturas',
            spells: '⚡ Hechizos',
            lands: '🏔️ Tierras',
            others: '🔮 Otros'
        };
        return titles[category] || category;
    }

    setupEventListeners() {
        // Toggle deck list
        const toggleBtn = this.$('#toggle-deck-list');
        if (toggleBtn) {
            this.addEventListener(toggleBtn, 'click', () => {
                this.toggleDeckList();
            });
        }

        // Unconfirm deck
        const unconfirmBtn = this.$('#unconfirm-deck');
        if (unconfirmBtn) {
            this.addEventListener(unconfirmBtn, 'click', () => {
                this.unconfirmDeck();
            });
        }

        // Export deck
        const exportBtn = this.$('#export-deck');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => {
                this.exportDeck();
            });
        }

        // View details
        const detailsBtn = this.$('#view-details');
        if (detailsBtn) {
            this.addEventListener(detailsBtn, 'click', () => {
                this.viewDetailedAnalysis();
            });
        }
    }

    async loadFullDeckList(deck) {
        try {
            // Simular carga de lista completa
            // En implementación real, esto consultaría la base de datos o API
            
            await new Promise(resolve => setTimeout(resolve, 1000));

            const fullDeckList = {
                ...deck,
                cardCount: deck.mainboard?.reduce((sum, card) => sum + (card.quantity || 1), 0) || 60
            };

            this.setState({
                deckList: fullDeckList,
                isLoadingDeckList: false,
                expectedCards: this.calculateExpectedCards(deck)
            });

        } catch (error) {
            this.logError('Error cargando lista completa:', error);
            this.setState({ isLoadingDeckList: false });
        }
    }

    calculateExpectedCards(deck) {
        // Calcular cartas que probablemente aún no se han jugado
        const expected = [];
        
        if (deck.keyCards) {
            deck.keyCards.forEach(card => {
                if (card.probability > 0.7) {
                    expected.push({
                        name: card.name,
                        probability: card.probability,
                        role: card.role
                    });
                }
            });
        }

        return expected.slice(0, 6); // Top 6 cartas esperadas
    }

    updatePlayedCards(cardData) {
        const playedCards = [...this.state.playedCards, cardData];
        this.setState({ playedCards });
    }

    toggleDeckList() {
        const content = this.$('#deck-list-content');
        if (content) {
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        }
    }

    unconfirmDeck() {
        this.setState({
            confirmedDeck: null,
            deckList: null,
            expectedCards: [],
            playedCards: []
        });
        
        this.eventBus.emit('deck:unconfirmed');
        this.eventBus.emit('ui:view-change-requested', { view: 'prediction' });
    }

    exportDeck() {
        if (!this.state.deckList) return;

        const deckText = this.generateDeckText();
        this.copyToClipboard(deckText);
        
        this.dependencies.uiService.showNotification({
            type: 'success',
            title: 'Lista exportada',
            message: 'Lista del mazo copiada al portapapeles',
            duration: 3000
        });
    }

    generateDeckText() {
        const deck = this.state.deckList;
        let text = `// ${deck.name}\n\n`;

        if (deck.mainboard && deck.mainboard.length > 0) {
            text += 'Mainboard:\n';
            deck.mainboard.forEach(card => {
                text += `${card.quantity || 1}x ${card.name}\n`;
            });
        }

        if (deck.sideboard && deck.sideboard.length > 0) {
            text += '\nSideboard:\n';
            deck.sideboard.forEach(card => {
                text += `${card.quantity || 1}x ${card.name}\n`;
            });
        }

        return text;
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            this.logError('Error copiando al portapapeles:', error);
        }
    }

    viewDetailedAnalysis() {
        this.eventBus.emit('ui:view-change-requested', { view: 'debug' });
    }

    shouldRerender(prevState, newState) {
        return prevState.confirmedDeck !== newState.confirmedDeck ||
               prevState.deckList !== newState.deckList ||
               prevState.playedCards.length !== newState.playedCards.length;
    }
}

// Exportar componentes
export { 
    BaseComponent, 
    CardInputComponent, 
    PredictionsComponent, 
    ConfirmedDeckComponent 
};