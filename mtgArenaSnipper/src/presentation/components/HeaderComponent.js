// src/presentation/components/ui/HeaderComponent.js
// 📋 Componente de header con navegación

import BaseComponent from './BaseComponent.js';

class HeaderComponent extends BaseComponent {
    constructor(eventBus, uiService) {
        super(eventBus, { uiService });
        
        this.state = {
            currentView: 'prediction',
            isConnected: false,
            gameDetected: false,
            formatDetected: 'standard',
            lastUpdate: null
        };
    }

    async onInitialize() {
        // Escuchar cambios de vista
        this.eventBus.on('ui:view:changed', (data) => {
            this.setState({ currentView: data.to });
        });

        // Escuchar estado de conexión
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
            this.setState({ lastUpdate: Date.now() });
        });
    }

    getTemplate() {
        return `
            <div class="header-component">
                <div class="header-brand">
                    <div class="brand-icon">🔍</div>
                    <h1 class="brand-title">mtgArenaSniffer</h1>
                    <div class="brand-tagline">Deck Detection Tool</div>
                </div>

                <div class="header-navigation">
                    <nav class="nav-tabs">
                        <button class="nav-tab ${this.state.currentView === 'prediction' ? 'active' : ''}" 
                                data-view="prediction">
                            🎯 Predicciones
                        </button>
                        <button class="nav-tab ${this.state.currentView === 'confirmed' ? 'active' : ''}" 
                                data-view="confirmed">
                            📋 Mazo confirmado
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
                                ${this.state.gameDetected ? 'MTG Arena detectado' : 'Esperando MTG Arena'}
                            </span>
                        </div>
                        
                        <div class="status-item format">
                            <span class="format-badge">${this.state.formatDetected.toUpperCase()}</span>
                        </div>

                        ${this.state.lastUpdate ? `
                            <div class="status-item update">
                                <span class="update-time">
                                    📊 ${this.formatLastUpdate()}
                                </span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="header-actions">
                        <button class="btn btn-sm btn-secondary" id="force-update-btn" title="Forzar actualización">
                            🔄
                        </button>
                        <button class="btn btn-sm btn-secondary" id="reset-game-btn" title="Reiniciar juego">
                            ↻
                        </button>
                        <button class="btn btn-sm btn-secondary" id="settings-btn" title="Configuración">
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
                this.changeView(view);
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

        this.log(`📍 Cambiando vista a: ${view}`);
        this.eventBus.emit('ui:view-change-requested', { view });
    }

    forceUpdate() {
        this.log('🔄 Forzando actualización de base de datos...');
        this.eventBus.emit('database:force-update');
        
        this.dependencies.uiService.showNotification({
            type: 'info',
            title: 'Actualización iniciada',
            message: 'Actualizando base de datos del meta...',
            duration: 3000
        });
    }

    resetGame() {
        this.log('↻ Reiniciando juego...');
        this.eventBus.emit('game:reset');
        
        this.dependencies.uiService.showNotification({
            type: 'info',
            title: 'Juego reiniciado',
            message: 'Listo para nueva partida',
            duration: 2000
        });
    }

    showSettings() {
        this.dependencies.uiService.showModal({
            title: '⚙️ Configuración',
            content: this.getSettingsModalContent(),
            size: 'medium',
            buttons: [
                { text: 'Cerrar', action: 'close' },
                { text: 'Guardar', action: 'save', type: 'primary' }
            ]
        });
    }

    getSettingsModalContent() {
        return `
            <div class="settings-content">
                <div class="setting-group">
                    <h4>🎯 Predicciones</h4>
                    <label>
                        <input type="checkbox" id="auto-confirm" checked>
                        Auto-confirmar mazos al 95% de certeza
                    </label>
                    <label>
                        <input type="number" id="min-cards" value="2" min="1" max="5">
                        Mínimo de cartas para predicción
                    </label>
                </div>

                <div class="setting-group">
                    <h4>🔄 Actualización</h4>
                    <label>
                        <input type="checkbox" id="auto-update" checked>
                        Actualizar automáticamente al iniciar
                    </label>
                    <label>
                        <select id="update-frequency">
                            <option value="24">Cada 24 horas</option>
                            <option value="12">Cada 12 horas</option>
                            <option value="6">Cada 6 horas</option>
                        </select>
                        Frecuencia de actualización
                    </label>
                </div>

                <div class="setting-group">
                    <h4>🎨 Interfaz</h4>
                    <label>
                        <select id="theme">
                            <option value="dark">Oscuro</option>
                            <option value="light">Claro</option>
                            <option value="auto">Automático</option>
                        </select>
                        Tema visual
                    </label>
                    <label>
                        <input type="checkbox" id="debug-mode">
                        Mostrar información de debug
                    </label>
                </div>

                <div class="setting-group">
                    <h4>⌨️ Atajos</h4>
                    <div class="hotkey-list">
                        <div class="hotkey-item">
                            <span>Mostrar/Ocultar app:</span>
                            <kbd>Ctrl + Alt + M</kbd>
                        </div>
                        <div class="hotkey-item">
                            <span>Reiniciar juego:</span>
                            <kbd>Ctrl + Alt + R</kbd>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    formatLastUpdate() {
        if (!this.state.lastUpdate) return '';
        
        const minutes = Math.floor((Date.now() - this.state.lastUpdate) / 60000);
        
        if (minutes < 1) return 'Actualizado ahora';
        if (minutes < 60) return `Actualizado hace ${minutes}m`;
        
        const hours = Math.floor(minutes / 60);
        return `Actualizado hace ${hours}h`;
    }

    shouldRerender(prevState, newState) {
        return prevState.currentView !== newState.currentView ||
               prevState.gameDetected !== newState.gameDetected ||
               prevState.isConnected !== newState.isConnected ||
               prevState.formatDetected !== newState.formatDetected;
    }
}

export default HeaderComponent;