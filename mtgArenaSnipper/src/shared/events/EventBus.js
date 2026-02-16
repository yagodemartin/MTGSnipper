// src/application/events/EventBus.js
// 🚌 Sistema central de eventos para comunicación entre componentes

class EventBus {
    constructor() {
        this.listeners = new Map();
        this.debugMode = true; // Para desarrollo
        this.eventHistory = []; // Historial para debugging
    }

    /**
     * Suscribirse a un evento
     * @param {string} eventName - Nombre del evento
     * @param {function} callback - Función a ejecutar
     * @param {object} options - Opciones { once: boolean }
     */
    on(eventName, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        const listener = {
            callback,
            once: options.once || false,
            id: this.generateListenerId()
        };

        this.listeners.get(eventName).push(listener);

        if (this.debugMode) {
            console.log(`📡 EventBus: Registered listener for '${eventName}'`, listener.id);
        }

        // Retornar función para desuscribirse
        return () => this.off(eventName, listener.id);
    }

    /**
     * Suscribirse a un evento solo una vez
     */
    once(eventName, callback) {
        return this.on(eventName, callback, { once: true });
    }

    /**
     * Desuscribirse de un evento
     */
    off(eventName, listenerId) {
        if (!this.listeners.has(eventName)) return;

        const listeners = this.listeners.get(eventName);
        const index = listeners.findIndex(l => l.id === listenerId);
        
        if (index !== -1) {
            listeners.splice(index, 1);
            if (this.debugMode) {
                console.log(`📡 EventBus: Removed listener for '${eventName}'`, listenerId);
            }
        }

        // Limpiar si no hay más listeners
        if (listeners.length === 0) {
            this.listeners.delete(eventName);
        }
    }

    /**
     * Emitir un evento
     * @param {string} eventName - Nombre del evento
     * @param {any} data - Datos del evento
     */
    emit(eventName, data = null) {
        const timestamp = new Date().toISOString();
        
        // Guardar en historial para debugging
        this.eventHistory.push({
            eventName,
            data,
            timestamp,
            listenersCount: this.listeners.has(eventName) ? this.listeners.get(eventName).length : 0
        });

        // Mantener solo los últimos 100 eventos
        if (this.eventHistory.length > 100) {
            this.eventHistory.shift();
        }

        if (this.debugMode) {
            console.log(`🚀 EventBus: Emitting '${eventName}'`, data);
        }

        if (!this.listeners.has(eventName)) {
            if (this.debugMode) {
                console.warn(`⚠️ EventBus: No listeners for '${eventName}'`);
            }
            return;
        }

        const listeners = [...this.listeners.get(eventName)]; // Copia para evitar modificaciones durante iteración
        
        listeners.forEach(listener => {
            try {
                listener.callback(data, eventName);
                
                // Remover listener si es 'once'
                if (listener.once) {
                    this.off(eventName, listener.id);
                }
            } catch (error) {
                console.error(`❌ EventBus: Error in listener for '${eventName}':`, error);
                console.error('Listener:', listener);
                console.error('Data:', data);
            }
        });
    }

    /**
     * Emitir evento de forma asíncrona
     */
    async emitAsync(eventName, data = null) {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.emit(eventName, data);
                resolve();
            }, 0);
        });
    }

    /**
     * Verificar si hay listeners para un evento
     */
    hasListeners(eventName) {
        return this.listeners.has(eventName) && this.listeners.get(eventName).length > 0;
    }

    /**
     * Obtener número de listeners para un evento
     */
    getListenerCount(eventName) {
        return this.listeners.has(eventName) ? this.listeners.get(eventName).length : 0;
    }

    /**
     * Limpiar todos los listeners
     */
    clear() {
        this.listeners.clear();
        this.eventHistory = [];
        if (this.debugMode) {
            console.log('🧹 EventBus: All listeners cleared');
        }
    }

    /**
     * Obtener historial de eventos (para debugging)
     */
    getEventHistory(eventName = null) {
        if (eventName) {
            return this.eventHistory.filter(event => event.eventName === eventName);
        }
        return [...this.eventHistory];
    }

    /**
     * Activar/desactivar modo debug
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`🐛 EventBus: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Obtener estadísticas del EventBus
     */
    getStats() {
        const stats = {
            totalEventTypes: this.listeners.size,
            totalListeners: 0,
            eventsEmitted: this.eventHistory.length,
            eventTypes: {}
        };

        for (const [eventName, listeners] of this.listeners) {
            stats.totalListeners += listeners.length;
            stats.eventTypes[eventName] = listeners.length;
        }

        return stats;
    }

    /**
     * Generar ID único para listeners
     */
    generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Método para debugging - mostrar todos los listeners
     */
    debugListeners() {
        console.group('🐛 EventBus Debug - Current Listeners:');
        
        if (this.listeners.size === 0) {
            console.log('No listeners registered');
        } else {
            for (const [eventName, listeners] of this.listeners) {
                console.group(`📡 ${eventName} (${listeners.length} listeners)`);
                listeners.forEach((listener, index) => {
                    console.log(`${index + 1}. ID: ${listener.id}, Once: ${listener.once}`);
                });
                console.groupEnd();
            }
        }
        
        console.groupEnd();
    }

    /**
     * Método para debugging - mostrar historial reciente
     */
    debugRecentEvents(count = 10) {
        console.group(`🐛 EventBus Debug - Recent Events (last ${count}):`);
        
        const recent = this.eventHistory.slice(-count);
        if (recent.length === 0) {
            console.log('No events in history');
        } else {
            recent.forEach((event, index) => {
                console.log(`${index + 1}. [${event.timestamp}] ${event.eventName}`, event.data);
            });
        }
        
        console.groupEnd();
    }
}

// Definir eventos estándar de la aplicación - ❗ SIN export aquí
const GAME_EVENTS = {
    // Eventos de juego
    GAME_STARTED: 'game:started',
    GAME_ENDED: 'game:ended',
    GAME_PAUSED: 'game:paused',
    GAME_RESUMED: 'game:resumed',
    GAME_RESET: 'game:reset',
    
    // Eventos de turno
    TURN_STARTED: 'turn:started',
    TURN_ENDED: 'turn:ended',
    TURN_UPDATED: 'turn:updated',
    
    // Eventos de cartas
    CARD_PLAYED: 'card:played',
    CARD_DRAWN: 'card:drawn',
    CARD_DISCARDED: 'card:discarded',
    CARD_ADDED: 'card:added',
    
    // Eventos de predicción
    DECK_PREDICTION_UPDATED: 'deck:prediction:updated',
    DECK_CONFIRMED: 'deck:confirmed',
    DECK_UNCONFIRMED: 'deck:unconfirmed',
    DECK_PROBABILITY_CHANGED: 'deck:probability:changed',
    DECK_MANUAL_CONFIRM: 'deck:manual:confirm',
    
    // Eventos de UI
    UI_READY: 'ui:ready',
    UI_UPDATE_REQUIRED: 'ui:update:required',
    UI_ERROR: 'ui:error',
    UI_NOTIFICATION: 'ui:notification',
    UI_VIEW_CHANGED: 'ui:view:changed',
    UI_VIEW_CHANGE_REQUESTED: 'ui:view:change:requested',
    UI_THEME_CHANGED: 'ui:theme:changed',
    UI_CARD_ADDED: 'ui:card:added',
    
    // Eventos de sistema
    SYSTEM_READY: 'system:ready',
    SYSTEM_ERROR: 'system:error',
    SYSTEM_LOADING: 'system:loading',
    
    // Eventos de parsing y detección
    LOG_PARSER_STARTED: 'log:parser:started',
    LOG_PARSER_STOPPED: 'log:parser:stopped',
    LOG_ENTRY_PARSED: 'log:entry:parsed',
    
    // Eventos de MTG Arena
    MTG_ARENA_DETECTED: 'mtg:arena:detected',
    MTG_ARENA_LOST: 'mtg:arena:lost',
    MTG_ARENA_CONNECTED: 'mtg:arena:connected',
    
    // Eventos de formato
    FORMAT_DETECTED: 'format:detected',
    FORMAT_CHANGED: 'format:changed',
    
    // Eventos de base de datos
    DATABASE_UPDATED: 'database:updated',
    DATABASE_UPDATE_STARTED: 'database:update:started',
    DATABASE_UPDATE_COMPLETED: 'database:update:completed',
    DATABASE_UPDATE_FAILED: 'database:update:failed',
    
    // Eventos de predicciones específicos
    PREDICTIONS_REFRESH_REQUESTED: 'predictions:refresh:requested',
    PREDICTION_CONFIDENCE_CHANGED: 'prediction:confidence:changed',
    
    // Eventos de cartas confirmadas
    CARD_PLAYED_CONFIRMED: 'card:played:confirmed',
    CARD_EXPECTED: 'card:expected',
    CARD_UNEXPECTED: 'card:unexpected'
};

// Crear instancia global del EventBus
const eventBus = new EventBus();

// Hacer disponible globalmente para debugging
if (typeof window !== 'undefined') {
    window.EventBus = eventBus;
    window.GAME_EVENTS = GAME_EVENTS;
    
    // Método helper para debugging desde consola
    window.debugEventBus = () => {
        console.log('🐛 EventBus Stats:', eventBus.getStats());
        eventBus.debugListeners();
        eventBus.debugRecentEvents();
    };
}

// ✅ Exportación única sin duplicados
export { EventBus, GAME_EVENTS };
export default eventBus;