// src/shared/utils/GlobalErrorHandler.js
// ⚠️ Manejador global de errores

class GlobalErrorHandler {
    constructor(eventBus = null) {
        this.eventBus = eventBus;
        this.debugMode = true;
        this.errorLog = [];
        this.maxErrors = 50;
    }

    /**
     * 🚀 Inicializar handler
     */
    initialize() {
        this.log('⚠️ GlobalErrorHandler: Inicializando...');

        // Capturar errores no manejados
        window.addEventListener('error', (event) => {
            this.handleWindowError(event);
        });

        // Capturar promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleUnhandledRejection(event);
        });

        this.log('✅ GlobalErrorHandler inicializado');
    }

    /**
     * ⚠️ Manejar errores de window
     */
    handleWindowError(event) {
        const { message, filename, lineno, colno, error } = event;

        const errorInfo = {
            type: 'WindowError',
            message,
            file: filename,
            line: lineno,
            column: colno,
            stack: error?.stack || '',
            timestamp: Date.now()
        };

        this.logError('Window Error:', errorInfo);
        this.emitError(errorInfo);

        // Prevenir que el error se propague
        event.preventDefault();
    }

    /**
     * 🚫 Manejar promise rejections
     */
    handleUnhandledRejection(event) {
        const { reason } = event;

        const errorInfo = {
            type: 'UnhandledRejection',
            message: reason?.message || String(reason),
            stack: reason?.stack || '',
            reason,
            timestamp: Date.now()
        };

        this.logError('Unhandled Promise Rejection:', errorInfo);
        this.emitError(errorInfo);

        // Prevenir que se propague
        event.preventDefault();
    }

    /**
     * 📨 Emitir error al EventBus
     */
    emitError(errorInfo) {
        this.recordError(errorInfo);

        if (this.eventBus) {
            this.eventBus.emit('system:error', {
                ...errorInfo,
                logged: true
            });
        }
    }

    /**
     * 📝 Registrar error
     */
    recordError(errorInfo) {
        this.errorLog.push(errorInfo);

        // Mantener solo últimos N errores
        if (this.errorLog.length > this.maxErrors) {
            this.errorLog.shift();
        }

        this.log(`📝 Error registrado (total: ${this.errorLog.length})`);
    }

    /**
     * 📊 Obtener resumen de errores
     */
    getErrorSummary() {
        const summary = {
            totalErrors: this.errorLog.length,
            errorsByType: {},
            recent: []
        };

        this.errorLog.forEach(error => {
            summary.errorsByType[error.type] = (summary.errorsByType[error.type] || 0) + 1;
        });

        // Últimos 5 errores
        summary.recent = this.errorLog.slice(-5);

        return summary;
    }

    /**
     * 🧹 Limpiar logs de error
     */
    clearErrorLog() {
        this.errorLog = [];
        this.log('🧹 Logs de error limpiados');
    }

    /**
     * 📤 Exportar logs
     */
    exportLogs() {
        return JSON.stringify(this.errorLog, null, 2);
    }

    /**
     * 📝 Logging
     */
    log(message) {
        if (!this.debugMode) return;
        console.log(`⚠️ [GlobalErrorHandler] ${message}`);
    }

    /**
     * ❌ Error logging
     */
    logError(message, error = null) {
        console.error(`❌ [GlobalErrorHandler] ${message}`, error || '');
    }
}

// Crear instancia global
const globalErrorHandler = new GlobalErrorHandler();

export { GlobalErrorHandler, globalErrorHandler };
