// src/presentation/components/HeaderComponent.js
// 📋 Header con branding mágico personalizado

import BaseComponent from './BaseComponent.js';

class HeaderComponent extends BaseComponent {
    constructor(eventBus, uiService) {
        super(eventBus, { uiService });
        
        this.state = {
            currentView: 'prediction',
            isConnected: false,
            gameDetected: false,
            formatDetected: 'standard',
            lastUpdate: null,
            dbStats: {
                deckCount: 0,
                isUpdating: false
            }
        };
    }

    async onInitialize() {
        // Escuchar cambios de vista
        this.eventBus.on('ui:view-changed', (data) => {
            this.setState({ currentView: data.to });
        });

        // Escuchar estado de conexión MTG Arena
        this.eventBus.on('mtg:arena:detected', (data) => {
            this.setState({ 
                gameDetected: true,
                isConnected: true 
            });
        });

        this.eventBus.on('mtg:arena:lost', () => {
            this.setState({ 
                gameDetected: false,
                isConnected: false 
            });
        });

        // Escuchar actualizaciones de base de datos
        this.eventBus.on('database:updated', (data) => {
            this.setState({ 
                lastUpdate: Date.now(),
                dbStats: {
                    deckCount: data.deckCount || 0,
                    isUpdating: false
                }
            });
        });

        this.eventBus.on('database:update:started', () => {
            this.setState({ 
                dbStats: { ...this.state.dbStats, isUpdating: true }
            });
        });

        this.eventBus.on('database:update:completed', (data) => {
            this.setState({ 
                dbStats: {
                    deckCount: data.deckCount || 0,
                    isUpdating: false
                },
                lastUpdate: Date.now()
            });
        });

        // Cargar stats iniciales
        await this.loadInitialStats();
    }

    async loadInitialStats() {
        try {
            if (this.dependencies.uiService?.gameService?.databaseManager) {
                const metaData = await this.dependencies.uiService.gameService.databaseManager.getMetaData();
                if (metaData) {
                    this.setState({
                        dbStats: {
                            deckCount: metaData.deckCount || metaData.decks?.length || 0,
                            isUpdating: false
                        }
                    });
                }
            }
        } catch (error) {
            this.log('⚠️ Error cargando stats iniciales:', error);
        }
    }

    getTemplate() {
        return `
            <div class="header-component">
                <!-- Partículas mágicas de fondo -->
                <div class="magic-particles"></div>
                
                <div class="header-brand">
                    <div class="brand-icon">🔮</div>
                    <div class="brand-text">
                        <h1 class="brand-title">MTG Arena Sniffer</h1>
                        <div class="brand-tagline">Deck Detection • Meta Analysis</div>
                    </div>
                </div>

                <div class="header-navigation">
                    <nav class="nav-tabs">
                        <button class="nav-tab ${this.state.currentView === 'prediction' ? 'active' : ''}" 
                                data-view="prediction">
                            🎯 Predicciones
                        </button>
                        <button class="nav-tab ${this.state.currentView === 'confirmed' ? 'active' : ''}" 
                                data-view="confirmed">
                            📋 Confirmado
                        </button>
                        <button class="nav-tab ${this.state.currentView === 'meta-browser' ? 'active' : ''}" 
                                data-view="meta-browser">
                            🗂️ Meta Browser
                        </button>
                        <button class="nav-tab ${this.state.currentView === 'debug' ? 'active' : ''}" 
                                data-view="debug">
                            🔧 Debug
                        </button>
                    </nav>
                </div>

                <div class="header-status">
                    <div class="status-indicators">
                        <div class="status-item ${this.state.gameDetected ? 'connected' : 'disconnected'}">
                            <div class="status-dot"></div>
                            <span class="status-text">
                                ${this.state.gameDetected ? 'Arena Conectado' : 'Esperando Arena'}
                            </span>
                        </div>
                        
                        <div class="status-item format">
                            <span class="format-badge">${this.state.formatDetected.toUpperCase()}</span>
                        </div>

                        <div class="status-item database">
                            <span class="db-status">
                                ${this.state.dbStats.isUpdating ? 
                                    '🔄 Actualizando...' : 
                                    `📊 ${this.state.dbStats.deckCount} mazos`
                                }
                            </span>
                        </div>

                        ${this.state.lastUpdate ? `
                            <div class="status-item update">
                                <span class="update-time">
                                    🕒 ${this.formatLastUpdate()}
                                </span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="header-actions">
                        <button class="btn btn-sm action-btn" 
                                id="force-update-btn" 
                                title="Actualizar base de datos"
                                ${this.state.dbStats.isUpdating ? 'disabled' : ''}>
                            ${this.state.dbStats.isUpdating ? '⏳' : '🔄'}
                        </button>
                        <button class="btn btn-sm action-btn" 
                                id="reset-game-btn" 
                                title="Reiniciar juego actual">
                            ↻
                        </button>
                        <button class="btn btn-sm action-btn" 
                                id="settings-btn" 
                                title="Configuración">
                            ⚙️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Navegación entre vistas
        this.$$('.nav-tab').forEach(tab => {
            this.addEventListener(tab, 'click', (e) => {
                const view = e.target.getAttribute('data-view');
                if (view !== this.state.currentView) {
                    this.changeView(view);
                }
            });
        });

        // Botón de actualización forzada
        const updateBtn = this.$('#force-update-btn');
        if (updateBtn) {
            this.addEventListener(updateBtn, 'click', () => {
                this.forceUpdate();
            });
        }

        // Botón de reset
        const resetBtn = this.$('#reset-game-btn');
        if (resetBtn) {
            this.addEventListener(resetBtn, 'click', () => {
                this.resetGame();
            });
        }

        // Botón de configuración
        const settingsBtn = this.$('#settings-btn');
        if (settingsBtn) {
            this.addEventListener(settingsBtn, 'click', () => {
                this.showSettings();
            });
        }
    }

    changeView(view) {
        if (this.state.currentView === view) return;

        this.log(`📍 Cambiando vista: ${this.state.currentView} → ${view}`);
        
        // Añadir efecto visual al botón
        const activeTab = this.$(`.nav-tab[data-view="${view}"]`);
        if (activeTab) {
            activeTab.classList.add('magic-shimmer');
            setTimeout(() => {
                activeTab.classList.remove('magic-shimmer');
            }, 600);
        }
        
        this.eventBus.emit('ui:view-change-requested', { view });
    }

    async forceUpdate() {
        this.log('🔄 Iniciando actualización forzada...');
        
        // Feedback visual
        const updateBtn = this.$('#force-update-btn');
        if (updateBtn) {
            updateBtn.classList.add('magic-shimmer');
            updateBtn.disabled = true;
        }
        
        // Emitir evento
        this.eventBus.emit('database:force-update');
        
        // Mostrar notificación si el servicio está disponible
        if (this.dependencies.uiService && this.dependencies.uiService.showNotification) {
            this.dependencies.uiService.showNotification({
                type: 'info',
                title: '🔄 Actualización iniciada',
                message: 'Descargando mazos meta actualizados...',
                duration: 3000
            });
        }

        // Remover efecto después de 3 segundos
        setTimeout(() => {
            if (updateBtn) {
                updateBtn.classList.remove('magic-shimmer');
            }
        }, 3000);
    }

    resetGame() {
        this.log('↻ Reiniciando juego...');
        
        // Feedback visual
        const resetBtn = this.$('#reset-game-btn');
        if (resetBtn) {
            resetBtn.classList.add('magic-shimmer');
            setTimeout(() => {
                resetBtn.classList.remove('magic-shimmer');
            }, 1000);
        }
        
        this.eventBus.emit('game:reset');
        
        if (this.dependencies.uiService && this.dependencies.uiService.showNotification) {
            this.dependencies.uiService.showNotification({
                type: 'success',
                title: '↻ Juego reiniciado',
                message: 'Listo para nueva partida',
                duration: 2000
            });
        }
    }

    showSettings() {
        this.log('⚙️ Abriendo configuración...');
        
        // Por ahora mostrar modal simple
        if (this.dependencies.uiService && this.dependencies.uiService.showNotification) {
            this.dependencies.uiService.showNotification({
                type: 'info',
                title: '⚙️ Configuración',
                message: 'Panel de configuración próximamente disponible',
                duration: 3000
            });
        }
    }

    formatLastUpdate() {
        if (!this.state.lastUpdate) return '';
        
        const minutes = Math.floor((Date.now() - this.state.lastUpdate) / 60000);
        
        if (minutes < 1) return 'ahora';
        if (minutes < 60) return `${minutes}m`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        
        const days = Math.floor(hours / 24);
        return `${days}d`;
    }

    // Método para actualizar stats externamente
    updateDatabaseStats(stats) {
        this.setState({
            dbStats: {
                deckCount: stats.deckCount || 0,
                isUpdating: stats.isUpdating || false
            }
        });
    }

    shouldRerender(prevState, newState) {
        return prevState.currentView !== newState.currentView ||
               prevState.gameDetected !== newState.gameDetected ||
               prevState.isConnected !== newState.isConnected ||
               prevState.formatDetected !== newState.formatDetected ||
               prevState.dbStats.deckCount !== newState.dbStats.deckCount ||
               prevState.dbStats.isUpdating !== newState.dbStats.isUpdating ||
               (Math.abs((prevState.lastUpdate || 0) - (newState.lastUpdate || 0)) > 60000); // Solo re-render si cambió hace más de 1 minuto
    }
}

export default HeaderComponent;