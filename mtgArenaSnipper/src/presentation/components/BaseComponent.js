// src/presentation/components/ui/BaseComponent.js
// 🏗️ Componente base para arquitectura consistente

class BaseComponent {
    constructor(eventBus, dependencies = {}) {
        this.eventBus = eventBus;
        this.dependencies = dependencies;
        this.container = null;
        this.state = {};
        this.isInitialized = false;
        this.eventListeners = [];
        this.debugMode = true;
    }

    async initialize() {
        if (this.isInitialized) return;
        
        this.log('🏗️ Inicializando componente...');
        
        // Hook para inicialización específica del componente
        await this.onInitialize();
        
        this.isInitialized = true;
        this.log('✅ Componente inicializado');
    }

    async render(container) {
        if (!container) {
            throw new Error('Container es requerido para renderizar');
        }

        this.container = container;
        
        // Generar HTML del componente
        const html = await this.getTemplate();
        container.innerHTML = html;
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Hook post-render
        await this.onRender();
        
        this.log('🎨 Componente renderizado');
    }

    setState(newState) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        // Hook para manejar cambios de estado
        this.onStateChange(prevState, this.state);
        
        // Re-render si es necesario
        if (this.shouldRerender(prevState, this.state)) {
            this.rerender();
        }
    }

    async rerender() {
        if (!this.container) return;
        
        this.log('🔄 Re-renderizando componente...');
        await this.render(this.container);
    }

    cleanup() {
        this.log('🧹 Limpiando componente...');
        
        // Remover event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        
        // Hook para cleanup específico
        this.onCleanup();
        
        this.isInitialized = false;
    }

    // Métodos para sobrescribir en componentes específicos
    async onInitialize() {}
    async onRender() {}
    onStateChange(prevState, newState) {}
    shouldRerender(prevState, newState) { return false; }
    onCleanup() {}
    
    getTemplate() {
        return '<div>Base Component</div>';
    }
    
    setupEventListeners() {}

    // Utilidades
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    $(selector) {
        return this.container?.querySelector(selector);
    }

    $$(selector) {
        return this.container?.querySelectorAll(selector);
    }

    log(message, data = null) {
        if (!this.debugMode) return;
        console.log(`🧩 [${this.constructor.name}] ${message}`, data || '');
    }

    logError(message, error = null) {
        console.error(`❌ [${this.constructor.name}] ${message}`, error || '');
    }
}

export default BaseComponent;