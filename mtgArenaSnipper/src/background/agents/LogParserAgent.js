// src/background/agents/LogParserAgent.js
// 📝 Agente parseador de eventos desde logs

import eventBus from '../../shared/events/EventBus.js';

class LogParserAgent {
    constructor() {
        this.debugMode = true;
        this.eventCount = 0;

        // Patrones regex para detectar eventos
        this.patterns = {
            cardPlayed: /\[CARD\].*Name: ([^,]+)/i,
            gameStarted: /Game Start/i,
            gameEnded: /Game Over/i,
            turnStarted: /Beginning of Phase|Turn/i,
            manaPool: /ManaPool: ([A-Z\d]+)/i,
            opponentInfo: /opponent.*Name.*:.*([A-Za-z\s]+)/i
        };
    }

    /**
     * 🚀 Inicializar el agente
     */
    async initialize() {
        try {
            this.log('📝 LogParserAgent: Inicializando...');

            // Suscribirse a eventos del LogMonitor
            eventBus.on('log:new-lines', (data) => {
                this.handleNewLines(data);
            });

            this.log('✅ LogParserAgent inicializado');
            return true;

        } catch (error) {
            this.logError('Error inicializando LogParserAgent:', error);
            return false;
        }
    }

    /**
     * 📨 Manejar nuevas líneas del log
     */
    handleNewLines(data) {
        const { lines, timestamp } = data;

        if (!lines || lines.length === 0) {
            return;
        }

        this.log(`📝 Parseando ${lines.length} líneas...`);

        lines.forEach((line, index) => {
            try {
                this.parseLine(line, timestamp, index);
            } catch (error) {
                this.logError(`Error parseando línea ${index}:`, error);
            }
        });
    }

    /**
     * 🔍 Parsear una línea individual
     */
    parseLine(line, timestamp, lineIndex) {
        if (!line || typeof line !== 'string') {
            return;
        }

        const trimmedLine = line.trim();

        // Detectar eventos principales
        if (this.isGameStarted(trimmedLine)) {
            this.emitGameStarted(timestamp);
            return;
        }

        if (this.isGameEnded(trimmedLine)) {
            this.emitGameEnded(timestamp);
            return;
        }

        if (this.isTurnStarted(trimmedLine)) {
            this.emitTurnStarted(trimmedLine, timestamp);
            return;
        }

        if (this.isCardPlayed(trimmedLine)) {
            this.emitCardPlayed(trimmedLine, timestamp);
            return;
        }
    }

    /**
     * 🎮 Detectar inicio de juego
     */
    isGameStarted(line) {
        return this.patterns.gameStarted.test(line);
    }

    /**
     * 🏁 Detectar fin de juego
     */
    isGameEnded(line) {
        return this.patterns.gameEnded.test(line);
    }

    /**
     * ⏰ Detectar inicio de turno
     */
    isTurnStarted(line) {
        return this.patterns.turnStarted.test(line);
    }

    /**
     * 🃏 Detectar carta jugada
     */
    isCardPlayed(line) {
        // Buscar patrones de cartas jugadas
        return /\[CARD\]/.test(line) ||
               /playing/.test(line.toLowerCase()) ||
               /cast/.test(line.toLowerCase());
    }

    /**
     * 🚀 Emitir evento de inicio de juego
     */
    emitGameStarted(timestamp) {
        const event = {
            type: 'game:started',
            timestamp,
            data: {
                gameNumber: 1
            }
        };

        this.log(`🎮 GAME STARTED`);
        eventBus.emit('log:event:game-started', event);
        this.eventCount++;
    }

    /**
     * 🏁 Emitir evento de fin de juego
     */
    emitGameEnded(timestamp) {
        const event = {
            type: 'game:ended',
            timestamp,
            data: {}
        };

        this.log(`🏁 GAME ENDED`);
        eventBus.emit('log:event:game-ended', event);
        this.eventCount++;
    }

    /**
     * ⏰ Emitir evento de inicio de turno
     */
    emitTurnStarted(line, timestamp) {
        // Extraer número de turno si es posible
        const turnMatch = line.match(/Turn (\d+)/i);
        const turnNumber = turnMatch ? parseInt(turnMatch[1]) : 1;

        const event = {
            type: 'turn:started',
            timestamp,
            data: {
                turn: turnNumber
            }
        };

        this.log(`⏰ TURN STARTED: Turn ${turnNumber}`);
        eventBus.emit('log:event:turn-started', event);
        this.eventCount++;
    }

    /**
     * 🃏 Emitir evento de carta jugada
     */
    emitCardPlayed(line, timestamp) {
        // Extraer nombre de la carta
        const cardMatch = line.match(this.patterns.cardPlayed) ||
                         line.match(/([A-Z][a-zA-Z\s'-]+)/);

        const cardName = cardMatch ? cardMatch[1].trim() : 'Unknown Card';

        const event = {
            type: 'card:played',
            timestamp,
            data: {
                cardName,
                rawLine: line
            }
        };

        this.log(`🃏 CARD PLAYED: ${cardName}`);
        eventBus.emit('log:event:card-played', event);
        this.eventCount++;
    }

    /**
     * 📊 Obtener estadísticas
     */
    getStats() {
        return {
            totalEventsParsed: this.eventCount,
            debugMode: this.debugMode
        };
    }

    /**
     * 🔄 Resetear estadísticas
     */
    resetStats() {
        this.eventCount = 0;
        this.log('🔄 Estadísticas resetadas');
    }

    /**
     * 📝 Logging
     */
    log(message) {
        if (!this.debugMode) return;
        console.log(`📝 [LogParserAgent] ${message}`);
    }

    /**
     * ❌ Error logging
     */
    logError(message, error = null) {
        console.error(`❌ [LogParserAgent] ${message}`, error || '');
    }
}

export default LogParserAgent;
