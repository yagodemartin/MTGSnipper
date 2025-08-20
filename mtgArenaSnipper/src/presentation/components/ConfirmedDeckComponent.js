// src/presentation/components/ui/ConfirmedDeckComponent.js
// 🎯 Componente de mazo confirmado VISUAL con todas las cartas e imágenes

import BaseComponent from './BaseComponent.js';

class ConfirmedDeckComponent extends BaseComponent {
    constructor(eventBus, uiService) {
        super(eventBus, { uiService });
        
        this.state = {
            confirmedDeck: null,
            playedCards: [],
            showDeckList: true,
            viewMode: 'visual', // 'visual' | 'list'
            filterType: 'all', // 'all' | 'mainboard' | 'sideboard' | 'played'
            searchQuery: '',
            expectedCards: [],
            isLoadingExpected: false
        };
    }

    async onInitialize() {
        this.eventBus.on('deck:confirmed', (data) => {
            this.setState({
                confirmedDeck: data,
                showDeckList: true
            });
            this.loadExpectedCards(data.deck);
        });

        this.eventBus.on('card:played:confirmed', (data) => {
            this.updatePlayedCards(data);
        });

        this.eventBus.on('game:reset', () => {
            this.setState({
                confirmedDeck: null,
                playedCards: [],
                showDeckList: true,
                expectedCards: []
            });
        });
    }

    getTemplate() {
        if (!this.state.confirmedDeck) {
            return this.getEmptyStateTemplate();
        }

        const deck = this.state.confirmedDeck.deck;
        const probability = (this.state.confirmedDeck.probability * 100).toFixed(1);

        return `
            <div class="confirmed-deck-component">
                <!-- Header del mazo confirmado -->
                <div class="confirmed-deck-header">
                    <div class="deck-confirmation-badge">
                        <span class="confirmation-icon">🎯</span>
                        <div class="confirmation-info">
                            <h2>Mazo Confirmado</h2>
                            <div class="confirmation-probability">
                                <span class="probability-value">${probability}% de certeza</span>
                                <span class="confirmation-status">✅ Identificado</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="deck-image-section">
                        ${deck.deckImage ? `
                            <img src="${deck.deckImage}" 
                                 alt="${deck.name}"
                                 class="confirmed-deck-image"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="deck-image-fallback" style="display: none;">🃏</div>
                        ` : `
                            <div class="deck-image-fallback">🃏</div>
                        `}
                    </div>
                </div>

                <!-- Información principal del mazo -->
                <div class="deck-main-info">
                    <h1 class="deck-name">${deck.name}</h1>
                    <div class="deck-meta-stats">
                        <div class="meta-stat">
                            <span class="stat-icon">📊</span>
                            <span class="stat-label">Meta Share:</span>
                            <span class="stat-value">${(deck.metaShare || 0).toFixed(1)}%</span>
                        </div>
                        <div class="meta-stat">
                            <span class="stat-icon">🏗️</span>
                            <span class="stat-label">Arquetipo:</span>
                            <span class="stat-value">${deck.archetype || 'Unknown'}</span>
                        </div>
                        <div class="meta-stat">
                            <span class="stat-icon">🎨</span>
                            <span class="stat-label">Colores:</span>
                            <span class="stat-value">
                                ${(deck.colors || []).map(color => `
                                    <span class="mana-symbol mana-${color}">${color}</span>
                                `).join('') || 'Sin colores'}
                            </span>
                        </div>
                        <div class="meta-stat">
                            <span class="stat-icon">🃏</span>
                            <span class="stat-label">Total cartas:</span>
                            <span class="stat-value">${deck.cardCount || 60}</span>
                        </div>
                    </div>
                </div>

                <!-- Información estratégica -->
                <div class="deck-strategy-section">
                    ${deck.strategy ? `
                        <div class="strategy-card">
                            <h3>💡 Estrategia del Oponente</h3>
                            <p class="strategy-text">${deck.strategy}</p>
                        </div>
                    ` : ''}

                    ${deck.weakness ? `
                        <div class="weakness-card">
                            <h3>⚠️ Cómo Contrarrestarlo</h3>
                            <p class="weakness-text">${deck.weakness}</p>
                        </div>
                    ` : ''}
                </div>

                <!-- Cartas esperadas vs jugadas -->
                <div class="cards-tracking-section">
                    <div class="tracking-header">
                        <h3>📝 Seguimiento de Cartas</h3>
                        <div class="tracking-stats">
                            <span class="played-count">Jugadas: ${this.state.playedCards.length}</span>
                            <span class="expected-count">Esperadas: ${this.state.expectedCards.length}</span>
                        </div>
                    </div>

                    ${this.state.playedCards.length > 0 ? `
                        <div class="played-cards-grid">
                            ${this.state.playedCards.map(card => `
                                <div class="played-card-item ${card.expected ? 'expected' : 'unexpected'}">
                                    <div class="played-card-image">
                                        ${card.imageUrl ? `
                                            <img src="${card.imageUrl}" 
                                                 alt="${card.name}"
                                                 class="card-thumbnail"
                                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                            <div class="card-thumbnail-fallback" style="display: none;">🃏</div>
                                        ` : `
                                            <div class="card-thumbnail-fallback">🃏</div>
                                        `}
                                    </div>
                                    <div class="played-card-info">
                                        <span class="card-name">${card.name}</span>
                                        <span class="card-turn">Turno ${card.turn}</span>
                                        <span class="card-status">
                                            ${card.expected ? '✅ Esperada' : '⚠️ Inesperada'}
                                        </span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="no-played-cards">
                            <p>📋 Las cartas jugadas aparecerán aquí conforme se añadan</p>
                        </div>
                    `}
                </div>

                <!-- Lista completa del mazo -->
                <div class="deck-list-section">
                    <div class="deck-list-header">
                        <h3>📋 Lista Completa del Mazo</h3>
                        <div class="deck-list-controls">
                            <div class="view-mode-toggles">
                                <button class="view-toggle ${this.state.viewMode === 'visual' ? 'active' : ''}" 
                                        data-mode="visual">
                                    🖼️ Visual
                                </button>
                                <button class="view-toggle ${this.state.viewMode === 'list' ? 'active' : ''}" 
                                        data-mode="list">
                                    📝 Lista
                                </button>
                            </div>
                            
                            <div class="filter-controls">
                                <select id="card-filter" class="card-filter">
                                    <option value="all">Todas las cartas</option>
                                    <option value="mainboard">Solo Mainboard</option>
                                    <option value="sideboard">Solo Sideboard</option>
                                    <option value="played">Solo Jugadas</option>
                                </select>
                            </div>
                            
                            <div class="search-controls">
                                <input type="text" 
                                       id="card-search" 
                                       placeholder="Buscar carta..."
                                       value="${this.state.searchQuery}"
                                       class="card-search">
                            </div>
                        </div>
                    </div>

                    ${this.state.showDeckList ? this.getDeckListTemplate() : ''}
                </div>

                <!-- Acciones -->
                <div class="confirmed-deck-actions">
                    <button class="btn btn-secondary" id="unconfirm-deck">
                        ↩️ Volver a Predicciones
                    </button>
                    <button class="btn btn-primary" id="export-deck">
                        📤 Exportar Lista
                    </button>
                    <button class="btn btn-secondary" id="view-analysis">
                        📊 Ver Análisis Completo
                    </button>
                    <button class="btn btn-secondary" id="new-game">
                        🎮 Nueva Partida
                    </button>
                </div>
            </div>
        `;
    }

    getEmptyStateTemplate() {
        return `
            <div class="confirmed-deck-component empty">
                <div class="empty-content">
                    <div class="empty-icon">🎯</div>
                    <h3>No hay mazo confirmado</h3>
                    <p>Cuando se identifique un mazo con <strong>85% de certeza</strong> o se confirme manualmente, aparecerá aquí toda la información completa.</p>
                    
                    <div class="empty-tips">
                        <h4>🔍 Proceso de identificación:</h4>
                        <ol>
                            <li>📝 Añade cartas del oponente</li>
                            <li>🎯 El sistema busca coincidencias en el meta</li>
                            <li>📊 Al 85% de certeza → confirmación automática</li>
                            <li>📋 Muestra toda la lista del mazo</li>
                        </ol>
                    </div>
                </div>
            </div>
        `;
    }

    getDeckListTemplate() {
        const deck = this.state.confirmedDeck.deck;
        const filteredCards = this.getFilteredCards();

        if (this.state.viewMode === 'visual') {
            return this.getVisualDeckList(filteredCards);
        } else {
            return this.getTextDeckList(filteredCards);
        }
    }

    getVisualDeckList(filteredCards) {
        return `
            <div class="deck-list-visual">
                <div class="cards-count">
                    Mostrando ${filteredCards.length} cartas
                </div>
                
                <div class="visual-cards-grid">
                    ${filteredCards.map(card => `
                        <div class="visual-card-item ${this.isCardPlayed(card.name) ? 'played' : ''}">
                            <div class="visual-card-image">
                                ${card.imageUrl ? `
                                    <img src="${card.imageUrl}" 
                                         alt="${card.name}"
                                         class="deck-card-image"
                                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                    <div class="deck-card-image-fallback" style="display: none;">
                                        <span>🃏</span>
                                        <span class="fallback-name">${card.name}</span>
                                    </div>
                                ` : `
                                    <div class="deck-card-image-fallback">
                                        <span>🃏</span>
                                        <span class="fallback-name">${card.name}</span>
                                    </div>
                                `}
                            </div>
                            
                            <div class="visual-card-info">
                                <div class="card-quantity">${card.quantity}x</div>
                                <div class="card-name">${card.name}</div>
                                ${this.isCardPlayed(card.name) ? `
                                    <div class="played-indicator">✅ Jugada</div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getTextDeckList(filteredCards) {
        const deck = this.state.confirmedDeck.deck;
        const mainboardCards = filteredCards.filter(card => card.section === 'mainboard');
        const sideboardCards = filteredCards.filter(card => card.section === 'sideboard');

        return `
            <div class="deck-list-text">
                ${mainboardCards.length > 0 ? `
                    <div class="text-section">
                        <h4>🃏 Mainboard (${mainboardCards.length} cartas)</h4>
                        <div class="text-cards-list">
                            ${mainboardCards.map(card => `
                                <div class="text-card-item ${this.isCardPlayed(card.name) ? 'played' : ''}">
                                    <span class="card-quantity">${card.quantity}x</span>
                                    <span class="card-name">${card.name}</span>
                                    ${this.isCardPlayed(card.name) ? `
                                        <span class="played-indicator">✅</span>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${sideboardCards.length > 0 ? `
                    <div class="text-section">
                        <h4>📦 Sideboard (${sideboardCards.length} cartas)</h4>
                        <div class="text-cards-list">
                            ${sideboardCards.map(card => `
                                <div class="text-card-item">
                                    <span class="card-quantity">${card.quantity}x</span>
                                    <span class="card-name">${card.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${filteredCards.length === 0 ? `
                    <div class="no-cards-message">
                        <p>📋 No hay cartas que coincidan con los filtros aplicados</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getFilteredCards() {
        const deck = this.state.confirmedDeck.deck;
        let allCards = [];

        // Combinar mainboard y sideboard
        if (deck.mainboard) {
            allCards.push(...deck.mainboard.map(card => ({ ...card, section: 'mainboard' })));
        }
        if (deck.sideboard) {
            allCards.push(...deck.sideboard.map(card => ({ ...card, section: 'sideboard' })));
        }

        // Aplicar filtros
        let filteredCards = allCards;

        // Filtro por tipo
        if (this.state.filterType !== 'all') {
            if (this.state.filterType === 'played') {
                filteredCards = filteredCards.filter(card => this.isCardPlayed(card.name));
            } else {
                filteredCards = filteredCards.filter(card => card.section === this.state.filterType);
            }
        }

        // Filtro por búsqueda
        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            filteredCards = filteredCards.filter(card => 
                card.name.toLowerCase().includes(query)
            );
        }

        return filteredCards;
    }

    setupEventListeners() {
        // Toggles de modo de vista
        this.$$('.view-toggle').forEach(toggle => {
            this.addEventListener(toggle, 'click', (e) => {
                const mode = e.target.getAttribute('data-mode');
                this.setState({ viewMode: mode });
            });
        });

        // Filtro de tipo de cartas
        const cardFilter = this.$('#card-filter');
        if (cardFilter) {
            this.addEventListener(cardFilter, 'change', (e) => {
                this.setState({ filterType: e.target.value });
            });
        }

        // Búsqueda de cartas
        const cardSearch = this.$('#card-search');
        if (cardSearch) {
            this.addEventListener(cardSearch, 'input', (e) => {
                this.setState({ searchQuery: e.target.value });
            });
        }

        // Acciones principales
        const unconfirmBtn = this.$('#unconfirm-deck');
        if (unconfirmBtn) {
            this.addEventListener(unconfirmBtn, 'click', () => {
                this.unconfirmDeck();
            });
        }

        const exportBtn = this.$('#export-deck');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => {
                this.exportDeck();
            });
        }

        const analysisBtn = this.$('#view-analysis');
        if (analysisBtn) {
            this.addEventListener(analysisBtn, 'click', () => {
                this.viewDetailedAnalysis();
            });
        }

        const newGameBtn = this.$('#new-game');
        if (newGameBtn) {
            this.addEventListener(newGameBtn, 'click', () => {
                this.startNewGame();
            });
        }
    }

    async loadExpectedCards(deck) {
        this.setState({ isLoadingExpected: true });
        
        try {
            // Identificar cartas que aún no se han jugado pero que son probables
            const expectedCards = [];
            
            if (deck.keyCards) {
                deck.keyCards.forEach(card => {
                    if (!this.isCardPlayed(card.name) && card.probability > 0.7) {
                        expectedCards.push({
                            name: card.name,
                            probability: card.probability,
                            imageUrl: card.imageUrl,
                            role: card.role
                        });
                    }
                });
            }

            this.setState({ 
                expectedCards: expectedCards.slice(0, 6), // Top 6 esperadas
                isLoadingExpected: false 
            });

        } catch (error) {
            this.logError('Error cargando cartas esperadas:', error);
            this.setState({ isLoadingExpected: false });
        }
    }

    updatePlayedCards(cardData) {
        const playedCards = [...this.state.playedCards, cardData];
        this.setState({ playedCards });
    }

    isCardPlayed(cardName) {
        return this.state.playedCards.some(played => 
            played.name.toLowerCase() === cardName.toLowerCase()
        );
    }

    unconfirmDeck() {
        this.setState({
            confirmedDeck: null,
            playedCards: [],
            expectedCards: [],
            showDeckList: true
        });
        
        this.eventBus.emit('deck:unconfirmed');
        this.eventBus.emit('ui:view-change-requested', { view: 'prediction' });
    }

    exportDeck() {
        if (!this.state.confirmedDeck) {
            this.showError('No hay mazo confirmado para exportar');
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
        const deck = this.state.confirmedDeck.deck;
        let text = `// ${deck.name}\n`;
        text += `// Meta Share: ${(deck.metaShare || 0).toFixed(1)}%\n`;
        text += `// Arquetipo: ${deck.archetype}\n\n`;

        if (deck.mainboard && deck.mainboard.length > 0) {
            text += 'Mainboard:\n';
            deck.mainboard.forEach(card => {
                const played = this.isCardPlayed(card.name) ? ' // ✅ Jugada' : '';
                text += `${card.quantity}x ${card.name}${played}\n`;
            });
        }

        if (deck.sideboard && deck.sideboard.length > 0) {
            text += '\nSideboard:\n';
            deck.sideboard.forEach(card => {
                text += `${card.quantity}x ${card.name}\n`;
            });
        }

        return text;
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            this.logError('Error copiando al portapapeles:', error);
            
            // Fallback
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

    startNewGame() {
        if (confirm('¿Estás seguro de que quieres reiniciar para una nueva partida?')) {
            this.eventBus.emit('game:reset');
            this.eventBus.emit('ui:view-change-requested', { view: 'prediction' });
        }
    }

    showError(message) {
        this.dependencies.uiService.showNotification({
            type: 'error',
            message: message,
            duration: 3000
        });
    }

    shouldRerender(prevState, newState) {
        return prevState.confirmedDeck !== newState.confirmedDeck ||
               prevState.playedCards.length !== newState.playedCards.length ||
               prevState.showDeckList !== newState.showDeckList ||
               prevState.viewMode !== newState.viewMode ||
               prevState.filterType !== newState.filterType ||
               prevState.searchQuery !== newState.searchQuery ||
               prevState.expectedCards.length !== newState.expectedCards.length;
    }
}

export default ConfirmedDeckComponent;