// src/presentation/components/ui/ConfirmedDeckComponent.js
// 🎯 Componente de mazo confirmado

import BaseComponent from './BaseComponent.js';

class ConfirmedDeckComponent extends BaseComponent {
    constructor(eventBus, uiService) {
        super(eventBus, { uiService });
        
        this.state = {
            confirmedDeck: null,
            deckList: null,
            expectedCards: [],
            playedCards: [],
            isLoadingDeckList: false,
            showDeckList: false
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
                playedCards: [],
                showDeckList: false
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
                            <span class="meta-share">📊 ${deck.metaShare?.toFixed(1) || 0}% del meta</span>
                            <span class="archetype">🏗️ ${deck.archetype || 'Unknown'}</span>
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
                                ${this.state.isLoadingDeckList ? '⏳ Cargando...' : this.state.showDeckList ? '🙈 Ocultar' : '👁️ Mostrar'}
                            </button>
                        </div>

                        ${this.state.deckList && !this.state.isLoadingDeckList && this.state.showDeckList ? `
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
        if (!this.state.deckList) return '<p>No hay datos de lista disponibles</p>';

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
        if (!cards || cards.length === 0) {
            return '<p>📝 Lista completa no disponible - mostrando cartas clave detectadas</p>';
        }

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
            .filter(([_, categoryCards]) => categoryCards.length > 0)
            .map(([category, categoryCards]) => `
                <div class="card-category">
                    <h6 class="category-title">${this.getCategoryTitle(category)} (${categoryCards.length})</h6>
                    <div class="card-list">
                        ${categoryCards.map(card => `
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
                if (card.probability && card.probability > 0.7) {
                    expected.push({
                        name: card.name,
                        probability: card.probability,
                        role: card.role || 'unknown'
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
        this.setState({ 
            showDeckList: !this.state.showDeckList 
        });
    }

    unconfirmDeck() {
        this.setState({
            confirmedDeck: null,
            deckList: null,
            expectedCards: [],
            playedCards: [],
            showDeckList: false
        });
        
        this.eventBus.emit('deck:unconfirmed');
        this.eventBus.emit('ui:view-change-requested', { view: 'prediction' });
    }

    exportDeck() {
        if (!this.state.deckList) {
            this.dependencies.uiService.showNotification({
                type: 'warning',
                title: 'Sin lista',
                message: 'No hay lista completa disponible para exportar',
                duration: 3000
            });
            return;
        }

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
            
            // Fallback para navegadores que no soportan clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }

    viewDetailedAnalysis() {
        this.eventBus.emit('ui:view-change-requested', { view: 'debug' });
    }

    shouldRerender(prevState, newState) {
        return prevState.confirmedDeck !== newState.confirmedDeck ||
               prevState.deckList !== newState.deckList ||
               prevState.playedCards.length !== newState.playedCards.length ||
               prevState.showDeckList !== newState.showDeckList ||
               prevState.isLoadingDeckList !== newState.isLoadingDeckList;
    }
}

export default ConfirmedDeckComponent;