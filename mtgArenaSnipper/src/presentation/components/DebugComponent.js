// src/presentation/components/ui/DebugComponent.js
// 🔧 Componente de debug y análisis detallado

import BaseComponent from './BaseComponent.js';

class DebugComponent extends BaseComponent {
    constructor(eventBus, dependencies) {
        super(eventBus, dependencies);
        
        this.state = {
            activeTab: 'overview',
            eventHistory: [],
            systemStats: {},
            gameAnalysis: {},
            databaseInfo: {},
            predictionDetails: {},
            performanceMetrics: {},
            refreshInterval: null,
            autoRefresh: true,
            showAdvanced: false
        };

        // Tabs disponibles
        this.tabs = {
            overview: { label: '📊 Overview', icon: '📊' },
            events: { label: '📡 Events', icon: '📡' },
            database: { label: '🗄️ Database', icon: '🗄️' },
            predictions: { label: '🎯 Predictions', icon: '🎯' },
            game: { label: '🎮 Game State', icon: '🎮' },
            performance: { label: '⚡ Performance', icon: '⚡' },
            api: { label: '🌐 API Tests', icon: '🌐' }
        };
    }

    async onInitialize() {
        // Configurar auto-refresh de datos
        this.setupAutoRefresh();
        
        // Escuchar todos los eventos para debugging
        this.setupEventMonitoring();
        
        // Cargar datos iniciales
        await this.refreshAllData();
    }

    getTemplate() {
        return `
            <div class="debug-component">
                <div class="debug-header">
                    <h3>🔧 Debug & Analytics Dashboard</h3>
                    <div class="debug-controls">
                        <label class="auto-refresh-toggle">
                            <input type="checkbox" id="auto-refresh" ${this.state.autoRefresh ? 'checked' : ''}>
                            Auto-refresh
                        </label>
                        <button class="btn btn-sm btn-secondary" id="refresh-all">🔄 Refresh</button>
                        <button class="btn btn-sm btn-secondary" id="clear-logs">🧹 Clear</button>
                        <button class="btn btn-sm btn-secondary" id="export-debug">📤 Export</button>
                        <button class="btn btn-sm btn-secondary" id="toggle-advanced">
                            ${this.state.showAdvanced ? '🔬 Simple' : '🔬 Advanced'}
                        </button>
                    </div>
                </div>

                <div class="debug-tabs">
                    ${Object.entries(this.tabs).map(([key, tab]) => `
                        <button class="debug-tab ${this.state.activeTab === key ? 'active' : ''}" 
                                data-tab="${key}">
                            ${tab.icon} ${tab.label}
                        </button>
                    `).join('')}
                </div>

                <div class="debug-content">
                    ${this.getTabContent()}
                </div>
            </div>
        `;
    }

    getTabContent() {
        switch (this.state.activeTab) {
            case 'overview': return this.getOverviewTab();
            case 'events': return this.getEventsTab();
            case 'database': return this.getDatabaseTab();
            case 'predictions': return this.getPredictionsTab();
            case 'game': return this.getGameTab();
            case 'performance': return this.getPerformanceTab();
            case 'api': return this.getApiTab();
            default: return '<div>Tab not found</div>';
        }
    }

    getOverviewTab() {
        const stats = this.state.systemStats;
        
        return `
            <div class="debug-tab-content overview-tab">
                <div class="overview-grid">
                    <div class="overview-card">
                        <h4>🖥️ Sistema</h4>
                        <div class="stat-list">
                            <div class="stat-item">
                                <span>Estado:</span>
                                <span class="stat-value ${stats.systemStatus || 'unknown'}">${stats.systemStatus || 'N/A'}</span>
                            </div>
                            <div class="stat-item">
                                <span>Tiempo activo:</span>
                                <span class="stat-value">${this.formatUptime()}</span>
                            </div>
                            <div class="stat-item">
                                <span>Eventos totales:</span>
                                <span class="stat-value">${this.state.eventHistory.length}</span>
                            </div>
                        </div>
                    </div>

                    <div class="overview-card">
                        <h4>🗄️ Base de Datos</h4>
                        <div class="stat-list">
                            <div class="stat-item">
                                <span>Mazos cargados:</span>
                                <span class="stat-value">${this.state.databaseInfo.deckCount || 0}</span>
                            </div>
                            <div class="stat-item">
                                <span>Última actualización:</span>
                                <span class="stat-value">${this.formatTime(this.state.databaseInfo.lastUpdate)}</span>
                            </div>
                            <div class="stat-item">
                                <span>Estado:</span>
                                <span class="stat-value ${this.state.databaseInfo.isUpdating ? 'updating' : 'ready'}">
                                    ${this.state.databaseInfo.isUpdating ? 'Actualizando...' : 'Listo'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="overview-card">
                        <h4>🎯 Predicciones</h4>
                        <div class="stat-list">
                            <div class="stat-item">
                                <span>Cartas analizadas:</span>
                                <span class="stat-value">${this.state.predictionDetails.cardsAnalyzed || 0}</span>
                            </div>
                            <div class="stat-item">
                                <span>Predicciones activas:</span>
                                <span class="stat-value">${this.state.predictionDetails.predictionsCount || 0}</span>
                            </div>
                            <div class="stat-item">
                                <span>Mazo confirmado:</span>
                                <span class="stat-value ${this.state.predictionDetails.isConfirmed ? 'confirmed' : 'pending'}">
                                    ${this.state.predictionDetails.isConfirmed ? 'Sí' : 'No'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="overview-card">
                        <h4>⚡ Rendimiento</h4>
                        <div class="stat-list">
                            <div class="stat-item">
                                <span>Memoria usada:</span>
                                <span class="stat-value">${this.state.performanceMetrics.memoryUsage || 'N/A'} MB</span>
                            </div>
                            <div class="stat-item">
                                <span>FPS promedio:</span>
                                <span class="stat-value">${this.state.performanceMetrics.averageFPS || 'N/A'}</span>
                            </div>
                            <div class="stat-item">
                                <span>Latencia API:</span>
                                <span class="stat-value">${this.state.performanceMetrics.apiLatency || 'N/A'} ms</span>
                            </div>
                        </div>
                    </div>
                </div>

                ${this.state.showAdvanced ? `
                    <div class="advanced-overview">
                        <h4>🔬 Información Avanzada</h4>
                        <div class="advanced-grid">
                            <div class="advanced-item">
                                <strong>Event Bus:</strong>
                                <pre>${JSON.stringify(window.EventBus?.getStats() || {}, null, 2)}</pre>
                            </div>
                            <div class="advanced-item">
                                <strong>Browser Info:</strong>
                                <pre>${JSON.stringify({
                                    userAgent: navigator.userAgent,
                                    platform: navigator.platform,
                                    language: navigator.language,
                                    cookieEnabled: navigator.cookieEnabled,
                                    onLine: navigator.onLine
                                }, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getEventsTab() {
        const recentEvents = this.state.eventHistory.slice(-50).reverse();
        
        return `
            <div class="debug-tab-content events-tab">
                <div class="events-controls">
                    <div class="event-filters">
                        <select id="event-filter">
                            <option value="all">Todos los eventos</option>
                            <option value="game">Solo juego</option>
                            <option value="ui">Solo UI</option>
                            <option value="system">Solo sistema</option>
                            <option value="prediction">Solo predicciones</option>
                        </select>
                        <button class="btn btn-xs btn-secondary" id="clear-events">Limpiar</button>
                    </div>
                    <div class="event-stats">
                        <span>Eventos mostrados: ${recentEvents.length}</span>
                        <span>Total: ${this.state.eventHistory.length}</span>
                    </div>
                </div>

                <div class="events-list">
                    ${recentEvents.length > 0 ? recentEvents.map(event => `
                        <div class="event-item ${this.getEventType(event.eventName)}">
                            <div class="event-time">${this.formatEventTime(event.timestamp)}</div>
                            <div class="event-name">${event.eventName}</div>
                            <div class="event-data">
                                ${event.data ? `
                                    <details>
                                        <summary>Ver datos</summary>
                                        <pre>${JSON.stringify(event.data, null, 2)}</pre>
                                    </details>
                                ` : '<span class="no-data">Sin datos</span>'}
                            </div>
                            <div class="event-listeners">${event.listenersCount || 0} listeners</div>
                        </div>
                    `).join('') : '<div class="no-events">No hay eventos registrados</div>'}
                </div>
            </div>
        `;
    }

    getDatabaseTab() {
        const dbInfo = this.state.databaseInfo;
        
        return `
            <div class="debug-tab-content database-tab">
                <div class="database-status">
                    <h4>📊 Estado de la Base de Datos</h4>
                    <div class="status-grid">
                        <div class="status-item">
                            <label>Estado:</label>
                            <span class="status-value ${dbInfo.status || 'unknown'}">${dbInfo.status || 'Desconocido'}</span>
                        </div>
                        <div class="status-item">
                            <label>Mazos cargados:</label>
                            <span class="status-value">${dbInfo.deckCount || 0}</span>
                        </div>
                        <div class="status-item">
                            <label>Necesita actualización:</label>
                            <span class="status-value">${dbInfo.needsUpdate ? 'Sí' : 'No'}</span>
                        </div>
                        <div class="status-item">
                            <label>Cache válido:</label>
                            <span class="status-value">${!dbInfo.needsUpdate ? 'Sí' : 'No'}</span>
                        </div>
                    </div>
                </div>

                <div class="database-actions">
                    <button class="btn btn-sm btn-primary" id="force-db-update">🔄 Forzar Actualización</button>
                    <button class="btn btn-sm btn-secondary" id="clear-db-cache">🗑️ Limpiar Cache</button>
                    <button class="btn btn-sm btn-secondary" id="export-db-data">📤 Exportar Datos</button>
                    <button class="btn btn-sm btn-secondary" id="test-scraper">🧪 Test Scraper</button>
                </div>

                ${dbInfo.decks && dbInfo.decks.length > 0 ? `
                    <div class="database-decks">
                        <h4>🃏 Mazos en Base de Datos (Top 10)</h4>
                        <div class="decks-table">
                            <div class="deck-header">
                                <span>Rank</span>
                                <span>Nombre</span>
                                <span>Meta Share</span>
                                <span>Arquetipo</span>
                                <span>Cartas Clave</span>
                            </div>
                            ${dbInfo.decks.slice(0, 10).map(deck => `
                                <div class="deck-row">
                                    <span class="deck-rank">#${deck.rank || 0}</span>
                                    <span class="deck-name">${deck.name || 'N/A'}</span>
                                    <span class="deck-meta">${(deck.metaShare || 0).toFixed(1)}%</span>
                                    <span class="deck-archetype">${deck.archetype || 'N/A'}</span>
                                    <span class="deck-keys">${(deck.keyCards || []).length}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${this.state.showAdvanced ? `
                    <div class="database-advanced">
                        <h4>🔬 Información Técnica</h4>
                        <pre>${JSON.stringify(dbInfo, null, 2)}</pre>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getPredictionsTab() {
        const predictions = this.state.predictionDetails;
        
        return `
            <div class="debug-tab-content predictions-tab">
                <div class="prediction-overview">
                    <h4>🎯 Estado del Motor de Predicción</h4>
                    <div class="prediction-stats">
                        <div class="stat-card">
                            <div class="stat-number">${predictions.cardsAnalyzed || 0}</div>
                            <div class="stat-label">Cartas Analizadas</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${predictions.currentTurn || 0}</div>
                            <div class="stat-label">Turno Actual</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${predictions.predictionsCount || 0}</div>
                            <div class="stat-label">Predicciones Activas</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${(predictions.colorsDetected || []).length}</div>
                            <div class="stat-label">Colores Detectados</div>
                        </div>
                    </div>
                </div>

                ${predictions.currentPredictions && predictions.currentPredictions.length > 0 ? `
                    <div class="current-predictions">
                        <h4>📊 Predicciones Actuales</h4>
                        <div class="predictions-list">
                            ${predictions.currentPredictions.map((pred, index) => `
                                <div class="prediction-item">
                                    <div class="prediction-header">
                                        <span class="prediction-rank">#${index + 1}</span>
                                        <span class="prediction-name">${pred.deck?.name || 'N/A'}</span>
                                        <span class="prediction-probability">${(pred.probability * 100).toFixed(1)}%</span>
                                        <span class="prediction-confidence confidence-${pred.confidence}">${pred.confidence}</span>
                                    </div>
                                    <div class="prediction-details">
                                        <div class="matched-cards">
                                            <strong>Cartas coincidentes:</strong>
                                            ${(pred.matchedCards || []).map(card => `
                                                <span class="matched-card">${card.card} (+${card.score?.toFixed(0) || 0})</span>
                                            `).join('')}
                                        </div>
                                        ${this.state.showAdvanced && pred.breakdown ? `
                                            <div class="score-breakdown">
                                                <strong>Desglose de puntuación:</strong>
                                                <pre>${JSON.stringify(pred.breakdown, null, 2)}</pre>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${predictions.opponentCards && predictions.opponentCards.length > 0 ? `
                    <div class="opponent-cards">
                        <h4>🃏 Cartas del Oponente</h4>
                        <div class="cards-timeline">
                            ${predictions.opponentCards.map(card => `
                                <div class="card-item">
                                    <div class="card-turn">T${card.turn}</div>
                                    <div class="card-name">${card.name}</div>
                                    <div class="card-colors">${(card.colors || []).join('')}</div>
                                    <div class="card-time">${this.formatTime(card.timestamp)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="prediction-actions">
                    <button class="btn btn-sm btn-primary" id="refresh-predictions">🔄 Actualizar Predicciones</button>
                    <button class="btn btn-sm btn-secondary" id="reset-predictions">↻ Reset Engine</button>
                    <button class="btn btn-sm btn-secondary" id="test-prediction">🧪 Test con Carta</button>
                </div>
            </div>
        `;
    }

    getGameTab() {
        const gameState = this.state.gameAnalysis;
        
        return `
            <div class="debug-tab-content game-tab">
                <div class="game-overview">
                    <h4>🎮 Estado del Juego</h4>
                    <div class="game-stats">
                        <div class="game-stat">
                            <label>Juego activo:</label>
                            <span class="stat-value ${gameState.isActive ? 'active' : 'inactive'}">
                                ${gameState.isActive ? 'Sí' : 'No'}
                            </span>
                        </div>
                        <div class="game-stat">
                            <label>Número de juego:</label>
                            <span class="stat-value">${gameState.gameNumber || 1}</span>
                        </div>
                        <div class="game-stat">
                            <label>Tiempo de juego:</label>
                            <span class="stat-value">${gameState.gameTimeMinutes || 0} min</span>
                        </div>
                        <div class="game-stat">
                            <label>Formato detectado:</label>
                            <span class="stat-value">${gameState.format || 'Standard'}</span>
                        </div>
                    </div>
                </div>

                <div class="game-context">
                    <h4>🎯 Contexto de Juego</h4>
                    <div class="context-grid">
                        <div class="context-item">
                            <strong>Colores detectados:</strong>
                            <div class="colors-display">
                                ${(gameState.colorsDetected || []).map(color => `
                                    <span class="mana-symbol mana-${color}">${color}</span>
                                `).join('') || '<span class="no-colors">Ninguno</span>'}
                            </div>
                        </div>
                        <div class="context-item">
                            <strong>Patrón de juego:</strong>
                            <div class="play-pattern">
                                ${(gameState.playPattern || []).map(play => `
                                    <div class="play-item">T${play.turn}: ${play.card}</div>
                                `).join('') || '<span class="no-pattern">Sin patrón detectado</span>'}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="game-actions">
                    <button class="btn btn-sm btn-primary" id="simulate-card">🧪 Simular Carta</button>
                    <button class="btn btn-sm btn-secondary" id="advance-turn">⏭️ Avanzar Turno</button>
                    <button class="btn btn-sm btn-secondary" id="reset-game-debug">↻ Reset Juego</button>
                </div>

                ${this.state.showAdvanced ? `
                    <div class="game-advanced">
                        <h4>🔬 Estado Completo</h4>
                        <pre>${JSON.stringify(gameState, null, 2)}</pre>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getPerformanceTab() {
        const perf = this.state.performanceMetrics;
        
        return `
            <div class="debug-tab-content performance-tab">
                <div class="performance-overview">
                    <h4>⚡ Métricas de Rendimiento</h4>
                    <div class="perf-grid">
                        <div class="perf-card">
                            <div class="perf-value">${perf.memoryUsage || 'N/A'}</div>
                            <div class="perf-label">Memoria (MB)</div>
                        </div>
                        <div class="perf-card">
                            <div class="perf-value">${perf.averageFPS || 'N/A'}</div>
                            <div class="perf-label">FPS Promedio</div>
                        </div>
                        <div class="perf-card">
                            <div class="perf-value">${perf.apiLatency || 'N/A'}</div>
                            <div class="perf-label">Latencia API (ms)</div>
                        </div>
                        <div class="perf-card">
                            <div class="perf-value">${perf.renderTime || 'N/A'}</div>
                            <div class="perf-label">Tiempo Render (ms)</div>
                        </div>
                    </div>
                </div>

                <div class="performance-tests">
                    <h4>🧪 Tests de Rendimiento</h4>
                    <div class="test-buttons">
                        <button class="btn btn-sm btn-primary" id="test-memory">🧠 Test Memoria</button>
                        <button class="btn btn-sm btn-primary" id="test-render">🎨 Test Render</button>
                        <button class="btn btn-sm btn-primary" id="test-api">🌐 Test API</button>
                        <button class="btn btn-sm btn-primary" id="test-eventbus">📡 Test EventBus</button>
                    </div>
                </div>

                <div class="performance-monitor">
                    <h4>📊 Monitor en Tiempo Real</h4>
                    <div class="monitor-display">
                        <canvas id="performance-chart" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    getApiTab() {
        return `
            <div class="debug-tab-content api-tab">
                <div class="api-tests">
                    <h4>🌐 Tests de API</h4>
                    
                    <div class="test-section">
                        <h5>Scryfall API</h5>
                        <div class="test-controls">
                            <input type="text" id="scryfall-card" placeholder="Nombre de carta" value="Lightning Bolt">
                            <button class="btn btn-sm btn-primary" id="test-scryfall">🔍 Test Scryfall</button>
                        </div>
                        <div id="scryfall-result" class="api-result"></div>
                    </div>

                    <div class="test-section">
                        <h5>MTGGoldfish Scraping</h5>
                        <div class="test-controls">
                            <button class="btn btn-sm btn-primary" id="test-mtggoldfish">🐟 Test MTGGoldfish</button>
                            <button class="btn btn-sm btn-secondary" id="test-scraper-full">🔄 Test Completo</button>
                        </div>
                        <div id="mtggoldfish-result" class="api-result"></div>
                    </div>

                    <div class="test-section">
                        <h5>CORS Proxy</h5>
                        <div class="test-controls">
                            <input type="url" id="proxy-url" placeholder="URL a testear">
                            <button class="btn btn-sm btn-primary" id="test-proxy">🔗 Test Proxy</button>
                        </div>
                        <div id="proxy-result" class="api-result"></div>
                    </div>
                </div>

                <div class="api-logs">
                    <h4>📋 Logs de API</h4>
                    <div id="api-logs-container" class="logs-container">
                        <!-- Los logs se añadirán dinámicamente -->
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Tabs
        this.$$('.debug-tab').forEach(tab => {
            this.addEventListener(tab, 'click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.setState({ activeTab: tabName });
            });
        });

        // Controls generales
        this.setupGeneralControls();
        
        // Controls específicos de cada tab
        this.setupTabSpecificControls();
    }

    setupGeneralControls() {
        const autoRefreshToggle = this.$('#auto-refresh');
        if (autoRefreshToggle) {
            this.addEventListener(autoRefreshToggle, 'change', (e) => {
                this.setState({ autoRefresh: e.target.checked });
                if (e.target.checked) {
                    this.setupAutoRefresh();
                } else {
                    this.clearAutoRefresh();
                }
            });
        }

        const refreshBtn = this.$('#refresh-all');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => {
                this.refreshAllData();
            });
        }

        const clearBtn = this.$('#clear-logs');
        if (clearBtn) {
            this.addEventListener(clearBtn, 'click', () => {
                this.clearLogs();
            });
        }

        const exportBtn = this.$('#export-debug');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => {
                this.exportDebugData();
            });
        }

        const advancedBtn = this.$('#toggle-advanced');
        if (advancedBtn) {
            this.addEventListener(advancedBtn, 'click', () => {
                this.setState({ showAdvanced: !this.state.showAdvanced });
            });
        }
    }

    setupTabSpecificControls() {
        // Database tab
        const forceUpdateBtn = this.$('#force-db-update');
        if (forceUpdateBtn) {
            this.addEventListener(forceUpdateBtn, 'click', () => {
                this.eventBus.emit('database:force-update');
            });
        }

        // API tab
        const scryfallBtn = this.$('#test-scryfall');
        if (scryfallBtn) {
            this.addEventListener(scryfallBtn, 'click', () => {
                this.testScryfall();
            });
        }

        // Performance tab
        const memoryTestBtn = this.$('#test-memory');
        if (memoryTestBtn) {
            this.addEventListener(memoryTestBtn, 'click', () => {
                this.testMemoryUsage();
            });
        }

        // Game tab
        const simulateBtn = this.$('#simulate-card');
        if (simulateBtn) {
            this.addEventListener(simulateBtn, 'click', () => {
                this.simulateCardPlay();
            });
        }
    }

    setupAutoRefresh() {
        this.clearAutoRefresh();
        if (this.state.autoRefresh) {
            this.state.refreshInterval = setInterval(() => {
                this.refreshAllData();
            }, 5000); // Cada 5 segundos
        }
    }

    clearAutoRefresh() {
        if (this.state.refreshInterval) {
            clearInterval(this.state.refreshInterval);
            this.state.refreshInterval = null;
        }
    }

    setupEventMonitoring() {
        // Interceptar todos los eventos del EventBus
        const originalEmit = this.eventBus.emit.bind(this.eventBus);
        this.eventBus.emit = (eventName, data) => {
            // Registrar evento
            this.state.eventHistory.push({
                eventName,
                data,
                timestamp: Date.now(),
                listenersCount: this.eventBus.getListenerCount(eventName)
            });

            // Mantener solo los últimos 200 eventos
            if (this.state.eventHistory.length > 200) {
                this.state.eventHistory.shift();
            }

            // Llamar al emit original
            return originalEmit(eventName, data);
        };
    }

    async refreshAllData() {
        try {
            // Recopilar datos de todos los servicios
            const [systemStats, databaseInfo, predictionDetails, gameAnalysis, performanceMetrics] = await Promise.allSettled([
                this.getSystemStats(),
                this.getDatabaseInfo(),
                this.getPredictionDetails(),
                this.getGameAnalysis(),
                this.getPerformanceMetrics()
            ]);

            this.setState({
                systemStats: systemStats.value || {},
                databaseInfo: databaseInfo.value || {},
                predictionDetails: predictionDetails.value || {},
                gameAnalysis: gameAnalysis.value || {},
                performanceMetrics: performanceMetrics.value || {}
            });

        } catch (error) {
            this.logError('Error refreshing debug data:', error);
        }
    }

    async getSystemStats() {
        return {
            systemStatus: 'ready',
            uptime: Date.now() - window.performance.timeOrigin,
            eventBusStats: window.EventBus?.getStats() || {},
            componentsLoaded: Object.keys(this.dependencies).length
        };
    }

    async getDatabaseInfo() {
        if (this.dependencies.database) {
            const stats = this.dependencies.database.getStats();
            const metaData = await this.dependencies.database.getMetaData().catch(() => null);
            
            return {
                ...stats,
                decks: metaData?.decks || [],
                metaStats: metaData?.metaStats || {}
            };
        }
        return {};
    }

    async getPredictionDetails() {
        if (this.dependencies.prediction) {
            const stats = this.dependencies.prediction.getStats();
            const predictions = this.dependencies.prediction.getCurrentPredictions();
            
            return {
                ...stats,
                currentPredictions: predictions,
                opponentCards: this.dependencies.prediction.opponentCards || []
            };
        }
        return {};
    }

    async getGameAnalysis() {
        if (this.dependencies.game) {
            return this.dependencies.game.getStats();
        }
        return {};
    }

    async getPerformanceMetrics() {
        const metrics = {
            memoryUsage: this.getMemoryUsage(),
            averageFPS: this.calculateAverageFPS(),
            apiLatency: this.getAverageApiLatency(),
            renderTime: this.getAverageRenderTime()
        };

        return metrics;
    }

    getMemoryUsage() {
        if (performance.memory) {
            return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        }
        return null;
    }

    calculateAverageFPS() {
        // Estimación básica de FPS
        return Math.round(1000 / 16.67); // ~60 FPS ideal
    }

    getAverageApiLatency() {
        // Placeholder - se podría mejorar con mediciones reales
        return Math.round(Math.random() * 200 + 50); // 50-250ms
    }

    getAverageRenderTime() {
        // Placeholder - se podría mejorar con mediciones reales
        return Math.round(Math.random() * 10 + 5); // 5-15ms
    }

    getEventType(eventName) {
        if (eventName.startsWith('game:')) return 'game';
        if (eventName.startsWith('ui:')) return 'ui';
        if (eventName.startsWith('system:')) return 'system';
        if (eventName.startsWith('deck:') || eventName.startsWith('prediction:')) return 'prediction';
        if (eventName.startsWith('database:')) return 'database';
        return 'other';
    }

    formatEventTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
    }

    formatUptime() {
        const uptimeMs = Date.now() - window.performance.timeOrigin;
        const minutes = Math.floor(uptimeMs / 60000);
        const seconds = Math.floor((uptimeMs % 60000) / 1000);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }

    formatTime(timestamp) {
        if (!timestamp) return 'N/A';
        
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) { // menos de 1 minuto
            return 'hace unos segundos';
        } else if (diff < 3600000) { // menos de 1 hora
            const minutes = Math.floor(diff / 60000);
            return `hace ${minutes}m`;
        } else {
            return new Date(timestamp).toLocaleTimeString('es-ES');
        }
    }

    clearLogs() {
        this.setState({ eventHistory: [] });
        this.log('🧹 Logs limpiados');
    }

    exportDebugData() {
        const debugData = {
            timestamp: new Date().toISOString(),
            systemStats: this.state.systemStats,
            databaseInfo: this.state.databaseInfo,
            predictionDetails: this.state.predictionDetails,
            gameAnalysis: this.state.gameAnalysis,
            performanceMetrics: this.state.performanceMetrics,
            eventHistory: this.state.eventHistory.slice(-100), // Últimos 100 eventos
            browserInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            }
        };

        const dataStr = JSON.stringify(debugData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `mtgArenaSniffer-debug-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        this.log('📤 Datos de debug exportados');
    }

    async testScryfall() {
        const cardName = this.$('#scryfall-card')?.value || 'Lightning Bolt';
        const resultContainer = this.$('#scryfall-result');
        
        if (!resultContainer) return;
        
        resultContainer.innerHTML = '<div class="loading">🔍 Buscando en Scryfall...</div>';
        
        try {
            const response = await fetch(
                `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            resultContainer.innerHTML = `
                <div class="api-success">
                    <h6>✅ Scryfall API funcionando</h6>
                    <div class="card-info">
                        <strong>${data.name}</strong> - ${data.mana_cost || 'Sin costo'}
                        <br><small>${data.type_line}</small>
                        <br><small>Set: ${data.set_name} (${data.set})</small>
                    </div>
                </div>
            `;
            
        } catch (error) {
            resultContainer.innerHTML = `
                <div class="api-error">
                    <h6>❌ Error en Scryfall API</h6>
                    <pre>${error.message}</pre>
                </div>
            `;
        }
    }

    testMemoryUsage() {
        const memInfo = this.getMemoryUsage();
        const performanceInfo = {
            memory: memInfo,
            timing: performance.timing,
            navigation: performance.navigation
        };
        
        this.log('🧠 Test de memoria ejecutado', performanceInfo);
        
        // Crear objetos temporales para testear memoria
        const testArray = new Array(100000).fill(0).map((_, i) => ({ id: i, data: `test_${i}` }));
        
        setTimeout(() => {
            // Liberar memoria
            testArray.length = 0;
            
            const newMemInfo = this.getMemoryUsage();
            this.log('🧠 Memoria después del test', { before: memInfo, after: newMemInfo });
        }, 1000);
    }

    simulateCardPlay() {
        const testCards = [
            'Lightning Bolt',
            'Counterspell', 
            'Teferi, Hero of Dominaria',
            'Mountain',
            'Island'
        ];
        
        const randomCard = testCards[Math.floor(Math.random() * testCards.length)];
        const randomTurn = Math.floor(Math.random() * 10) + 1;
        
        const cardData = {
            name: randomCard,
            turn: randomTurn,
            timestamp: Date.now()
        };
        
        this.log(`🧪 Simulando carta: ${randomCard} en turno ${randomTurn}`);
        this.eventBus.emit('ui:card-added', { card: cardData });
    }

    onCleanup() {
        this.clearAutoRefresh();
        this.log('🧹 DebugComponent limpiado');
    }

    shouldRerender(prevState, newState) {
        return prevState.activeTab !== newState.activeTab ||
               prevState.showAdvanced !== newState.showAdvanced ||
               prevState.eventHistory.length !== newState.eventHistory.length ||
               JSON.stringify(prevState.systemStats) !== JSON.stringify(newState.systemStats);
    }
}

export default DebugComponent;