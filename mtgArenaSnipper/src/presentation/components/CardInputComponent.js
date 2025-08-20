// src/presentation/components/ui/CardInputComponent.js
// 🃏 Componente de entrada de cartas VISUAL con imágenes

import BaseComponent from './BaseComponent.js';

class CardInputComponent extends BaseComponent {
    constructor(eventBus, gameService) {
        super(eventBus, { gameService });
        
        this.state = {
            currentCard: '',
            suggestions: [],
            turn: 1,
            isLoading: false,
            recentCards: [],
            showingCardImage: null,
            imageLoadTimeout: null
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
                recentCards: [],
                showingCardImage: null
            });
        });

        // Escuchar cuando se añaden cartas para mostrar imagen
        this.eventBus.on('ui:card-added', (data) => {
            this.showCardPreview(data.card);
        });
    }

    getTemplate() {
        return `
            <div class="card-input-component">
                <div class="input-header">
                    <h3>🃏 Cartas del Oponente</h3>
                    <div class="turn-controls">
                        <label for="turn-input">Turno:</label>
                        <input type="number" 
                               id="turn-input" 
                               min="1" 
                               max="20" 
                               value="${this.state.turn}"
                               class="turn-input">
                        <button id="turn-update-btn" class="btn btn-sm">📝 Actualizar</button>
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
                            ${this.state.isLoading ? '⏳ Procesando...' : '➕ Añadir Carta'}
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

                <!-- Previsualización de carta añadida -->
                ${this.state.showingCardImage ? `
                    <div class="card-preview-container">
                        <div class="card-preview">
                            <div class="card-preview-header">
                                <h4>✅ Carta Añadida</h4>
                                <button class="close-preview" id="close-preview">✕</button>
                            </div>
                            <div class="card-preview-content">
                                <div class="card-image-container">
                                    <img src="${this.state.showingCardImage.imageUrl}" 
                                         alt="${this.state.showingCardImage.name}"
                                         class="card-preview-image"
                                         onerror="this.src='https://via.placeholder.com/200x280/333333/ffffff?text=${encodeURIComponent(this.state.showingCardImage.name)}'">
                                </div>
                                <div class="card-preview-info">
                                    <h5>${this.state.showingCardImage.name}</h5>
                                    <p><strong>Turno:</strong> ${this.state.showingCardImage.turn}</p>
                                    <p><strong>Hora:</strong> ${this.formatTime(this.state.showingCardImage.timestamp)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <div class="quick-actions">
                    <h4>🎯 Cartas Rápidas</h4>
                    <div class="quick-buttons">
                        <button class="btn btn-sm btn-quick-card" data-card="Mountain">
                            🔴 Mountain
                        </button>
                        <button class="btn btn-sm btn-quick-card" data-card="Island">
                            🔵 Island
                        </button>
                        <button class="btn btn-sm btn-quick-card" data-card="Plains">
                            ⚪ Plains
                        </button>
                        <button class="btn btn-sm btn-quick-card" data-card="Swamp">
                            ⚫ Swamp
                        </button>
                        <button class="btn btn-sm btn-quick-card" data-card="Forest">
                            🟢 Forest
                        </button>
                    </div>
                    
                    <div class="quick-buttons">
                        <button class="btn btn-sm btn-quick-card" data-card="Lightning Bolt">
                            ⚡ Lightning Bolt
                        </button>
                        <button class="btn btn-sm btn-quick-card" data-card="Counterspell">
                            🚫 Counterspell
                        </button>
                        <button class="btn btn-sm btn-quick-card" data-card="Teferi, Hero of Dominaria">
                            🧙 Teferi
                        </button>
                    </div>
                </div>

                ${this.state.recentCards.length > 0 ? `
                    <div class="recent-cards">
                        <h4>📋 Cartas Recientes (${this.state.recentCards.length})</h4>
                        <div class="recent-cards-visual">
                            ${this.state.recentCards.slice(-4).reverse().map(card => `
                                <div class="recent-card-item">
                                    <div class="recent-card-image">
                                        ${card.imageUrl ? `
                                            <img src="${card.imageUrl}" 
                                                 alt="${card.name}"
                                                 class="recent-card-img"
                                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                            <div class="recent-card-placeholder" style="display: none;">
                                                🃏
                                            </div>
                                        ` : `
                                            <div class="recent-card-placeholder">🃏</div>
                                        `}
                                    </div>
                                    <div class="recent-card-info">
                                        <div class="recent-card-name">${card.name}</div>
                                        <div class="recent-card-turn">T${card.turn}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        ${this.state.recentCards.length > 4 ? `
                            <div class="recent-cards-count">
                                +${this.state.recentCards.length - 4} cartas más...
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="no-cards-yet">
                        <div class="no-cards-icon">🎯</div>
                        <h4>¡Añade la primera carta!</h4>
                        <p>Introduce el nombre de una carta que haya jugado tu oponente para empezar a predecir su mazo.</p>
                    </div>
                `}

                <!-- Botón de análisis manual -->
                <div class="manual-analysis">
                    <button class="btn btn-secondary" id="force-analysis" 
                            ${this.state.recentCards.length < 2 ? 'disabled' : ''}>
                        🔍 Forzar Análisis (${this.state.recentCards.length} cartas)
                    </button>
                </div>
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

            // Focus automático en el input
            cardInput.focus();
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

        // Cerrar preview
        const closePreview = this.$('#close-preview');
        if (closePreview) {
            this.addEventListener(closePreview, 'click', () => {
                this.hideCardPreview();
            });
        }

        // Forzar análisis
        const forceAnalysis = this.$('#force-analysis');
        if (forceAnalysis) {
            this.addEventListener(forceAnalysis, 'click', () => {
                this.forceAnalysis();
            });
        }
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
            const result = await this.dependencies.gameService.addOpponentCard(cardData);

            // Obtener imagen de la carta
            const imageUrl = await this.getCardImage(cardName);
            
            // Actualizar estado local
            const cardWithImage = { ...cardData, imageUrl };
            const recentCards = [...this.state.recentCards, cardWithImage];
            
            this.setState({ 
                currentCard: '', 
                suggestions: [],
                recentCards,
                isLoading: false 
            });

            // Emitir evento con imagen
            this.eventBus.emit('ui:card-added', { card: cardWithImage });

            // Mostrar preview de la carta
            this.showCardPreview(cardWithImage);

            // Auto-incrementar turno si es la primera carta del turno
            this.autoIncrementTurn();

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
            
            // Focus en el input después de seleccionar
            const cardInput = this.$('#card-name-input');
            if (cardInput) cardInput.focus();
        }
    }

    /**
     * 🖼️ Mostrar preview visual de la carta añadida
     */
    showCardPreview(card) {
        this.setState({ showingCardImage: card });
        
        // Auto-ocultar después de 5 segundos
        if (this.state.imageLoadTimeout) {
            clearTimeout(this.state.imageLoadTimeout);
        }
        
        this.state.imageLoadTimeout = setTimeout(() => {
            this.hideCardPreview();
        }, 5000);
    }

    /**
     * 🙈 Ocultar preview de carta
     */
    hideCardPreview() {
        this.setState({ showingCardImage: null });
        
        if (this.state.imageLoadTimeout) {
            clearTimeout(this.state.imageLoadTimeout);
            this.state.imageLoadTimeout = null;
        }
    }

    /**
     * 🖼️ Obtener imagen de carta
     */
    async getCardImage(cardName) {
        try {
            // Verificar cache local primero
            const cacheKey = `card_image_${cardName.toLowerCase().replace(/\s+/g, '_')}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                return cached;
            }

            // Obtener desde Scryfall API
            const response = await fetch(
                `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
            );
            
            if (response.ok) {
                const cardData = await response.json();
                const imageUrl = cardData.image_uris?.normal || cardData.image_uris?.large;
                
                if (imageUrl) {
                    // Guardar en cache
                    localStorage.setItem(cacheKey, imageUrl);
                    return imageUrl;
                }
            }
            
            // Fallback: imagen placeholder
            const placeholderUrl = `https://via.placeholder.com/200x280/333333/ffffff?text=${encodeURIComponent(cardName)}`;
            localStorage.setItem(cacheKey, placeholderUrl);
            return placeholderUrl;
            
        } catch (error) {
            this.log(`⚠️ Error obteniendo imagen para ${cardName}: ${error.message}`);
            return `https://via.placeholder.com/200x280/333333/ffffff?text=${encodeURIComponent(cardName)}`;
        }
    }

    /**
     * ⚡ Auto-incrementar turno inteligentemente
     */
    autoIncrementTurn() {
        // Solo auto-incrementar si es el primer o segundo carta del turno
        const cardsThisTurn = this.state.recentCards.filter(card => card.turn === this.state.turn).length;
        
        if (cardsThisTurn >= 2) {
            const newTurn = this.state.turn + 1;
            this.setState({ turn: newTurn });
            
            const turnInput = this.$('#turn-input');
            if (turnInput) {
                turnInput.value = newTurn;
            }
        }
    }

    /**
     * 🔍 Forzar análisis manual
     */
    forceAnalysis() {
        if (this.state.recentCards.length >= 2) {
            this.log('🔍 Forzando análisis manual...');
            this.eventBus.emit('predictions:refresh-requested');
        }
    }

    async searchCardSuggestions(query) {
        // Sugerencias básicas de cartas comunes
        const commonCards = [
            'Lightning Bolt', 'Counterspell', 'Teferi, Hero of Dominaria',
            'Monastery Swiftspear', 'Goblin Guide', 'Atraxa, Grand Unifier',
            'Up the Beanstalk', 'Leyline of the Guildpact', 'Sheoldred, the Apocalypse',
            'Fable of the Mirror-Breaker', 'Wedding Announcement', 'Raffine, Scheming Seer',
            'Izzet Cauldron', 'Supreme Verdict', 'Omnath, Locus of All',
            'Mountain', 'Island', 'Plains', 'Swamp', 'Forest'
        ];

        return commonCards
            .filter(card => card.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 6)
            .map(name => ({ name, type: 'Carta' }));
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    showError(message) {
        // Mostrar error visual en el componente
        const inputGroup = this.$('.input-group');
        if (inputGroup) {
            inputGroup.classList.add('error');
            setTimeout(() => {
                inputGroup.classList.remove('error');
            }, 3000);
        }
        
        this.eventBus.emit('ui:notification', {
            type: 'error',
            message: message,
            duration: 3000
        });
    }

    shouldRerender(prevState, newState) {
        return prevState.suggestions.length !== newState.suggestions.length ||
               prevState.recentCards.length !== newState.recentCards.length ||
               prevState.isLoading !== newState.isLoading ||
               prevState.showingCardImage !== newState.showingCardImage ||
               prevState.turn !== newState.turn;
    }

    onCleanup() {
        if (this.state.imageLoadTimeout) {
            clearTimeout(this.state.imageLoadTimeout);
        }
    }
}

export default CardInputComponent;