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
        imageLoadTimeout: null,
        quickCards: [] // ← AÑADIR: cartas rápidas dinámicas
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

    // ← AÑADIR: Escuchar cuando se actualizan los datos del meta
    this.eventBus.on('database:updated', (data) => {
        this.updateQuickCards(data);
    });

    // Cargar quick cards iniciales
    await this.loadQuickCardsFromMeta();
}

/**
 * 🎯 Cargar cartas rápidas desde el meta actual
 */
async loadQuickCardsFromMeta() {
    try {
        // Obtener datos del meta desde el gameService
        const metaData = await this.dependencies.gameService.databaseManager.getMetaData();
        
        if (metaData && metaData.decks) {
            const popularCards = this.extractPopularCards(metaData.decks);
            this.setState({ quickCards: popularCards });
            this.log(`🎯 ${popularCards.length} cartas populares cargadas para quick buttons`);
        } else {
            // Fallback si no hay meta data
            this.setState({ quickCards: this.getDefaultQuickCards() });
        }
    } catch (error) {
        this.logError('Error cargando quick cards del meta:', error);
        this.setState({ quickCards: this.getDefaultQuickCards() });
    }
}

/**
 * 📊 Extraer cartas populares del meta
 */
extractPopularCards(decks) {
    const cardPopularity = {};
    
    // Contar popularidad de cada carta
    decks.forEach(deck => {
        if (deck.mainboard) {
            deck.mainboard.forEach(card => {
                const name = card.name;
                if (!cardPopularity[name]) {
                    cardPopularity[name] = {
                        name: name,
                        count: 0,
                        totalQuantity: 0,
                        decks: []
                    };
                }
                cardPopularity[name].count++;
                cardPopularity[name].totalQuantity += card.quantity || 1;
                cardPopularity[name].decks.push(deck.name);
            });
        }
    });
    
    // Ordenar por popularidad y seleccionar top cartas
    const sortedCards = Object.values(cardPopularity)
        .filter(card => card.count >= 2) // Al menos en 2 mazos
        .sort((a, b) => b.count - a.count)
        .slice(0, 12); // Top 12 cartas populares
    
    // Categorizar cartas para botones rápidos
    const categories = {
        lands: [],
        threats: [],
        spells: [],
        generic: []
    };
    
    sortedCards.forEach(card => {
        const name = card.name.toLowerCase();
        
        if (name.includes('mountain') || name.includes('island') || name.includes('plains') || 
            name.includes('swamp') || name.includes('forest')) {
            categories.lands.push(card);
        } else if (name.includes('bolt') || name.includes('push') || name.includes('torch')) {
            categories.spells.push(card);
        } else if (name.includes('terror') || name.includes('horror') || name.includes('knight')) {
            categories.threats.push(card);
        } else {
            categories.generic.push(card);
        }
    });
    
    // Seleccionar mix balanceado
    const quickCards = [
        ...categories.lands.slice(0, 3),
        ...categories.spells.slice(0, 3),
        ...categories.threats.slice(0, 2),
        ...categories.generic.slice(0, 4)
    ].slice(0, 10); // Máximo 10 botones
    
    return quickCards;
}

/**
 * 🔄 Actualizar cartas rápidas cuando cambia el meta
 */
updateQuickCards(metaData) {
    if (metaData && metaData.decks) {
        const popularCards = this.extractPopularCards(metaData.decks);
        this.setState({ quickCards: popularCards });
        this.log(`🔄 Quick cards actualizadas: ${popularCards.length} cartas`);
    }
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
                                        onerror="this.src='data:image/svg+xml;base64,${this.generateCardPlaceholder(this.state.showingCardImage.name)}'"
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
    <h4>🎯 Cartas Populares del Meta</h4>
    <div class="quick-buttons">
        ${this.state.quickCards.length > 0 ? 
            this.state.quickCards.map(card => `
                <button class="btn btn-sm btn-quick-card" data-card="${card.name}">
                    ${card.emoji || '🃏'} ${card.name}
                    ${card.count ? `<small>(${card.count} mazos)</small>` : ''}
                </button>
            `).join('') 
            : 
            this.getDefaultQuickCards().map(card => `
                <button class="btn btn-sm btn-quick-card" data-card="${card.name}">
                    ${card.emoji} ${card.name}
                </button>
            `).join('')
        }
    </div>
    
    <div class="quick-buttons-secondary">
        <button class="btn btn-sm btn-secondary" id="refresh-quick-cards">
            🔄 Actualizar cartas populares
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

        // Botón de refresh quick cards
const refreshQuickBtn = this.$('#refresh-quick-cards');
if (refreshQuickBtn) {
    this.addEventListener(refreshQuickBtn, 'click', () => {
        this.loadQuickCardsFromMeta();
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
        
        // **VERIFICAR que GameService existe**
        if (!this.dependencies.gameService) {
            throw new Error('GameService no disponible');
        }

        this.log(`🃏 Procesando carta: ${cardName}`);

        // Crear datos de la carta
        const cardData = {
            name: cardName,
            turn: this.state.turn,
            timestamp: Date.now()
        };

        // **VERIFICAR que la función existe**
        if (typeof this.dependencies.gameService.addOpponentCard !== 'function') {
            throw new Error('Método addOpponentCard no disponible');
        }

        // Enviar al GameService
        const result = await this.dependencies.gameService.addOpponentCard(cardData);
        
        // **VERIFICAR resultado**
        if (!result) {
            this.log('⚠️ No se pudieron generar predicciones (posible falta de datos del meta)');
        }

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

        // Auto-incrementar turno
        this.autoIncrementTurn();

        this.log(`✅ Carta añadida: ${cardName}`);

    } catch (error) {
        this.setState({ isLoading: false });
        this.logError('Error añadiendo carta:', error);
        this.showError(`Error: ${error.message}`);
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

   // ELIMINAR las cartas hardcodeadas y CAMBIAR POR:
async searchCardSuggestions(query) {
    try {
        // Buscar en el meta actual
        const metaData = await this.dependencies.gameService.predictionEngine.db.getMetaData();
        
        if (metaData?.indices?.byCard) {
            const allCards = Object.keys(metaData.indices.byCard);
            return allCards
                .filter(card => card.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 6)
                .map(name => ({ name, type: 'Meta' }));
        }
        
        return [];
    } catch (error) {
        this.logError('Error buscando sugerencias:', error);
        return [];
    }
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
    // ❌ EVITAR re-renders constantes - solo re-render cuando hay cambios significativos
    return (
        prevState.suggestions.length !== newState.suggestions.length ||
        prevState.recentCards.length !== newState.recentCards.length ||
        prevState.isLoading !== newState.isLoading ||
        prevState.showingCardImage !== newState.showingCardImage ||
        prevState.turn !== newState.turn ||
        prevState.quickCards.length !== newState.quickCards.length  // ← AÑADIR ESTA LÍNEA
    );
}

    onCleanup() {
        if (this.state.imageLoadTimeout) {
            clearTimeout(this.state.imageLoadTimeout);
        }
    }

    generateCardPlaceholder(cardName) {
    const cleanName = cardName.substring(0, 20); // Máximo 20 chars
    const svg = `<svg width="200" height="280" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="280" fill="#333333"/>
        <text x="100" y="140" text-anchor="middle" fill="white" font-size="12">${cleanName}</text>
    </svg>`;
    return btoa(svg);
}

async onRender() {
    try {
        // ✅ THROTTLING: solo ejecutar cada 2 segundos
        if (this._lastRender && (Date.now() - this._lastRender) < 2000) {
            return;
        }
        this._lastRender = Date.now();
        
        // Cargar botones dinámicos después del render
        await this.loadQuickCardsFromMeta();
        
        // Debug de inicialización
        this.log('🔧 Debug - GameService:', !!this.dependencies.gameService);
        this.log('🔧 Debug - PredictionEngine:', !!this.dependencies.gameService?.predictionEngine);
        this.log('🔧 Debug - DatabaseManager:', !!this.dependencies.gameService?.predictionEngine?.db);
    } catch (error) {
        this.logError('Error en onRender:', error);
    }
}

}

export default CardInputComponent;