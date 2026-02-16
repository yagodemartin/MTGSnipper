// src/utils/Utils.js
// 🔧 Utilidades comunes para la aplicación

/**
 * 🕒 Utilidades de tiempo
 */
export const TimeUtils = {
    /**
     * Formatear timestamp a string legible
     */
    formatTimestamp(timestamp, options = {}) {
        const {
            includeTime = true,
            includeDate = true,
            locale = 'es-ES',
            relative = false
        } = options;

        const date = new Date(timestamp);
        
        if (relative) {
            return this.getRelativeTime(timestamp);
        }

        const formatOptions = {};
        
        if (includeDate) {
            formatOptions.day = '2-digit';
            formatOptions.month = '2-digit';
            formatOptions.year = 'numeric';
        }
        
        if (includeTime) {
            formatOptions.hour = '2-digit';
            formatOptions.minute = '2-digit';
            formatOptions.second = '2-digit';
        }

        return date.toLocaleString(locale, formatOptions);
    },

    /**
     * Obtener tiempo relativo (hace X minutos)
     */
    getRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'hace unos segundos';
        if (minutes < 60) return `hace ${minutes} min`;
        if (hours < 24) return `hace ${hours} h`;
        if (days < 7) return `hace ${days} días`;
        
        return this.formatTimestamp(timestamp, { includeTime: false });
    },

    /**
     * Parsear duración en ms a string legible
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
};

/**
 * 📊 Utilidades de datos
 */
export const DataUtils = {
    /**
     * Fusión profunda de objetos
     */
    mergeDeep(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.mergeDeep(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    },

    /**
     * Clonar objeto profundamente
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        
        return cloned;
    },

    /**
     * Validar que un objeto tiene las propiedades requeridas
     */
    validateObject(obj, requiredFields) {
        const missing = requiredFields.filter(field => 
            obj[field] === undefined || obj[field] === null
        );
        
        return {
            valid: missing.length === 0,
            missing
        };
    },

    /**
     * Agrupar array por propiedad
     */
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    },

    /**
     * Ordenar array por múltiples criterios
     */
    sortBy(array, ...criteria) {
        return array.sort((a, b) => {
            for (const criterion of criteria) {
                let result = 0;
                
                if (typeof criterion === 'string') {
                    result = a[criterion] > b[criterion] ? 1 : a[criterion] < b[criterion] ? -1 : 0;
                } else if (typeof criterion === 'function') {
                    result = criterion(a, b);
                }
                
                if (result !== 0) return result;
            }
            return 0;
        });
    },

    /**
     * Filtrar duplicados de array
     */
    unique(array, key = null) {
        if (!key) {
            return [...new Set(array)];
        }
        
        const seen = new Set();
        return array.filter(item => {
            const value = item[key];
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    }
};

/**
 * 🎨 Utilidades de UI
 */
export const UIUtils = {
    /**
     * Generar ID único
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Sanitizar texto para evitar XSS
     */
    sanitizeText(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Copiar texto al portapapeles
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // Fallback para navegadores antiguos
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (err) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    },

    /**
     * Detectar si el dispositivo es móvil
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    /**
     * Obtener dimensiones del viewport
     */
    getViewportSize() {
        return {
            width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
            height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
        };
    },

    /**
     * Animar elemento con clases CSS
     */
    animateElement(element, animationClass, duration = 300) {
        return new Promise(resolve => {
            element.classList.add(animationClass);
            
            setTimeout(() => {
                element.classList.remove(animationClass);
                resolve();
            }, duration);
        });
    },

    /**
     * Hacer scroll suave a elemento
     */
    scrollToElement(element, options = {}) {
        const defaultOptions = {
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
        };
        
        element.scrollIntoView({ ...defaultOptions, ...options });
    }
};

/**
 * 🔗 Utilidades de red
 */
export const NetworkUtils = {
    /**
     * Verificar si hay conexión a internet
     */
    async isOnline() {
        if (!navigator.onLine) {
            return false;
        }
        
        try {
            const response = await fetch('https://httpbin.org/json', {
                method: 'HEAD',
                mode: 'cors',
                timeout: 5000
            });
            return response.ok;
        } catch {
            return false;
        }
    },

    /**
     * Hacer petición con retry automático
     */
    async fetchWithRetry(url, options = {}, maxRetries = 3) {
        const { timeout = 10000, ...fetchOptions } = options;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                const response = await fetch(url, {
                    ...fetchOptions,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    return response;
                }
                
                if (attempt === maxRetries) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Esperar antes del siguiente intento
                await this.sleep(Math.pow(2, attempt) * 1000);
            }
        }
    },

    /**
     * Dormir por X milisegundos
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

/**
 * 💾 Utilidades de almacenamiento
 */
export const StorageUtils = {
    /**
     * Guardar datos con manejo de errores
     */
    set(key, value) {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Error guardando en localStorage:', error);
            return false;
        }
    },

    /**
     * Obtener datos con valor por defecto
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error leyendo de localStorage:', error);
            return defaultValue;
        }
    },

    /**
     * Verificar si una clave existe
     */
    has(key) {
        return localStorage.getItem(key) !== null;
    },

    /**
     * Eliminar clave
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error eliminando de localStorage:', error);
            return false;
        }
    },

    /**
     * Limpiar todas las claves con prefijo
     */
    clearPrefix(prefix) {
        const keys = Object.keys(localStorage);
        const prefixedKeys = keys.filter(key => key.startsWith(prefix));
        
        prefixedKeys.forEach(key => {
            localStorage.removeItem(key);
        });
        
        return prefixedKeys.length;
    },

    /**
     * Obtener espacio usado en localStorage
     */
    getUsage() {
        let total = 0;
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return {
            used: total,
            usedKB: (total / 1024).toFixed(2),
            percentage: ((total / (5 * 1024 * 1024)) * 100).toFixed(2) // Asumiendo límite de 5MB
        };
    }
};

/**
 * 🧮 Utilidades matemáticas
 */
export const MathUtils = {
    /**
     * Restringir número a un rango
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Redondear a X decimales
     */
    round(value, decimals = 2) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    },

    /**
     * Interpolar linealmente entre dos valores
     */
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    },

    /**
     * Mapear valor de un rango a otro
     */
    map(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    },

    /**
     * Obtener promedio de array
     */
    average(array) {
        return array.reduce((sum, value) => sum + value, 0) / array.length;
    },

    /**
     * Obtener mediana de array
     */
    median(array) {
        const sorted = array.slice().sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        } else {
            return sorted[middle];
        }
    }
};

/**
 * 🎯 Utilidades específicas de MTG
 */
export const MTGUtils = {
    /**
     * Normalizar nombre de carta
     */
    normalizeCardName(name) {
        if (!name) return '';
        
        return name.toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ');
    },

    /**
     * Parsear costo de maná
     */
    parseManaCost(manaCost) {
        if (!manaCost) return [];
        
        const symbols = manaCost.match(/\{([^}]+)\}/g) || [];
        return symbols.map(symbol => symbol.replace(/[{}]/g, ''));
    },

    /**
     * Calcular CMC (Converted Mana Cost)
     */
    calculateCMC(manaCost) {
        const symbols = this.parseManaCost(manaCost);
        let cmc = 0;
        
        for (const symbol of symbols) {
            if (/^\d+$/.test(symbol)) {
                cmc += parseInt(symbol);
            } else if (/^[WUBRGC]$/.test(symbol)) {
                cmc += 1;
            } else if (symbol.includes('/')) {
                cmc += 1; // Híbridos cuentan como 1
            }
        }
        
        return cmc;
    },

    /**
     * Extraer colores de costo de maná
     */
    extractColors(manaCost) {
        const symbols = this.parseManaCost(manaCost);
        const colors = new Set();
        
        for (const symbol of symbols) {
            if (/W/.test(symbol)) colors.add('W');
            if (/U/.test(symbol)) colors.add('U');
            if (/B/.test(symbol)) colors.add('B');
            if (/R/.test(symbol)) colors.add('R');
            if (/G/.test(symbol)) colors.add('G');
        }
        
        return Array.from(colors);
    },

    /**
     * Verificar si es tierra básica
     */
    isBasicLand(cardName) {
        const basicLands = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
        return basicLands.includes(cardName);
    },

    /**
     * Generar ID de mazo a partir del nombre
     */
    generateDeckId(deckName) {
        return deckName.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 30);
    }
};

// Exportar todas las utilidades como un objeto
export const Utils = {
    Time: TimeUtils,
    Data: DataUtils,
    UI: UIUtils,
    Network: NetworkUtils,
    Storage: StorageUtils,
    Math: MathUtils,
    MTG: MTGUtils
};

export default Utils;