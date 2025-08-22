// src/presentation/components/MetaBrowserComponent.js
// 🔍 Componente navegador de mazos meta con tabla visual

import BaseComponent from './BaseComponent.js';

class MetaBrowserComponent extends BaseComponent {
    constructor(eventBus, dependencies) {
        super(eventBus, dependencies);
        
        this.state = {
            decks: [],
            isLoading: false,
            sortBy: 'metaShare', // metaShare, name, archetype
            sortDirection: 'desc',
            filterArchetype: 'all',
            searchQuery: '',
            viewMode: 'grid', // grid, table
            showEmptyMessage: false
        };
    }

    async onInitialize() {
        // Cargar mazos meta iniciales
        await this.loadMetaDecks();
        
        // Escuchar actualizaciones de base de datos
        this.eventBus.on('database:updated', async () => {
            await this.loadMetaDecks();
        });
        
        this.log('🔍 MetaBrowserComponent inicializado');
    }

    async loadMetaDecks() {
        try {
            this.setState({ isLoading: true });
            
            const metaData = await this.dependencies.databaseManager?.getMetaData();
            
            if (metaData && metaData.decks) {
                this.setState({ 
                    decks: metaData.decks,
                    isLoading: false,
                    showEmptyMessage: false
                });
                this.log(`📊 Cargados ${metaData.decks.length} mazos meta`);
            } else {
                this.setState({ 
                    decks: [],
                    isLoading: false,
                    showEmptyMessage: true
                });
                this.log('⚠️ No hay mazos meta disponibles');
            }
        } catch (error) {
            this.logError('Error cargando mazos meta:', error);
            this.setState({ 
                decks: [],
                isLoading: false,
                showEmptyMessage: true
            });
        }
    }

    getTemplate() {
        const filteredDecks = this.getFilteredDecks();
        
        return `
            <div class="meta-browser-component">
                <div class="meta-browser-header">
                    <div class="header-main">
                        <h3>🔍 Navegador de Mazos Meta</h3>
                        <div class="deck-count">${filteredDecks.length} mazos disponibles</div>
                    </div>
                    
                    <div class="browser-controls">
                        <div class="search-filters">
                            <input type="text" 
                                   id="search-decks" 
                                   placeholder="Buscar mazos..."
                                   value="${this.state.searchQuery}"
                                   class="search-input">
                            
                            <select id="filter-archetype" class="archetype-filter">
                                <option value="all">Todos los arquetipos</option>
                                <option value="aggro">Aggro</option>
                                <option value="control">Control</option>
                                <option value="midrange">Midrange</option>
                                <option value="combo">Combo</option>
                                <option value="ramp">Ramp</option>
                            </select>
                        </div>
                        
                        <div class="view-controls">
                            <div class="sort-controls">
                                <select id="sort-by" class="sort-select">
                                    <option value="metaShare">Meta Share</option>
                                    <option value="name">Nombre</option>
                                    <option value="archetype">Arquetipo</option>
                                </select>
                                <button id="sort-direction" class="btn btn-sm sort-btn">
                                    ${this.state.sortDirection === 'desc' ? '↓' : '↑'}
                                </button>
                            </div>
                            
                            <div class="view-mode-toggle">
                                <button id="view-grid" class="btn btn-sm ${this.state.viewMode === 'grid' ? 'active' : ''}">
                                    🔲 Grid
                                </button>
                                <button id="view-table" class="btn btn-sm ${this.state.viewMode === 'table' ? 'active' : ''}">
                                    📋 Tabla
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="browser-actions">
                    <button id="refresh-meta" class="btn btn-secondary">
                        🔄 Actualizar Meta
                    </button>
                    <button id="import-deck" class="btn btn-secondary">
                        📥 Importar Mazo
                    </button>
                    <button id="export-meta" class="btn btn-secondary">
                        📤 Exportar Lista
                    </button>
                </div>

                <div class="meta-browser-content">
                    ${this.state.isLoading ? this.getLoadingTemplate() :
                      this.state.showEmptyMessage ? this.getEmptyTemplate() :
                      this.state.viewMode === 'grid' ? this.getGridTemplate(filteredDecks) :
                      this.getTableTemplate(filteredDecks)}
                </div>
            </div>
        `;
    }

    getGridTemplate(decks) {
        return `
            <div class="decks-grid">
                ${decks.map(deck => `
                    <div class="deck-card" data-deck-id="${deck.id}">
                        <div class="deck-image-container">
                            ${deck.imageUrl ? `
                                <img src="${deck.imageUrl}" 
                                     alt="${deck.name}" 
                                     class="deck-image"
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                <div class="deck-placeholder" style="display: none;">
                                    <span class="deck-icon">🃏</span>
                                </div>
                            ` : `
                                <div class="deck-placeholder">
                                    <span class="deck-icon">🃏</span>
                                </div>
                            `}
                            
                            <div class="deck-overlay">
                                <div class="meta-share">${(deck.metaShare || 0).toFixed(1)}%</div>
                                <div class="archetype-badge ${deck.archetype || 'unknown'}">${deck.archetype || 'N/A'}</div>
                            </div>
                        </div>
                        
                        <div class="deck-info">
                            <h4 class="deck-name">${deck.name}</h4>
                            <div class="deck-meta">
                                <span class="rank">#${deck.rank || '?'}</span>
                                <span class="colors">${this.formatColors(deck.colors)}</span>
                            </div>
                            <div class="deck-stats">
                                <span class="card-count">${deck.mainboard?.length || 0} cartas</span>
                                <span class="key-cards">${deck.keyCards?.length || 0} clave</span>
                            </div>
                        </div>
                        
                        <div class="deck-actions">
                            <button class="btn btn-sm btn-primary view-deck-btn" data-deck-id="${deck.id}">
                                👁️ Ver Detalle
                            </button>
                            <button class="btn btn-sm btn-secondary test-deck-btn" data-deck-id="${deck.id}">
                                🧪 Probar
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getTableTemplate(decks) {
        return `
            <div class="decks-table">
                <div class="table-header">
                    <div class="col-rank">Rank</div>
                    <div class="col-deck">Mazo</div>
                    <div class="col-meta">Meta %</div>
                    <div class="col-archetype">Arquetipo</div>
                    <div class="col-colors">Colores</div>
                    <div class="col-cards">Cartas</div>
                    <div class="col-actions">Acciones</div>
                </div>
                
                <div class="table-body">
                    ${decks.map(deck => `
                        <div class="table-row" data-deck-id="${deck.id}">
                            <div class="col-rank">
                                <span class="rank-badge">#${deck.rank || '?'}</span>
                            </div>
                            
                            <div class="col-deck">
                                <div class="deck-preview">
                                    <div class="deck-thumb">
                                        ${deck.imageUrl ? `
                                            <img src="${deck.imageUrl}" alt="${deck.name}" class="thumb-image">
                                        ` : `
                                            <div class="thumb-placeholder">🃏</div>
                                        `}
                                    </div>
                                    <div class="deck-info">
                                        <span class="deck-name">${deck.name}</span>
                                        <span class="deck-subtitle">${deck.subtitle || ''}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-meta">
                                <div class="meta-percentage">
                                    <span class="percentage">${(deck.metaShare || 0).toFixed(1)}%</span>
                                    <div class="percentage-bar">
                                        <div class="percentage-fill" style="width: ${Math.min(deck.metaShare || 0, 20) * 5}%"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-archetype">
                                <span class="archetype-tag ${deck.archetype || 'unknown'}">${deck.archetype || 'N/A'}</span>
                            </div>
                            
                            <div class="col-colors">
                                <div class="mana-symbols">
                                    ${this.formatManaSymbols(deck.colors)}
                                </div>
                            </div>
                            
                            <div class="col-cards">
                                <div class="card-stats">
                                    <span class="mainboard">${deck.mainboard?.length || 0}</span>
                                    <span class="separator">+</span>
                                    <span class="sideboard">${deck.sideboard?.length || 0}</span>
                                </div>
                            </div>
                            
                            <div class="col-actions">
                                <button class="btn btn-xs btn-primary view-deck-btn" data-deck-id="${deck.id}">
                                    👁️
                                </button>
                                <button class="btn btn-xs btn-secondary test-deck-btn" data-deck-id="${deck.id}">
                                    🧪
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getLoadingTemplate() {
        return `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <div class="loading-text">Cargando mazos meta...</div>
            </div>
        `;
    }

    getEmptyTemplate() {
        return `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h4>No hay mazos meta disponibles</h4>
                <p>La base de datos no contiene mazos meta. Actualiza para cargar los datos más recientes.</p>
                <button id="update-database" class="btn btn-primary">
                    🔄 Actualizar Base de Datos
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        // Búsqueda
        const searchInput = this.$('#search-decks');
        if (searchInput) {
            this.addEventListener(searchInput, 'input', (e) => {
                this.setState({ searchQuery: e.target.value });
            });
        }

        // Filtro de arquetipo
        const archetypeFilter = this.$('#filter-archetype');
        if (archetypeFilter) {
            this.addEventListener(archetypeFilter, 'change', (e) => {
                this.setState({ filterArchetype: e.target.value });
            });
        }

        // Ordenación
        const sortSelect = this.$('#sort-by');
        if (sortSelect) {
            this.addEventListener(sortSelect, 'change', (e) => {
                this.setState({ sortBy: e.target.value });
            });
        }

        const sortDirectionBtn = this.$('#sort-direction');
        if (sortDirectionBtn) {
            this.addEventListener(sortDirectionBtn, 'click', () => {
                this.setState({ 
                    sortDirection: this.state.sortDirection === 'desc' ? 'asc' : 'desc'
                });
            });
        }

        // Cambio de vista
        const gridBtn = this.$('#view-grid');
        if (gridBtn) {
            this.addEventListener(gridBtn, 'click', () => {
                this.setState({ viewMode: 'grid' });
            });
        }

        const tableBtn = this.$('#view-table');
        if (tableBtn) {
            this.addEventListener(tableBtn, 'click', () => {
                this.setState({ viewMode: 'table' });
            });
        }

        // Acciones de mazos
        this.$$('.view-deck-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const deckId = e.target.getAttribute('data-deck-id');
                this.viewDeckDetail(deckId);
            });
        });

        this.$$('.test-deck-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const deckId = e.target.getAttribute('data-deck-id');
                this.testDeck(deckId);
            });
        });

        // Acciones principales
        const refreshBtn = this.$('#refresh-meta');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => {
                this.refreshMeta();
            });
        }

        const updateBtn = this.$('#update-database');
        if (updateBtn) {
            this.addEventListener(updateBtn, 'click', () => {
                this.updateDatabase();
            });
        }

        // Doble clic para ver detalle
        this.$$('.deck-card, .table-row').forEach(card => {
            this.addEventListener(card, 'dblclick', (e) => {
                const deckId = e.currentTarget.getAttribute('data-deck-id');
                this.viewDeckDetail(deckId);
            });
        });
    }

    getFilteredDecks() {
        let filtered = [...this.state.decks];

        // Filtrar por búsqueda
        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            filtered = filtered.filter(deck => 
                deck.name.toLowerCase().includes(query) ||
                (deck.archetype || '').toLowerCase().includes(query)
            );
        }

        // Filtrar por arquetipo
        if (this.state.filterArchetype !== 'all') {
            filtered = filtered.filter(deck => 
                (deck.archetype || '').toLowerCase() === this.state.filterArchetype
            );
        }

        // Ordenar
        filtered.sort((a, b) => {
            let valueA = a[this.state.sortBy];
            let valueB = b[this.state.sortBy];

            // Manejar valores undefined
            if (valueA === undefined) valueA = '';
            if (valueB === undefined) valueB = '';

            // Ordenación numérica para metaShare
            if (this.state.sortBy === 'metaShare') {
                valueA = parseFloat(valueA) || 0;
                valueB = parseFloat(valueB) || 0;
            }

            if (this.state.sortDirection === 'desc') {
                return valueB > valueA ? 1 : -1;
            } else {
                return valueA > valueB ? 1 : -1;
            }
        });

        return filtered;
    }

    viewDeckDetail(deckId) {
        this.log(`👁️ Viendo detalle del mazo: ${deckId}`);
        
        // Emitir evento para cambiar a vista de detalle
        this.eventBus.emit('ui:view-change-requested', { 
            view: 'deck-detail',
            deckId: deckId
        });
    }

    testDeck(deckId) {
        this.log(`🧪 Probando mazo: ${deckId}`);
        
        const deck = this.state.decks.find(d => d.id === deckId);
        if (deck) {
            // Simular algunas cartas del mazo para testing
            const testCards = deck.keyCards?.slice(0, 3) || [];
            
            this.eventBus.emit('ui:test-deck', {
                deck: deck,
                testCards: testCards
            });
            
            // Cambiar a vista de predicciones para ver el test
            this.eventBus.emit('ui:view-change-requested', { view: 'prediction' });
        }
    }

    async refreshMeta() {
        this.log('🔄 Refrescando mazos meta...');
        await this.loadMetaDecks();
    }

    async updateDatabase() {
        this.log('🔄 Actualizando base de datos...');
        this.eventBus.emit('database:force-update');
    }

    formatColors(colors) {
        if (!colors || colors.length === 0) return '⚪ Incoloro';
        
        const colorMap = {
            'W': '⚪',
            'U': '🔵', 
            'B': '⚫',
            'R': '🔴',
            'G': '🟢'
        };
        
        return colors.map(color => colorMap[color] || color).join('');
    }

    formatManaSymbols(colors) {
        if (!colors || colors.length === 0) return '<span class="mana-symbol colorless">C</span>';
        
        return colors.map(color => 
            `<span class="mana-symbol mana-${color}">${color}</span>`
        ).join('');
    }

    shouldRerender(prevState, newState) {
        return prevState.decks.length !== newState.decks.length ||
               prevState.isLoading !== newState.isLoading ||
               prevState.searchQuery !== newState.searchQuery ||
               prevState.filterArchetype !== newState.filterArchetype ||
               prevState.sortBy !== newState.sortBy ||
               prevState.sortDirection !== newState.sortDirection ||
               prevState.viewMode !== newState.viewMode ||
               prevState.showEmptyMessage !== newState.showEmptyMessage;
    }
}

export default MetaBrowserComponent;