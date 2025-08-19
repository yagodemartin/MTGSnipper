// src/presentation/components/ui/CardInputComponent.js
// 🃏 Componente de entrada de cartas

import BaseComponent from './BaseComponent.js';

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
            'Up the Beanstalk', 'Leyline of the Guildpact', 'Sheoldred, the Apocalypse',
            'Fable of the Mirror-Breaker', 'Wedding Announcement', 'Raffine, Scheming Seer'
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

export default CardInputComponent;