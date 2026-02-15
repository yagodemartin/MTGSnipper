// src/presentation/components/ui/PredictionsComponent.js
// 📊 Componente de predicciones de mazos

import BaseComponent from './BaseComponent.js';

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
    this.log('🎯 Inicializando PredictionsComponent...');
    
    this.eventBus.on('deck:prediction:updated', (data) => {
        this.log(`📊 RECIBIDO: ${data.predictions?.length || 0} predicciones`);
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
    
    this.log('✅ PredictionsComponent listeners configurados');
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
                    ${prediction.matchedCards && prediction.matchedCards.length > 0 ? `
                        <div class="matched-cards">
                            <strong>🔑 Cartas detectadas:</strong>
                            ${prediction.matchedCards.map(card => `
                                <span class="matched-card ${card.type}">
                                    ${card.card} <small>(+${card.score?.toFixed(0) || 0})</small>
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
        this.$$('.confirm-deck-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const deckId = e.target.getAttribute('data-deck-id');
                this.confirmDeck(deckId);
            });
        });

        // Botones de ver lista completa
        this.$$('.view-deck-btn').forEach(btn => {
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

export default PredictionsComponent;