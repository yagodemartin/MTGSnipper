// src/presentation/components/DeckDetailComponent.js
// 📋 Componente detalle de mazo meta con información completa

import BaseComponent from './BaseComponent.js';

class DeckDetailComponent extends BaseComponent {
    constructor(eventBus, dependencies) {
        super(eventBus, dependencies);
        
        this.state = {
            currentDeck: null,
            isLoading: false,
            activeTab: 'overview', // overview, decklist, analysis, matchups
            viewMode: 'visual', // visual, text
            filterType: 'all',
            showSideboard: false,
            cardImages: {},
            error: null
        };

        this.tabs = {
            overview: { label: '📊 Resumen', icon: '📊' },
            decklist: { label: '🃏 Lista', icon: '🃏' },
            analysis: { label: '📈 Análisis', icon: '📈' },
            matchups: { label: '⚔️ Matchups', icon: '⚔️' }
        };
    }

    async onInitialize() {
        // Escuchar solicitudes de mostrar detalle de mazo
        this.eventBus.on('ui:show-deck-detail', async (data) => {
            await this.loadDeckDetail(data.deckId);
        });
        
        this.log('📋 DeckDetailComponent inicializado');
    }

    async loadDeckDetail(deckId) {
        try {
            this.setState({ isLoading: true, error: null });
            
            const metaData = await this.dependencies.databaseManager?.getMetaData();
            
            if (metaData && metaData.decks) {
                const deck = metaData.decks.find(d => d.id === deckId);
                
                if (deck) {
                    this.setState({ 
                        currentDeck: deck,
                        isLoading: false
                    });
                    
                    // Cargar imágenes de cartas asíncronamente
                    this.loadCardImages(deck);
                    
                    this.log(`📋 Cargado detalle del mazo: ${deck.name}`);
                } else {
                    throw new Error(`Mazo no encontrado: ${deckId}`);
                }
            } else {
                throw new Error('No hay datos de mazos disponibles');
            }
        } catch (error) {
            this.logError('Error cargando detalle del mazo:', error);
            this.setState({ 
                error: error.message,
                isLoading: false,
                currentDeck: null
            });
        }
    }

    async loadCardImages(deck) {
        if (!deck.mainboard) return;
        
        const cardImages = { ...this.state.cardImages };
        const cardsToLoad = deck.mainboard.slice(0, 20); // Limitar a 20 para rendimiento
        
        for (const card of cardsToLoad) {
            if (!cardImages[card.name]) {
                try {
                    const imageUrl = await this.getCardImage(card.name);
                    cardImages[card.name] = imageUrl;
                } catch (error) {
                    cardImages[card.name] = null;
                }
            }
        }
        
        this.setState({ cardImages });
    }

    async getCardImage(cardName) {
        try {
            const response = await fetch(
                `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
            );
            
            if (response.ok) {
                const data = await response.json();
                return data.image_uris?.normal || null;
            }
        } catch (error) {
            this.log(`⚠️ No se pudo cargar imagen para: ${cardName}`);
        }
        
        return null;
    }

    getTemplate() {
        if (this.state.isLoading) {
            return this.getLoadingTemplate();
        }
        
        if (this.state.error) {
            return this.getErrorTemplate();
        }
        
        if (!this.state.currentDeck) {
            return this.getEmptyTemplate();
        }

        const deck = this.state.currentDeck;

        return `
            <div class="deck-detail-component">
                <div class="deck-detail-header">
                    <div class="header-main">
                        <button id="back-to-browser" class="btn btn-sm btn-secondary">
                            ← Volver al navegador
                        </button>
                        
                        <div class="deck-title-section">
                            <h2 class="deck-title">${deck.name}</h2>
                            <div class="deck-subtitle">${deck.subtitle || ''}</div>
                        </div>
                        
                        <div class="deck-actions">
                            <button id="test-this-deck" class="btn btn-primary" data-deck-id="${deck.id}">
                                🧪 Probar Mazo
                            </button>
                            <button id="copy-decklist" class="btn btn-secondary">
                                📋 Copiar Lista
                            </button>
                            <button id="export-deck" class="btn btn-secondary">
                                📤 Exportar
                            </button>
                        </div>
                    </div>
                    
                    <div class="deck-meta-info">
                        <div class="meta-stats">
                            <div class="stat-item">
                                <span class="stat-label">Rank Meta</span>
                                <span class="stat-value">#${deck.rank || '?'}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Meta Share</span>
                                <span class="stat-value">${(deck.metaShare || 0).toFixed(1)}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Arquetipo</span>
                                <span class="stat-value">${deck.archetype || 'N/A'}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Colores</span>
                                <span class="stat-value">${this.formatColors(deck.colors)}</span>
                            </div>
                        </div>
                        
                        <div class="deck-image-large">
                            ${deck.imageUrl ? `
                                <img src="${deck.imageUrl}" alt="${deck.name}" class="deck-hero-image">
                            ` : `
                                <div class="deck-hero-placeholder">
                                    <span class="hero-icon">🃏</span>
                                    <span class="hero-text">${deck.name}</span>
                                </div>
                            `}
                        </div>
                    </div>
                </div>

                <div class="deck-detail-tabs">
                    ${Object.entries(this.tabs).map(([key, tab]) => `
                        <button class="detail-tab ${this.state.activeTab === key ? 'active' : ''}" 
                                data-tab="${key}">
                            ${tab.icon} ${tab.label}
                        </button>
                    `).join('')}
                </div>

                <div class="deck-detail-content">
                    ${this.getTabContent()}
                </div>
            </div>
        `;
    }

    getTabContent() {
        switch (this.state.activeTab) {
            case 'overview': return this.getOverviewTab();
            case 'decklist': return this.getDecklistTab();
            case 'analysis': return this.getAnalysisTab();
            case 'matchups': return this.getMatchupsTab();
            default: return '<div>Tab not found</div>';
        }
    }

    getOverviewTab() {
        const deck = this.state.currentDeck;
        
        return `
            <div class="overview-tab">
                <div class="overview-grid">
                    <div class="overview-section">
                        <h4>📊 Estadísticas</h4>
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-number">${deck.mainboard?.length || 0}</div>
                                <div class="stat-label">Cartas Mainboard</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number">${deck.sideboard?.length || 0}</div>
                                <div class="stat-label">Cartas Sideboard</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number">${deck.keyCards?.length || 0}</div>
                                <div class="stat-label">Cartas Clave</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number">${this.calculateAverageCMC(deck)}</div>
                                <div class="stat-label">CMC Promedio</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="overview-section">
                        <h4>🎯 Cartas Clave</h4>
                        <div class="key-cards-preview">
                            ${deck.keyCards ? deck.keyCards.slice(0, 6).map(card => `
                                <div class="key-card-item">
                                    <div class="key-card-image">
                                        ${this.state.cardImages[card.name] ? `
                                            <img src="${this.state.cardImages[card.name]}" 
                                                 alt="${card.name}" 
                                                 class="card-thumb">
                                        ` : `
                                            <div class="card-thumb-placeholder">🃏</div>
                                        `}
                                    </div>
                                    <div class="key-card-info">
                                        <div class="card-name">${card.name}</div>
                                        <div class="card-weight">Peso: ${card.weight || 0}</div>
                                    </div>
                                </div>
                            `).join('') : '<div class="no-key-cards">No hay cartas clave definidas</div>'}
                        </div>
                    </div>
                    
                    <div class="overview-section full-width">
                        <h4>📈 Curva de Maná</h4>
                        <div class="mana-curve">
                            ${this.getManaCurveChart(deck)}
                        </div>
                    </div>
                    
                    ${deck.strategy ? `
                        <div class="overview-section full-width">
                            <h4>🎯 Estrategia</h4>
                            <div class="strategy-description">
                                ${deck.strategy}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getDecklistTab() {
        const deck = this.state.currentDeck;
        
        return `
            <div class="decklist-tab">
                <div class="decklist-controls">
                    <div class="view-mode-selector">
                        <button id="visual-mode" class="btn btn-sm ${this.state.viewMode === 'visual' ? 'active' : ''}">
                            🖼️ Visual
                        </button>
                        <button id="text-mode" class="btn btn-sm ${this.state.viewMode === 'text' ? 'active' : ''}">
                            📝 Texto
                        </button>
                    </div>
                    
                    <div class="filter-controls">
                        <select id="filter-type" class="type-filter">
                            <option value="all">Todos los tipos</option>
                            <option value="creature">Criaturas</option>
                            <option value="instant">Instantáneos</option>
                            <option value="sorcery">Conjuros</option>
                            <option value="artifact">Artefactos</option>
                            <option value="enchantment">Encantamientos</option>
                            <option value="planeswalker">Planeswalkers</option>
                            <option value="land">Tierras</option>
                        </select>
                        
                        <label class="sideboard-toggle">
                            <input type="checkbox" id="show-sideboard" ${this.state.showSideboard ? 'checked' : ''}>
                            Mostrar Sideboard
                        </label>
                    </div>
                </div>
                
                <div class="decklist-content">
                    ${this.state.viewMode === 'visual' ? 
                        this.getVisualDecklist(deck) : 
                        this.getTextDecklist(deck)}
                </div>
            </div>
        `;
    }

    getVisualDecklist(deck) {
        const mainboard = this.filterCards(deck.mainboard || []);
        const sideboard = this.state.showSideboard ? (deck.sideboard || []) : [];
        
        return `
            <div class="visual-decklist">
                <div class="mainboard-section">
                    <h4>📦 Mainboard (${mainboard.length} cartas)</h4>
                    <div class="cards-visual-grid">
                        ${mainboard.map(card => `
                            <div class="visual-card-item" data-card="${card.name}">
                                <div class="card-image-container">
                                    ${this.state.cardImages[card.name] ? `
                                        <img src="${this.state.cardImages[card.name]}" 
                                             alt="${card.name}" 
                                             class="card-visual">
                                    ` : `
                                        <div class="card-visual-placeholder">
                                            <div class="placeholder-icon">🃏</div>
                                            <div class="placeholder-name">${card.name}</div>
                                        </div>
                                    `}
                                    
                                    <div class="card-quantity-badge">${card.quantity || 1}</div>
                                </div>
                                
                                <div class="card-info-hover">
                                    <div class="card-name">${card.name}</div>
                                    <div class="card-details">${card.type || ''} • ${card.manaCost || ''}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${this.state.showSideboard && sideboard.length > 0 ? `
                    <div class="sideboard-section">
                        <h4>🔄 Sideboard (${sideboard.length} cartas)</h4>
                        <div class="cards-visual-grid">
                            ${sideboard.map(card => `
                                <div class="visual-card-item sideboard" data-card="${card.name}">
                                    <div class="card-image-container">
                                        ${this.state.cardImages[card.name] ? `
                                            <img src="${this.state.cardImages[card.name]}" 
                                                 alt="${card.name}" 
                                                 class="card-visual">
                                        ` : `
                                            <div class="card-visual-placeholder">
                                                <div class="placeholder-icon">🃏</div>
                                                <div class="placeholder-name">${card.name}</div>
                                            </div>
                                        `}
                                        
                                        <div class="card-quantity-badge">${card.quantity || 1}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getTextDecklist(deck) {
        const mainboard = this.filterCards(deck.mainboard || []);
        const sideboard = this.state.showSideboard ? (deck.sideboard || []) : [];
        
        return `
            <div class="text-decklist">
                <div class="mainboard-text">
                    <h4>📦 Mainboard</h4>
                    <div class="text-cards-list">
                        ${mainboard.map(card => `
                            <div class="text-card-line">
                                <span class="quantity">${card.quantity || 1}</span>
                                <span class="card-name">${card.name}</span>
                                <span class="card-type">${card.type || ''}</span>
                                <span class="mana-cost">${card.manaCost || ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${this.state.showSideboard && sideboard.length > 0 ? `
                    <div class="sideboard-text">
                        <h4>🔄 Sideboard</h4>
                        <div class="text-cards-list">
                            ${sideboard.map(card => `
                                <div class="text-card-line">
                                    <span class="quantity">${card.quantity || 1}</span>
                                    <span class="card-name">${card.name}</span>
                                    <span class="card-type">${card.type || ''}</span>
                                    <span class="mana-cost">${card.manaCost || ''}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="decklist-export">
                    <button id="copy-text-list" class="btn btn-secondary">
                        📋 Copiar lista de texto
                    </button>
                </div>
            </div>
        `;
    }

    getAnalysisTab() {
        return `
            <div class="analysis-tab">
                <div class="analysis-coming-soon">
                    <div class="coming-soon-icon">📈</div>
                    <h4>Análisis Detallado</h4>
                    <p>Esta funcionalidad estará disponible en una próxima versión.</p>
                    <ul>
                        <li>🔥 Análisis de curva de maná</li>
                        <li>⚡ Velocidad del mazo</li>
                        <li>🎯 Sinergias principales</li>
                        <li>💰 Costo estimado</li>
                        <li>📊 Estadísticas avanzadas</li>
                    </ul>
                </div>
            </div>
        `;
    }

    getMatchupsTab() {
        return `
            <div class="matchups-tab">
                <div class="matchups-coming-soon">
                    <div class="coming-soon-icon">⚔️</div>
                    <h4>Análisis de Matchups</h4>
                    <p>Esta funcionalidad estará disponible en una próxima versión.</p>
                    <ul>
                        <li>🔥 Matchups favorables</li>
                        <li>❄️ Matchups difíciles</li>
                        <li>⚖️ Matchups parejos</li>
                        <li>🔄 Guías de sideboard</li>
                        <li>📊 Estadísticas de torneos</li>
                    </ul>
                </div>
            </div>
        `;
    }

    getLoadingTemplate() {
        return `
            <div class="deck-detail-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Cargando detalle del mazo...</div>
            </div>
        `;
    }

    getErrorTemplate() {
        return `
            <div class="deck-detail-error">
                <div class="error-icon">❌</div>
                <h4>Error cargando mazo</h4>
                <p>${this.state.error}</p>
                <button id="retry-load" class="btn btn-primary">🔄 Reintentar</button>
                <button id="back-to-browser-error" class="btn btn-secondary">← Volver</button>
            </div>
        `;
    }

    getEmptyTemplate() {
        return `
            <div class="deck-detail-empty">
                <div class="empty-icon">🔍</div>
                <h4>Selecciona un mazo</h4>
                <p>Elige un mazo del navegador para ver su detalle completo.</p>
                <button id="back-to-browser-empty" class="btn btn-primary">🔍 Ir al navegador</button>
            </div>
        `;
    }

    setupEventListeners() {
        // Navegación
        const backBtn = this.$('#back-to-browser');
        if (backBtn) {
            this.addEventListener(backBtn, 'click', () => {
                this.eventBus.emit('ui:view-change-requested', { view: 'meta-browser' });
            });
        }

        // Tabs
        this.$$('.detail-tab').forEach(tab => {
            this.addEventListener(tab, 'click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.setState({ activeTab: tabName });
            });
        });

        // Controles de decklist
        const visualBtn = this.$('#visual-mode');
        if (visualBtn) {
            this.addEventListener(visualBtn, 'click', () => {
                this.setState({ viewMode: 'visual' });
            });
        }

        const textBtn = this.$('#text-mode');
        if (textBtn) {
            this.addEventListener(textBtn, 'click', () => {
                this.setState({ viewMode: 'text' });
            });
        }

        const sideboardToggle = this.$('#show-sideboard');
        if (sideboardToggle) {
            this.addEventListener(sideboardToggle, 'change', (e) => {
                this.setState({ showSideboard: e.target.checked });
            });
        }

        // Acciones del mazo
        const testBtn = this.$('#test-this-deck');
        if (testBtn) {
            this.addEventListener(testBtn, 'click', (e) => {
                const deckId = e.target.getAttribute('data-deck-id');
                this.testDeck(deckId);
            });
        }

        const copyBtn = this.$('#copy-decklist');
        if (copyBtn) {
            this.addEventListener(copyBtn, 'click', () => {
                this.copyDecklist();
            });
        }
    }

    testDeck(deckId) {
        const deck = this.state.currentDeck;
        if (deck) {
            this.eventBus.emit('ui:test-deck', {
                deck: deck,
                testCards: deck.keyCards?.slice(0, 3) || []
            });
            
            this.eventBus.emit('ui:view-change-requested', { view: 'prediction' });
        }
    }

    async copyDecklist() {
        const deck = this.state.currentDeck;
        if (!deck) return;

        const decklistText = this.generateDecklistText(deck);
        
        try {
            await navigator.clipboard.writeText(decklistText);
            this.log('📋 Decklist copiada al portapapeles');
        } catch (error) {
            this.logError('Error copiando decklist:', error);
        }
    }

    generateDecklistText(deck) {
        let text = `// ${deck.name}\n`;
        text += `// Meta Share: ${(deck.metaShare || 0).toFixed(1)}%\n\n`;
        
        text += `Mainboard (${deck.mainboard?.length || 0}):\n`;
        if (deck.mainboard) {
            deck.mainboard.forEach(card => {
                text += `${card.quantity || 1} ${card.name}\n`;
            });
        }
        
        if (deck.sideboard && deck.sideboard.length > 0) {
            text += `\nSideboard (${deck.sideboard.length}):\n`;
            deck.sideboard.forEach(card => {
                text += `${card.quantity || 1} ${card.name}\n`;
            });
        }
        
        return text;
    }

    filterCards(cards) {
        if (this.state.filterType === 'all') return cards;
        
        return cards.filter(card => {
            const cardType = (card.type || '').toLowerCase();
            return cardType.includes(this.state.filterType);
        });
    }

    formatColors(colors) {
        if (!colors || colors.length === 0) return '⚪ Incoloro';
        
        const colorMap = {
            'W': '⚪ Blanco',
            'U': '🔵 Azul',
            'B': '⚫ Negro',
            'R': '🔴 Rojo',
            'G': '🟢 Verde'
        };
        
        return colors.map(color => colorMap[color] || color).join(', ');
    }

    calculateAverageCMC(deck) {
        if (!deck.mainboard || deck.mainboard.length === 0) return '0.0';
        
        let totalCMC = 0;
        let totalCards = 0;
        
        deck.mainboard.forEach(card => {
            const cmc = card.cmc || 0;
            const quantity = card.quantity || 1;
            totalCMC += cmc * quantity;
            totalCards += quantity;
        });
        
        return totalCards > 0 ? (totalCMC / totalCards).toFixed(1) : '0.0';
    }

    getManaCurveChart(deck) {
        if (!deck.mainboard) return '<div class="no-curve">No hay datos de curva</div>';
        
        const curve = {};
        for (let i = 0; i <= 7; i++) {
            curve[i] = 0;
        }
        
        deck.mainboard.forEach(card => {
            const cmc = Math.min(card.cmc || 0, 7);
            curve[cmc] += card.quantity || 1;
        });
        
        const maxCount = Math.max(...Object.values(curve));
        
        return `
            <div class="mana-curve-chart">
                ${Object.entries(curve).map(([cmc, count]) => `
                    <div class="curve-bar">
                        <div class="bar-fill" 
                             style="height: ${maxCount > 0 ? (count / maxCount) * 100 : 0}%">
                        </div>
                        <div class="bar-count">${count}</div>
                        <div class="bar-label">${cmc === '7' ? '7+' : cmc}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    shouldRerender(prevState, newState) {
        return prevState.currentDeck !== newState.currentDeck ||
               prevState.isLoading !== newState.isLoading ||
               prevState.activeTab !== newState.activeTab ||
               prevState.viewMode !== newState.viewMode ||
               prevState.filterType !== newState.filterType ||
               prevState.showSideboard !== newState.showSideboard ||
               prevState.error !== newState.error ||
               Object.keys(prevState.cardImages).length !== Object.keys(newState.cardImages).length;
    }
}

export default DeckDetailComponent;