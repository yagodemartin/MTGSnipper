// src/background/agents/LogMonitorAgent.js
// ⏱️ Agente de monitoreo de logs en tiempo real

import eventBus from '../../shared/events/EventBus.js';

class LogMonitorAgent {
    constructor() {
        this.logFilePath = null;
        this.lastPosition = 0;
        this.lastModified = 0;
        this.isMonitoring = false;
        this.pollingInterval = null;
        this.pollingDelay = 500; // 500ms entre chequeos

        this.debugMode = true;
    }

    /**
     * 🚀 Inicializar el agente
     */
    async initialize() {
        try {
            this.log('⏱️ LogMonitorAgent: Inicializando...');

            // Detectar ruta del Player.log de MTG Arena
            this.logFilePath = this.detectLogFilePath();

            if (!this.logFilePath) {
                this.logError('No se pudo detectar la ruta de Player.log');
                return false;
            }

            this.log(`✅ Ruta del log detectada: ${this.logFilePath}`);

            // Inicializar posición del archivo
            await this.initializeFilePosition();

            this.log('✅ LogMonitorAgent inicializado');
            return true;

        } catch (error) {
            this.logError('Error inicializando LogMonitorAgent:', error);
            return false;
        }
    }

    /**
     * 🔍 Detectar ruta del Player.log
     */
    detectLogFilePath() {
        // Ruta estándar de MTG Arena
        const paths = [
            'C:\\Users\\' + this.getCurrentUsername() + '\\AppData\\LocalLow\\Wizards Of The Coast\\MTGA\\Player.log',
            '%APPDATA%\\..\\LocalLow\\Wizards Of The Coast\\MTGA\\Player.log',
            'C:\\Users\\Default\\AppData\\LocalLow\\Wizards Of The Coast\\MTGA\\Player.log'
        ];

        // En producción, usar Overwolf FileSystem API
        // Para testing, retornar ruta estándar
        return paths[0];
    }

    /**
     * 👤 Obtener usuario actual (placeholder)
     */
    getCurrentUsername() {
        // En Overwolf, usar API para obtener usuario
        return 'MTG';
    }

    /**
     * 📝 Inicializar posición del archivo
     */
    async initializeFilePosition() {
        // En Overwolf: usar overwolf.io.getFileSize()
        this.lastPosition = 0;
        this.lastModified = Date.now();
        this.log('📝 Posición inicial del archivo establecida');
    }

    /**
     * ▶️ Iniciar monitoreo
     */
    startMonitoring() {
        if (this.isMonitoring) {
            this.log('⚠️ Ya estoy monitoreando');
            return;
        }

        this.isMonitoring = true;
        this.log('▶️ Iniciando monitoreo del log...');

        // Emitir evento de inicio
        eventBus.emit('log:monitor:started', {
            logPath: this.logFilePath,
            timestamp: Date.now()
        });

        // Iniciar polling
        this.pollingInterval = setInterval(() => {
            this.checkForNewLines();
        }, this.pollingDelay);

        // Hacer chequeo inicial inmediato
        this.checkForNewLines();
    }

    /**
     * ⏹️ Detener monitoreo
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            this.log('⚠️ No estoy monitoreando');
            return;
        }

        this.isMonitoring = false;

        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }

        this.log('⏹️ Monitoreo detenido');

        // Emitir evento de parada
        eventBus.emit('log:monitor:stopped', {
            timestamp: Date.now()
        });
    }

    /**
     * 🔍 Chequear por nuevas líneas
     */
    async checkForNewLines() {
        try {
            // En Overwolf: usar overwolf.io.readTextFile()
            // Para testing: simular lectura

            const newLines = await this.readNewLinesFromLog();

            if (newLines && newLines.length > 0) {
                this.log(`📨 ${newLines.length} nuevas líneas detectadas`);

                // Emitir evento con nuevas líneas
                eventBus.emit('log:new-lines', {
                    lines: newLines,
                    count: newLines.length,
                    timestamp: Date.now(),
                    position: this.lastPosition
                });

                // Actualizar posición
                this.lastPosition += newLines.reduce((sum, line) => sum + line.length + 1, 0);
            }

        } catch (error) {
            this.logError('Error chequeando nuevas líneas:', error);

            eventBus.emit('log:monitor:error', {
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    /**
     * 📖 Leer nuevas líneas del log
     */
    async readNewLinesFromLog() {
        return new Promise((resolve) => {
            // En Overwolf: usar overwolf.io.readTextFile() con offset
            // Para testing: retornar array vacío o simular líneas

            try {
                // Simulación para testing
                const testLines = this.generateTestLines();
                resolve(testLines);
            } catch (error) {
                this.logError('Error leyendo archivo:', error);
                resolve([]);
            }
        });
    }

    /**
     * 🧪 Generar líneas de prueba (para testing)
     */
    generateTestLines() {
        // Para testing, no generar líneas constantemente
        // Solo retornar array vacío
        return [];
    }

    /**
     * 📊 Obtener estadísticas
     */
    getStats() {
        return {
            isMonitoring: this.isMonitoring,
            logPath: this.logFilePath,
            lastPosition: this.lastPosition,
            lastModified: this.lastModified,
            pollingDelay: this.pollingDelay
        };
    }

    /**
     * ⚙️ Configurar delay de polling
     */
    setPollingDelay(delayMs) {
        if (delayMs < 100) {
            this.logError('Polling delay debe ser >= 100ms');
            return false;
        }

        this.pollingDelay = delayMs;

        // Reiniciar monitoreo con nuevo delay
        if (this.isMonitoring) {
            this.stopMonitoring();
            this.startMonitoring();
        }

        this.log(`⚙️ Polling delay actualizado: ${delayMs}ms`);
        return true;
    }

    /**
     * 📝 Logging
     */
    log(message) {
        if (!this.debugMode) return;
        console.log(`⏱️ [LogMonitorAgent] ${message}`);
    }

    /**
     * ❌ Error logging
     */
    logError(message, error = null) {
        console.error(`❌ [LogMonitorAgent] ${message}`, error || '');
    }
}

export default LogMonitorAgent;
