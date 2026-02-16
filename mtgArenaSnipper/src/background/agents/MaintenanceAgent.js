// src/background/agents/MaintenanceAgent.js
// 🔧 Agente de mantenimiento y optimización

import eventBus from '../../shared/events/EventBus.js';

class MaintenanceAgent {
    constructor() {
        this.debugMode = true;
        this.lastCleanup = Date.now();
        this.cleanupInterval = 5 * 60 * 1000; // 5 minutos
        this.performanceMetrics = [];
    }

    /**
     * 🚀 Inicializar agente
     */
    async initialize() {
        try {
            this.log('🔧 MaintenanceAgent: Inicializando...');

            // Configurar limpieza periódica
            this.setupPeriodicMaintenance();

            // Monitorear performance
            this.setupPerformanceMonitoring();

            this.log('✅ MaintenanceAgent inicializado');
            return true;

        } catch (error) {
            this.logError('Error inicializando:', error);
            return false;
        }
    }

    /**
     * ⚙️ Configurar mantenimiento periódico
     */
    setupPeriodicMaintenance() {
        setInterval(() => {
            this.performMaintenance();
        }, this.cleanupInterval);

        this.log(`⚙️ Mantenimiento configurado cada ${this.cleanupInterval / 1000}s`);
    }

    /**
     * 🧹 Realizar mantenimiento
     */
    performMaintenance() {
        try {
            this.log('🧹 Ejecutando mantenimiento...');

            // 1. Limpiar event history antiguo
            this.cleanupEventHistory();

            // 2. Optimizar cache
            this.optimizeCache();

            // 3. Recolectar basura
            this.collectMetrics();

            // 4. Verificar salud del sistema
            this.checkSystemHealth();

            this.lastCleanup = Date.now();
            this.log('✅ Mantenimiento completado');

        } catch (error) {
            this.logError('Error durante mantenimiento:', error);
        }
    }

    /**
     * 📝 Limpiar historial de eventos
     */
    cleanupEventHistory() {
        // El EventBus mantiene un máximo de 100 eventos
        // Esta es una verificación adicional
        this.log('📝 Limpiando historial de eventos');
    }

    /**
     * 💾 Optimizar cache
     */
    optimizeCache() {
        try {
            // Limpiar cache viejo en localStorage
            const now = Date.now();
            const maxCacheAge = 24 * 60 * 60 * 1000; // 24 horas

            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('mtgArenaSniffer_')) {
                    const value = localStorage.getItem(key);
                    try {
                        const data = JSON.parse(value);
                        if (data.timestamp && (now - data.timestamp) > maxCacheAge) {
                            localStorage.removeItem(key);
                            this.log(`🗑️ Cache expirado removido: ${key}`);
                        }
                    } catch (e) {
                        // No es JSON, dejar como está
                    }
                }
            });

            this.log('💾 Cache optimizado');

        } catch (error) {
            this.logError('Error optimizando cache:', error);
        }
    }

    /**
     * 📊 Recolectar métricas
     */
    collectMetrics() {
        try {
            const metric = {
                timestamp: Date.now(),
                memory: this.getMemoryUsage(),
                eventBusStats: eventBus.getStats()
            };

            this.performanceMetrics.push(metric);

            // Mantener solo últimos 100 puntos
            if (this.performanceMetrics.length > 100) {
                this.performanceMetrics.shift();
            }

            this.log(`📊 Métrica recolectada (memory: ${metric.memory.used}MB)`);

        } catch (error) {
            this.logError('Error recolectando métricas:', error);
        }
    }

    /**
     * 💻 Obtener uso de memoria
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
            };
        }
        return { used: 0, limit: 0 };
    }

    /**
     * 🏥 Verificar salud del sistema
     */
    checkSystemHealth() {
        try {
            const lastMetric = this.performanceMetrics[this.performanceMetrics.length - 1];

            if (!lastMetric) {
                this.log('⚠️ No hay métricas para verificar');
                return;
            }

            const { memory } = lastMetric;

            // Verificar si está cerca del límite
            if (memory.used > memory.limit * 0.8) {
                this.logError('⚠️ ALERTA: Uso de memoria > 80%');

                eventBus.emit('system:warning', {
                    type: 'high-memory',
                    message: `Uso de memoria: ${memory.used}MB / ${memory.limit}MB`,
                    timestamp: Date.now()
                });

                // Intenta limpiar
                this.aggressiveCleanup();
            } else {
                this.log(`🏥 Salud del sistema: OK (${memory.used}MB / ${memory.limit}MB)`);
            }

        } catch (error) {
            this.logError('Error verificando salud:', error);
        }
    }

    /**
     * 🧹 Limpieza agresiva de memoria
     */
    aggressiveCleanup() {
        this.log('🧹 Ejecutando limpieza agresiva...');

        // Limpiar localstorage completamente
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('mtgArenaSniffer_')) {
                localStorage.removeItem(key);
            }
        });

        // Mantener solo últimas métricas
        this.performanceMetrics = this.performanceMetrics.slice(-10);

        this.log('✅ Limpieza agresiva completada');
    }

    /**
     * 📈 Obtener resumen de performance
     */
    getPerformanceSummary() {
        if (this.performanceMetrics.length === 0) {
            return null;
        }

        const metrics = this.performanceMetrics;
        const memoryUsages = metrics.map(m => m.memory.used);

        return {
            totalMetrics: metrics.length,
            averageMemory: Math.round(memoryUsages.reduce((a, b) => a + b) / memoryUsages.length),
            maxMemory: Math.max(...memoryUsages),
            minMemory: Math.min(...memoryUsages),
            lastUpdated: metrics[metrics.length - 1].timestamp
        };
    }

    /**
     * 📝 Logging
     */
    log(message) {
        if (!this.debugMode) return;
        console.log(`🔧 [MaintenanceAgent] ${message}`);
    }

    /**
     * ❌ Error logging
     */
    logError(message, error = null) {
        console.error(`❌ [MaintenanceAgent] ${message}`, error || '');
    }
}

export default MaintenanceAgent;
