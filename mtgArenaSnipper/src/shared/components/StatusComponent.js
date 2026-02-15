// src/presentation/components/ui/StatusComponent.js
// 📊 Componente de barra de estado

import BaseComponent from './BaseComponent.js';

class StatusComponent extends BaseComponent {
    constructor(eventBus, databaseManager) {
        super(eventBus, { databaseManager });
        
        this.state = {
            systemStatus: 'ready',
            message: 'Sistema listo',
            progress: 0,
            isLoading: false,
            stats: {
                cardsAnalyzed: 0,
                currentTurn: 0,
                predictionsCount: 0,
                deckCount: 0,
                lastUpdate: null
            }
        };
    }

    async onInitialize() {
        // Escuchar eventos de sistema
        this.eventBus.on('system:ready', () => {
            this.setState({ 
                systemStatus: 'ready',
                message: '✅ Sistema listo',
                isLoading: false
            });
        });

        this.eventBus.on('system:error', (data) => {
            this.setState({ 
                systemStatus: 'error',
                message: `❌ Error: ${data.error}`,
                isLoading: false
            });
        });

        // Escuchar actualizaciones de base de datos
        this.eventBus.on('database:update:started', () => {
            this.setState({ 
                systemStatus: 'updating',
                message: '🔄 Actualizando base de datos...',
                isLoading: true,
                progress: 0
            });
        });

        this.eventBus.on('database:update:completed', (data) => {
            this.setState({ 
                systemStatus: 'ready',
                message: `✅ Base de datos actualizada (${data.deckCount} mazos)`,
                isLoading: false,
                progress: 100,
                stats: { ...this.state.stats, deckCount: data.deckCount, lastUpdate: Date.now() }
            });
        });

        this.eventBus.on('database:update:failed', (data) => {
            this.setState({ 
                systemStatus: 'error',
                message: `❌ Error actualizando: ${data.error}`,
                isLoading: false,
                progress: 0
            });
        });

        // Escuchar cambios en el juego
        this.eventBus.on('turn:updated', (data) => {
            this.setState({ 
                stats: { ...this.state.stats, currentTurn: data.turn }
            });
        });

        this.eventBus.on('deck:prediction:updated', (data) => {
            this.setState({ 
                stats: { 
                    ...this.state.stats, 
                    cardsAnalyzed: data.cardsAnalyzed || 0,
                    predictionsCount: data.predictions?.length || 0
                }
            });
        });

        this.eventBus.on('game:reset', () => {
            this.setState({ 
                stats: { 
                    ...this.state.stats, 
                    cardsAnalyzed: 0,
                    currentTurn: 0,
                    predictionsCount: 0
                }
            });
        });
    }

    getTemplate() {
        return `
            <div class="status-component">
                <div class="status-main">
                    <div class="status-indicator ${this.state.systemStatus}">
                        <div class="status-icon">
                            ${this.getStatusIcon()}
                        </div>
                        <span class="status-message">${this.state.message}</span>
                    </div>

                    ${this.state.isLoading ? `
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${this.state.progress}%"></div>
                            </div>
                            <span class="progress-text">${this.state.progress}%</span>
                        </div>
                    ` : ''}
                </div>

                <div class="status-stats">
                    <div class="stat-item">
                        <span class="stat-label">Turno:</span>
                        <span class="stat-value">${this.state.stats.currentTurn || '-'}</span>
                    </div>
                    
                    <div class="stat-item">
                        <span class="stat-label">Cartas:</span>
                        <span class="stat-value">${this.state.stats.cardsAnalyzed}</span>
                    </div>
                    
                    <div class="stat-item">
                        <span class="stat-label">Predicciones:</span>
                        <span class="stat-value">${this.state.stats.predictionsCount}</span>
                    </div>
                    
                    <div class="stat-item">
                        <span class="stat-label">Mazos DB:</span>
                        <span class="stat-value">${this.state.stats.deckCount}</span>
                    </div>

                    ${this.state.stats.lastUpdate ? `
                        <div class="stat-item">
                            <span class="stat-label">Actualizado:</span>
                            <span class="stat-value">${this.formatLastUpdate()}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="status-actions">
                    <button class="btn btn-xs btn-secondary" id="show-stats" title="Ver estadísticas detalladas">
                        📊
                    </button>
                    <button class="btn btn-xs btn-secondary" id="export-logs" title="Exportar logs">
                        📋
                    </button>
                    <button class="btn btn-xs btn-secondary" id="refresh-status" title="Actualizar estado">
                        🔄
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Botón de estadísticas detalladas
        const statsBtn = this.$('#show-stats');
        if (statsBtn) {
            this.addEventListener(statsBtn, 'click', () => {
                this.showDetailedStats();
            });
        }

        // Botón de exportar logs
        const exportBtn = this.$('#export-logs');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => {
                this.exportLogs();
            });
        }

        // Botón de refresh
        const refreshBtn = this.$('#refresh-status');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => {
                this.refreshStatus();
            });
        }
    }

    getStatusIcon() {
        switch (this.state.systemStatus) {
            case 'ready': return '🟢';
            case 'updating': return '🔄';
            case 'error': return '🔴';
            case 'warning': return '🟡';
            default: return '⚪';
        }
    }

    showDetailedStats() {
        const stats = this.getDetailedStats();
        
        this.eventBus.emit('ui:show-modal', {
            title: '📊 Estadísticas detalladas',
            content: this.getStatsModalContent(stats),
            size: 'large'
        });
    }

    getDetailedStats() {
        const dbStats = this.dependencies.databaseManager?.getStats() || {};
        
        return {
            system: {
                uptime: this.formatUptime(),
                status: this.state.systemStatus,
                lastError: null
            },
            database: {
                deckCount: dbStats.deckCount || 0,
                lastUpdate: dbStats.lastUpdate,
                needsUpdate: dbStats.needsUpdate || false,
                isUpdating: dbStats.isUpdating || false
            },
            game: {
                cardsAnalyzed: this.state.stats.cardsAnalyzed,
                currentTurn: this.state.stats.currentTurn,
                predictionsCount: this.state.stats.predictionsCount
            },
            performance: {
                memoryUsage: this.getMemoryUsage(),
                eventBusStats: window.EventBus?.getStats() || {}
            }
        };
    }

    getStatsModalContent(stats) {
        return `
            <div class="stats-modal">
                <div class="stats-grid">
                    <div class="stats-section">
                        <h4>🖥️ Sistema</h4>
                        <div class="stats-list">
                            <div class="stat-row">
                                <span>Estado:</span>
                                <span class="stat-value">${stats.system.status}</span>
                            </div>
                            <div class="stat-row">
                                <span>Tiempo activo:</span>
                                <span class="stat-value">${stats.system.uptime}</span>
                            </div>
                        </div>
                    </div>

                    <div class="stats-section">
                        <h4>🗄️ Base de datos</h4>
                        <div class="stats-list">
                            <div class="stat-row">
                                <span>Mazos cargados:</span>
                                <span class="stat-value">${stats.database.deckCount}</span>
                            </div>
                            <div class="stat-row">
                                <span>Última actualización:</span>
                                <span class="stat-value">${this.formatDate(stats.database.lastUpdate)}</span>
                            </div>
                            <div class="stat-row">
                                <span>Necesita actualización:</span>
                                <span class="stat-value">${stats.database.needsUpdate ? 'Sí' : 'No'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="stats-section">
                        <h4>🎮 Juego</h4>
                        <div class="stats-list">
                            <div class="stat-row">
                                <span>Turno actual:</span>
                                <span class="stat-value">${stats.game.currentTurn || 'N/A'}</span>
                            </div>
                            <div class="stat-row">
                                <span>Cartas analizadas:</span>
                                <span class="stat-value">${stats.game.cardsAnalyzed}</span>
                            </div>
                            <div class="stat-row">
                                <span>Predicciones activas:</span>
                                <span class="stat-value">${stats.game.predictionsCount}</span>
                            </div>
                        </div>
                    </div>

                    <div class="stats-section">
                        <h4>📡 EventBus</h4>
                        <div class="stats-list">
                            <div class="stat-row">
                                <span>Tipos de eventos:</span>
                                <span class="stat-value">${stats.performance.eventBusStats.totalEventTypes || 0}</span>
                            </div>
                            <div class="stat-row">
                                <span>Listeners activos:</span>
                                <span class="stat-value">${stats.performance.eventBusStats.totalListeners || 0}</span>
                            </div>
                            <div class="stat-row">
                                <span>Eventos emitidos:</span>
                                <span class="stat-value">${stats.performance.eventBusStats.eventsEmitted || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    exportLogs() {
        const logs = {
            timestamp: new Date().toISOString(),
            stats: this.getDetailedStats(),
            eventHistory: window.EventBus?.getEventHistory() || [],
            systemInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            }
        };

        const dataStr = JSON.stringify(logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `mtgArenaSniffer-logs-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        this.log('📋 Logs exportados');
    }

    refreshStatus() {
        this.log('🔄 Actualizando estado...');
        
        // Solicitar actualización de estadísticas
        this.eventBus.emit('status:refresh-requested');
        
        // Obtener stats actualizadas del database manager
        if (this.dependencies.databaseManager) {
            const dbStats = this.dependencies.databaseManager.getStats();
            this.setState({
                stats: {
                    ...this.state.stats,
                    deckCount: dbStats.deckCount || 0,
                    lastUpdate: dbStats.lastUpdate
                }
            });
        }
    }

    formatLastUpdate() {
        if (!this.state.stats.lastUpdate) return 'N/A';
        
        const minutes = Math.floor((Date.now() - this.state.stats.lastUpdate) / 60000);
        
        if (minutes < 1) return 'ahora';
        if (minutes < 60) return `${minutes}m`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        
        const days = Math.floor(hours / 24);
        return `${days}d`;
    }

    formatUptime() {
        // Calcular tiempo desde que se cargó la página
        const uptimeMs = Date.now() - window.performance.timeOrigin;
        const minutes = Math.floor(uptimeMs / 60000);
        
        if (minutes < 60) return `${minutes}m`;
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        return `${hours}h ${remainingMinutes}m`;
    }

    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }

    shouldRerender(prevState, newState) {
        return prevState.systemStatus !== newState.systemStatus ||
               prevState.message !== newState.message ||
               prevState.isLoading !== newState.isLoading ||
               prevState.progress !== newState.progress ||
               JSON.stringify(prevState.stats) !== JSON.stringify(newState.stats);
    }
}

export default StatusComponent;