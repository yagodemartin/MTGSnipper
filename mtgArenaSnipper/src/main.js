// src/main.js
// 🚀 Punto de entrada principal de la aplicación

import MTGArenaSnifferApp from './presentation/components/MTGArenaSnifferApp.js';

/**
 * 🎮 Inicializar aplicación principal
 */
async function initializeApp() {
    try {
        console.log('🚀 Iniciando MTG Arena Sniffer...');
        
        // Verificar que tenemos el container necesario
        const appContainer = document.getElementById('app');
        if (!appContainer) {
            throw new Error('Container #app no encontrado en el DOM');
        }

        // Crear e inicializar la aplicación
        const app = new MTGArenaSnifferApp();
        
        // Hacer la app disponible globalmente para debugging
        window.mtgApp = app;
        window.MTGArenaSnifferApp = MTGArenaSnifferApp;
        
        // Inicializar
        await app.initialize();
        
        console.log('✅ MTG Arena Sniffer inicializado correctamente');
        
        // Configurar error handlers globales
        setupGlobalErrorHandlers(app);
        
        return app;

    } catch (error) {
        console.error('❌ Error inicializando MTG Arena Sniffer:', error);
        showInitializationError(error);
        throw error;
    }
}

/**
 * 🛡️ Configurar manejadores de errores globales
 */
function setupGlobalErrorHandlers(app) {
    // Errores no capturados
    window.addEventListener('error', (event) => {
        console.error('❌ Error global:', event.error);
        if (app && app.uiService) {
            app.uiService.showNotification({
                type: 'error',
                title: 'Error del sistema',
                message: 'Se produjo un error inesperado',
                duration: 5000
            });
        }
    });

    // Promesas rechazadas no capturadas
    window.addEventListener('unhandledrejection', (event) => {
        console.error('❌ Promesa rechazada:', event.reason);
        if (app && app.uiService) {
            app.uiService.showNotification({
                type: 'error',
                title: 'Error de conexión',
                message: 'Problema de conectividad detectado',
                duration: 5000
            });
        }
    });
}

/**
 * ❌ Mostrar error de inicialización
 */
function showInitializationError(error) {
    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.innerHTML = `
            <div class="initialization-error">
                <div class="error-content">
                    <h1>❌ Error de Inicialización</h1>
                    <p>No se pudo inicializar MTG Arena Sniffer</p>
                    <details>
                        <summary>Detalles del error</summary>
                        <pre>${error.message}\n\n${error.stack}</pre>
                    </details>
                    <div class="error-actions">
                        <button onclick="location.reload()">🔄 Reintentar</button>
                        <button onclick="window.mtgApp?.openDebugMode?.()">🔧 Modo Debug</button>
                    </div>
                </div>
            </div>
        `;
    }
}

/**
 * 🔧 Inicializar en modo de pruebas
 */
async function initializeTestMode() {
    try {
        console.log('🧪 Iniciando en modo de pruebas...');
        
        // Importar aplicación de pruebas
        const { default: SimpleTestApp } = await import('./test-app.js');
        
        const testApp = new SimpleTestApp();
        await testApp.initialize();
        
        window.mtgTestApp = testApp;
        
        console.log('✅ Modo de pruebas iniciado');
        return testApp;

    } catch (error) {
        console.error('❌ Error en modo de pruebas:', error);
        throw error;
    }
}

/**
 * 🎯 Detectar modo de ejecución y inicializar
 */
async function bootstrap() {
    try {
        // Verificar si estamos en modo de pruebas
        const isTestMode = window.location.search.includes('test=true') || 
                          window.location.hash.includes('test') ||
                          localStorage.getItem('mtg_test_mode') === 'true';

        if (isTestMode) {
            console.log('🧪 Detectado modo de pruebas');
            return await initializeTestMode();
        } else {
            console.log('🎮 Iniciando aplicación principal');
            return await initializeApp();
        }

    } catch (error) {
        console.error('❌ Error en bootstrap:', error);
        
        // Fallback al modo de pruebas si falla la app principal
        try {
            console.log('🔄 Fallback a modo de pruebas...');
            return await initializeTestMode();
        } catch (fallbackError) {
            console.error('❌ Error en fallback:', fallbackError);
            showInitializationError(error);
        }
    }
}

// 🚀 Auto-inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    // DOM ya está listo
    bootstrap();
}

// Exportar para uso manual si es necesario
export { initializeApp, initializeTestMode, bootstrap };