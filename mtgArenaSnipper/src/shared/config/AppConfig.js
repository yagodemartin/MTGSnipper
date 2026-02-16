// src/config/AppConfig.js
// ⚙️ Configuración global de la aplicación

export const APP_CONFIG = {
    // Información de la aplicación
    app: {
        name: 'MTG Arena Sniffer',
        version: '2.0.0',
        description: 'Detector inteligente de mazos para MTG Arena',
        author: 'MTG Arena Community',
        buildDate: new Date().toISOString(),
        environment: process?.env?.NODE_ENV || 'development'
    },

    // Configuración del motor de predicción
    prediction: {
        confirmationThreshold: 0.95,
        minCardsForPrediction: 2,
        maxPredictions: 5,
        decayFactor: 0.9,
        bonusMultipliers: {
            signature: 2.0,
            meta_popular: 1.5,
            color_match: 1.3,
            turn_timing: 1.2
        },
        autoConfirmEnabled: true,
        confidenceLevels: {
            'very-high': { min: 0.9, label: 'Muy Alta' },
            'high': { min: 0.7, label: 'Alta' },
            'medium': { min: 0.5, label: 'Media' },
            'low': { min: 0.3, label: 'Baja' },
            'very-low': { min: 0, label: 'Muy Baja' }
        }
    },

    // Configuración de la base de datos
    database: {
        maxCacheAge: 12 * 60 * 60 * 1000, // 12 horas
        fallbackData: true,
        autoUpdate: true,
        maxRetries: 3,
        updateInterval: 6 * 60 * 60 * 1000, // 6 horas
        sources: {
            primary: 'MTGGoldfish',
            fallback: 'Local',
            backup: 'Static'
        }
    },

    // Configuración del scraper
    scraper: {
        rateLimitDelay: 1500,
        timeout: 20000,
        maxDecks: 15,
        maxRetries: 3,
        corsProxies: [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://cors.bridged.cc/',
            'https://thingproxy.freeboard.io/fetch/',
            'https://api.codetabs.com/v1/proxy?quest='
        ],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },

    // Configuración de la interfaz
    ui: {
        theme: 'dark', // 'dark' | 'light' | 'auto'
        defaultView: 'prediction', // 'prediction' | 'confirmed' | 'debug'
        animations: true,
        notifications: {
            duration: 4000,
            position: 'top-right',
            maxVisible: 5
        },
        modals: {
            closeOnOverlayClick: true,
            keyboard: true
        },
        debug: {
            showEventHistory: true,
            maxEventHistory: 200,
            autoRefresh: true,
            refreshInterval: 5000
        }
    },

    // Configuración de eventos
    events: {
        debugMode: true,
        maxHistory: 100,
        batchSize: 10,
        throttleDelay: 100 // ms
    },

    // Configuración de rendimiento
    performance: {
        enableMetrics: true,
        sampleRate: 0.1, // 10% de muestreo
        maxMetricsHistory: 1000,
        warningThresholds: {
            memoryUsage: 100, // MB
            renderTime: 16, // ms (60 FPS)
            apiLatency: 5000 // ms
        }
    },

    // URLs y endpoints
    api: {
        scryfall: {
            base: 'https://api.scryfall.com',
            endpoints: {
                cardSearch: '/cards/named',
                cardById: '/cards',
                sets: '/sets'
            },
            rateLimit: 100 // requests per second
        },
        mtggoldfish: {
            base: 'https://www.mtggoldfish.com',
            endpoints: {
                standard: '/metagame/standard#paper',
                archetype: '/archetype/standard'
            }
        }
    },

    // Formatos soportados
    formats: {
        standard: {
            name: 'Standard',
            enabled: true,
            default: true
        },
        pioneer: {
            name: 'Pioneer', 
            enabled: false
        },
        modern: {
            name: 'Modern',
            enabled: false
        },
        legacy: {
            name: 'Legacy',
            enabled: false
        }
    },

    // Configuración de logging
    logging: {
        level: 'info', // 'debug' | 'info' | 'warn' | 'error'
        console: true,
        persist: true,
        maxLogSize: 1000,
        includeTimestamp: true,
        includeStack: true
    },

    // Características habilitadas
    features: {
        autoDetection: true,
        manualInput: true,
        deckConfirmation: true,
        exportDecklists: true,
        statisticsView: true,
        debugMode: true,
        performanceMonitoring: true,
        errorReporting: true
    },

    // Configuración de almacenamiento
    storage: {
        prefix: 'mtgArenaSniffer_',
        version: 2,
        keys: {
            metaData: 'metaData',
            lastUpdate: 'lastUpdate',
            userPreferences: 'userPreferences',
            gameHistory: 'gameHistory',
            statistics: 'statistics'
        },
        quotaWarningThreshold: 0.8 // 80% del límite
    },

    // Configuración de atajos de teclado
    hotkeys: {
        toggleApp: {
            key: 'Ctrl+Alt+M',
            description: 'Mostrar/Ocultar aplicación'
        },
        resetGame: {
            key: 'Ctrl+Alt+R', 
            description: 'Reiniciar juego actual'
        },
        forceUpdate: {
            key: 'Ctrl+Alt+U',
            description: 'Forzar actualización'
        },
        debugMode: {
            key: 'Ctrl+Alt+D',
            description: 'Activar modo debug'
        }
    },

    // Configuración de métricas y analytics
    analytics: {
        enabled: false, // Deshabilitado por privacidad
        anonymizeData: true,
        batchSize: 10,
        flushInterval: 60000, // 1 minuto
        maxQueueSize: 100
    }
};

// Configuración específica por entorno
export const ENVIRONMENT_CONFIG = {
    development: {
        logging: { level: 'debug' },
        database: { autoUpdate: false },
        ui: { debug: { autoRefresh: true } },
        features: { debugMode: true }
    },
    
    production: {
        logging: { level: 'warn' },
        database: { autoUpdate: true },
        ui: { debug: { autoRefresh: false } },
        features: { debugMode: false }
    },
    
    test: {
        logging: { level: 'error' },
        database: { autoUpdate: false, fallbackData: true },
        scraper: { timeout: 5000, maxRetries: 1 },
        ui: { animations: false }
    }
};

// Fusionar configuración por entorno
function getEnvironmentConfig() {
    const env = APP_CONFIG.app.environment;
    const envConfig = ENVIRONMENT_CONFIG[env] || ENVIRONMENT_CONFIG.development;
    
    return mergeDeep(APP_CONFIG, envConfig);
}

// Utilidad para fusión profunda de objetos
function mergeDeep(target, source) {
    const result = { ...target };
    
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = mergeDeep(target[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
}

// Configuración final
export const CONFIG = getEnvironmentConfig();

// Constantes útiles
export const CARD_COLORS = ['W', 'U', 'B', 'R', 'G'];
export const MANA_SYMBOLS = {
    W: '⚪', U: '🔵', B: '⚫', R: '🔴', G: '🟢'
};

export const ARCHETYPES = {
    AGGRO: 'aggro',
    CONTROL: 'control', 
    MIDRANGE: 'midrange',
    COMBO: 'combo',
    RAMP: 'ramp',
    TEMPO: 'tempo'
};

export const GAME_PHASES = {
    WAITING: 'waiting',
    ACTIVE: 'active',
    ANALYZING: 'analyzing',
    CONFIRMED: 'confirmed',
    ENDED: 'ended'
};

export default CONFIG;