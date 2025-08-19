// src/application/services/GameService.js
// 🎮 Servicio de gestión del estado del juego

import { GAME_EVENTS } from '../events/EventBus.js';

class GameService {
    constructor(predictionEngine, databaseManager, eventBus) {
        this.predictionEngine = predictionEngine;
        this.databaseManager = databaseManager;
        this.eventBus = eventBus;
        
        this.gameState = {
            isActive: false,
            currentTurn: 0,
            gameNumber: 1,
            startTime: null,
            cardsPlayed: [],
            isConfirmed: false,
            confirmedDeck: null
        };
        
        this.debugMode = true;
    }

    async initialize() {
        this.log('🎮 Inicializando GameService...');
        
        // Configurar listeners de eventos
        this.setupEventListeners();
        
        this.log('✅ GameService inicializado');
    }

    setupEventListeners() {
        // Escuchar eventos de predicción del engine
        this.eventBus.on('prediction:updated', (data) => {
            this.handlePredictionUpdated(data);
        });
        
        this.eventBus.on('deck:confirmed', (data) => {
            this.handleDeckConfirmed(data);
        });
    }

    /**
     * 🃏 Añadir carta del oponente
     */
    async addOpponentCard(cardData) {
        try {
            this.log(`🃏 Procesando carta: ${cardData.name}`);
            
            // Validar datos de entrada
            if (!this.validateCardData(cardData)) {
                throw new Error('Datos de carta inválidos');
            }
            
            // Enriquecer carta con contexto del juego
            const enrichedCard = this.enrichCard(cardData);
            
            // Añadir al historial
            this.gameState.cardsPlayed.push(enrichedCard);
            
            // Procesar con prediction engine
            const result = await this.predictionEngine.addOpponentCard(enrichedCard);
            
            // Emitir eventos apropiados
            if (result.confirmed) {
                this.gameState.isConfirmed = true;
                this.gameState.confirmedDeck = result.deck;
                this.eventBus.emit(GAME_EVENTS.DECK_CONFIRMED, result.deck);
            } else {
                this.eventBus.emit(GAME_EVENTS.DECK_PREDICTION_UPDATED, {
                    predictions: result.predictions,
                    cardAdded: enrichedCard
                });
            }
            
            return result;

        } catch (error) {
            this.logError('Error añadiendo carta:', error);
            this.eventBus.emit(GAME_EVENTS.SYSTEM_ERROR, { 
                component: 'GameService',
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * ⏰ Actualizar turno actual
     */
    setTurn(turnNumber) {
        if (turnNumber <= 0) {
            throw new Error('Número de turno debe ser positivo');
        }
        
        this.gameState.currentTurn = turnNumber;
        this.predictionEngine.setTurn(turnNumber);
        
        this.eventBus.emit(GAME_EVENTS.TURN_STARTED, {
            turn: turnNumber,
            gameNumber: this.gameState.gameNumber
        });
        
        this.log(`⏰ Turno actualizado: ${turnNumber}`);
    }

    /**
     * 🔄 Reiniciar juego
     */
    async resetGame() {
        this.log('🔄 Reiniciando juego...');
        
        const prevGameNumber = this.gameState.gameNumber;
        
        this.gameState = {
            isActive: false,
            currentTurn: 0,
            gameNumber: prevGameNumber + 1,
            startTime: null,
            cardsPlayed: [],
            isConfirmed: false,
            confirmedDeck: null
        };
        
        this.predictionEngine.reset();
        
        this.eventBus.emit(GAME_EVENTS.GAME_ENDED, {
            gameNumber: prevGameNumber
        });
        
        this.log('✅ Juego reiniciado');
    }

    /**
     * 🎯 Confirmar mazo manualmente
     */
    confirmDeck(deckId) {
        const result = this.predictionEngine.confirmDeck(deckId);
        
        if (result) {
            this.gameState.isConfirmed = true;
            this.gameState.confirmedDeck = result;
            
            this.eventBus.emit(GAME_EVENTS.DECK_CONFIRMED, result);
            return result;
        }
        
        return null;
    }

    /**
     * 📊 Obtener estado actual del juego
     */
    getGameState() {
        return {
            ...this.gameState,
            predictionStats: this.predictionEngine.getStats(),
            totalCardsAnalyzed: this.gameState.cardsPlayed.length,
            gameTimeMinutes: this.calculateGameTime()
        };
    }

    /**
     * 📊 Obtener estadísticas
     */
    getStats() {
        return this.getGameState();
    }

    // Métodos privados
    validateCardData(cardData) {
        return cardData && 
               typeof cardData.name === 'string' && 
               cardData.name.trim().length > 0;
    }

    enrichCard(cardData) {
        return {
            ...cardData,
            turn: this.gameState.currentTurn,
            gameNumber: this.gameState.gameNumber,
            timestamp: Date.now(),
            sequence: this.gameState.cardsPlayed.length + 1
        };
    }

    calculateGameTime() {
        if (!this.gameState.startTime) return 0;
        return Math.floor((Date.now() - this.gameState.startTime) / 60000);
    }

    handlePredictionUpdated(data) {
        // Lógica adicional si es necesaria
        this.log('📊 Predicciones actualizadas desde engine');
    }

    handleDeckConfirmed(data) {
        // Lógica adicional si es necesaria
        this.log('🎯 Mazo confirmado desde engine');
    }

    cleanup() {
        this.log('🧹 Limpiando GameService...');
        // Cleanup específico del servicio
    }

    log(message, data = null) {
        if (!this.debugMode) return;
        console.log(`🎮 [GameService] ${message}`, data || '');
    }

    logError(message, error = null) {
        console.error(`❌ [GameService] ${message}`, error || '');
    }
}

// ===============================================

// src/application/services/UIService.js
// 🎨 Servicio de gestión del estado de la interfaz

class UIService {
    constructor(eventBus) {
        this.eventBus = eventBus;
        
        this.uiState = {
            notifications: [],
            modals: [],
            theme: 'dark',
            sidebarCollapsed: false,
            activeTooltip: null
        };
        
        this.debugMode = true;
    }

    async initialize() {
        this.log('🎨 Inicializando UIService...');
        
        // Configurar sistema de notificaciones
        this.setupNotificationSystem();
        
        this.log('✅ UIService inicializado');
    }

    setupNotificationSystem() {
        // Crear contenedor de notificaciones si no existe
        if (!document.getElementById('notifications-container')) {
            const container = document.createElement('div');
            container.id = 'notifications-container';
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
    }

    /**
     * 📢 Mostrar notificación
     */
    showNotification(notification) {
        const id = this.generateId();
        const notificationData = {
            id,
            type: notification.type || 'info', // info, success, warning, error
            title: notification.title || '',
            message: notification.message || '',
            duration: notification.duration || 4000,
            timestamp: Date.now()
        };

        this.uiState.notifications.push(notificationData);
        this.renderNotification(notificationData);

        // Auto-remover después del tiempo especificado
        if (notificationData.duration > 0) {
            setTimeout(() => {
                this.removeNotification(id);
            }, notificationData.duration);
        }

        this.log(`📢 Notificación mostrada: ${notificationData.type} - ${notificationData.title}`);
        return id;
    }

    /**
     * 🗑️ Remover notificación
     */
    removeNotification(id) {
        this.uiState.notifications = this.uiState.notifications.filter(n => n.id !== id);
        
        const element = document.getElementById(`notification-${id}`);
        if (element) {
            element.classList.add('removing');
            setTimeout(() => {
                element.remove();
            }, 300);
        }
    }

    /**
     * 🎨 Renderizar notificación
     */
    renderNotification(notification) {
        const container = document.getElementById('notifications-container');
        if (!container) return;

        const element = document.createElement('div');
        element.id = `notification-${notification.id}`;
        element.className = `notification notification-${notification.type}`;
        
        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${this.getNotificationIcon(notification.type)}</div>
                <div class="notification-text">
                    ${notification.title ? `<div class="notification-title">${notification.title}</div>` : ''}
                    <div class="notification-message">${notification.message}</div>
                </div>
                <button class="notification-close" onclick="window.mtgApp.uiService.removeNotification('${notification.id}')">
                    ×
                </button>
            </div>
        `;

        container.appendChild(element);

        // Animación de entrada
        setTimeout(() => {
            element.classList.add('visible');
        }, 10);
    }

    /**
     * 🔘 Modal genérico
     */
    showModal(modalConfig) {
        const id = this.generateId();
        const modal = {
            id,
            title: modalConfig.title || '',
            content: modalConfig.content || '',
            buttons: modalConfig.buttons || [{ text: 'Cerrar', action: 'close' }],
            size: modalConfig.size || 'medium', // small, medium, large
            closable: modalConfig.closable !== false
        };

        this.uiState.modals.push(modal);
        this.renderModal(modal);

        return id;
    }

    /**
     * 🎨 Cambiar tema
     */
    setTheme(theme) {
        this.uiState.theme = theme;
        document.body.className = `theme-${theme}`;
        document.documentElement.setAttribute('data-theme', theme);
        
        this.eventBus.emit('ui:theme-changed', { theme });
        this.log(`🎨 Tema cambiado a: ${theme}`);
    }

    /**
     * 💡 Mostrar tooltip
     */
    showTooltip(element, content, position = 'top') {
        this.hideTooltip(); // Ocultar tooltip anterior

        const tooltip = document.createElement('div');
        tooltip.className = `tooltip tooltip-${position}`;
        tooltip.innerHTML = content;
        tooltip.id = 'active-tooltip';

        document.body.appendChild(tooltip);

        // Posicionar tooltip
        this.positionTooltip(tooltip, element, position);

        this.uiState.activeTooltip = tooltip;
    }

    hideTooltip() {
        if (this.uiState.activeTooltip) {
            this.uiState.activeTooltip.remove();
            this.uiState.activeTooltip = null;
        }
    }

    /**
     * 📊 Obtener estado de la UI
     */
    getUIState() {
        return {
            ...this.uiState,
            activeNotifications: this.uiState.notifications.length,
            activeModals: this.uiState.modals.length
        };
    }

    // Métodos privados
    generateId() {
        return `ui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getNotificationIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || 'ℹ️';
    }

    renderModal(modal) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = `modal-${modal.id}`;

        overlay.innerHTML = `
            <div class="modal modal-${modal.size}">
                <div class="modal-header">
                    <h3 class="modal-title">${modal.title}</h3>
                    ${modal.closable ? '<button class="modal-close">×</button>' : ''}
                </div>
                <div class="modal-content">
                    ${modal.content}
                </div>
                <div class="modal-footer">
                    ${modal.buttons.map(btn => 
                        `<button class="btn btn-${btn.type || 'secondary'}" 
                                data-action="${btn.action}">${btn.text}</button>`
                    ).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Event listeners
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && modal.closable) {
                this.closeModal(modal.id);
            }
        });

        setTimeout(() => overlay.classList.add('visible'), 10);
    }

    closeModal(id) {
        const modal = document.getElementById(`modal-${id}`);
        if (modal) {
            modal.classList.add('removing');
            setTimeout(() => modal.remove(), 300);
        }

        this.uiState.modals = this.uiState.modals.filter(m => m.id !== id);
    }

    positionTooltip(tooltip, element, position) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top, left;

        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - 10;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = rect.bottom + 10;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - 10;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + 10;
                break;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    cleanup() {
        this.log('🧹 Limpiando UIService...');
        
        // Limpiar notificaciones
        this.uiState.notifications.forEach(n => this.removeNotification(n.id));
        
        // Limpiar modals
        this.uiState.modals.forEach(m => this.closeModal(m.id));
        
        // Limpiar tooltip
        this.hideTooltip();
    }

    log(message, data = null) {
        if (!this.debugMode) return;
        console.log(`🎨 [UIService] ${message}`, data || '');
    }

    logError(message, error = null) {
        console.error(`❌ [UIService] ${message}`, error || '');
    }
}

// ===============================================

// src/application/services/CardService.js
// 🃏 Servicio de gestión de cartas y datos

class CardService {
    constructor(databaseManager, eventBus) {
        this.databaseManager = databaseManager;
        this.eventBus = eventBus;
        this.cardCache = new Map();
        this.debugMode = true;
    }

    async initialize() {
        this.log('🃏 Inicializando CardService...');
        
        // Precargar cartas comunes
        await this.preloadCommonCards();
        
        this.log('✅ CardService inicializado');
    }

    /**
     * 🔍 Buscar carta por nombre
     */
    async findCard(cardName) {
        try {
            const normalizedName = this.normalizeCardName(cardName);
            
            // Verificar cache primero
            if (this.cardCache.has(normalizedName)) {
                return this.cardCache.get(normalizedName);
            }

            // Buscar en base de datos local
            const card = await this.searchInLocalDatabase(normalizedName);
            
            if (card) {
                this.cardCache.set(normalizedName, card);
                return card;
            }

            // Si no se encuentra, buscar en Scryfall API
            const scryfallCard = await this.searchInScryfall(cardName);
            
            if (scryfallCard) {
                this.cardCache.set(normalizedName, scryfallCard);
                return scryfallCard;
            }

            return null;

        } catch (error) {
            this.logError(`Error buscando carta ${cardName}:`, error);
            return null;
        }
    }

    /**
     * 🎨 Obtener imagen de carta
     */
    async getCardImage(cardName) {
        const card = await this.findCard(cardName);
        
        if (card && card.imageUrl) {
            return card.imageUrl;
        }

        // Imagen placeholder
        return this.getPlaceholderImage(cardName);
    }

    /**
     * 💰 Obtener información de costos
     */
    getManaCost(card) {
        if (!card) return { symbols: [], cmc: 0, colors: [] };

        return {
            symbols: this.parseManaCost(card.manaCost || ''),
            cmc: card.cmc || 0,
            colors: card.colors || []
        };
    }

    /**
     * 📊 Obtener estadísticas de carta
     */
    getCardStats(cardName) {
        // Estadísticas de uso en el meta actual
        const metaData = this.databaseManager.getCurrentMetaData();
        
        if (!metaData) return null;

        const stats = {
            playRate: 0,
            decksUsing: [],
            averageCopies: 0,
            metaShare: 0
        };

        metaData.decks.forEach(deck => {
            const cardInDeck = this.findCardInDeck(cardName, deck);
            
            if (cardInDeck) {
                stats.playRate++;
                stats.decksUsing.push(deck.name);
                stats.averageCopies += cardInDeck.copies || 1;
                stats.metaShare += deck.metaShare || 0;
            }
        });

        if (stats.playRate > 0) {
            stats.averageCopies = stats.averageCopies / stats.playRate;
            stats.playRate = (stats.playRate / metaData.decks.length) * 100;
        }

        return stats;
    }

    // Métodos privados
    async preloadCommonCards() {
        const commonCards = [
            'Lightning Bolt', 'Counterspell', 'Mountain', 'Island', 
            'Forest', 'Plains', 'Swamp', 'Teferi, Hero of Dominaria'
        ];

        const loadPromises = commonCards.map(name => this.findCard(name));
        await Promise.allSettled(loadPromises);

        this.log(`📚 Precargadas ${commonCards.length} cartas comunes`);
    }

    async searchInLocalDatabase(cardName) {
        // Buscar en mazos del meta actual
        const metaData = await this.databaseManager.getMetaData();
        
        if (!metaData) return null;

        for (const deck of metaData.decks) {
            // Buscar en mainboard
            const found = deck.mainboard?.find(card => 
                this.normalizeCardName(card.name) === cardName
            );
            
            if (found) {
                return this.enrichCardData(found);
            }

            // Buscar en key cards
            const keyCard = deck.keyCards?.find(card =>
                this.normalizeCardName(card.name) === cardName
            );

            if (keyCard) {
                return this.enrichCardData(keyCard);
            }
        }

        return null;
    }

    async searchInScryfall(cardName) {
        try {
            const response = await fetch(
                `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
            );

            if (!response.ok) return null;

            const data = await response.json();
            
            return {
                name: data.name,
                manaCost: data.mana_cost,
                cmc: data.cmc,
                type: data.type_line,
                colors: data.colors,
                imageUrl: data.image_uris?.normal,
                set: data.set,
                rarity: data.rarity,
                source: 'scryfall'
            };

        } catch (error) {
            this.logError('Error en Scryfall API:', error);
            return null;
        }
    }

    enrichCardData(cardData) {
        return {
            ...cardData,
            normalizedName: this.normalizeCardName(cardData.name),
            manaCostInfo: this.getManaCost(cardData),
            searchScore: 1.0,
            source: 'local'
        };
    }

    normalizeCardName(name) {
        return name.toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ');
    }

    parseManaCost(manaCost) {
        // Parsear símbolos de maná como {1}{R}{R} -> ['1', 'R', 'R']
        const symbols = manaCost.match(/\{([^}]+)\}/g) || [];
        return symbols.map(symbol => symbol.replace(/[{}]/g, ''));
    }

    findCardInDeck(cardName, deck) {
        const normalizedName = this.normalizeCardName(cardName);
        
        // Buscar en mainboard
        const mainboardCard = deck.mainboard?.find(card =>
            this.normalizeCardName(card.name) === normalizedName
        );

        if (mainboardCard) return mainboardCard;

        // Buscar en key cards
        const keyCard = deck.keyCards?.find(card =>
            this.normalizeCardName(card.name) === normalizedName
        );

        return keyCard || null;
    }

    getPlaceholderImage(cardName) {
        // Generar imagen placeholder basada en el nombre
        return `https://via.placeholder.com/200x280/333333/ffffff?text=${encodeURIComponent(cardName)}`;
    }

    log(message, data = null) {
        if (!this.debugMode) return;
        console.log(`🃏 [CardService] ${message}`, data || '');
    }

    logError(message, error = null) {
        console.error(`❌ [CardService] ${message}`, error || '');
    }
}

// Exportar servicios
export { GameService, UIService, CardService };