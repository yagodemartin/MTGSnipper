// src/infrastructure/data/DatabaseManager.js
// 🗄️ DatabaseManager actualizado para cargas reales del scraper

import MTGGoldfishCompleteScraper from './MTGGoldfishCompleteScraper.js';

class DatabaseManager {
    constructor() {
        this.scraper = new MTGGoldfishCompleteScraper();
        this.currentMetaData = null;
        this.isUpdating = false;
        this.updatePromise = null;
        
        // Cache keys
        this.cacheKeys = {
            metaData: 'mtgArenaSniffer_metaData_v3', // v3 para nuevo sistema
            lastUpdate: 'mtgArenaSniffer_lastUpdate_v3',
            updateStatus: 'mtgArenaSniffer_updateStatus_v3'
        };

        // Configuración CORREGIDA
        this.config = {
            maxCacheAge: 0 * 60 * 60 * 1000, // 0 horas = siempre actualizar para testing
            autoUpdate: true,
            debugMode: true,
            forceUpdateOnStart: true
        };

        this.debugMode = true;
    }

    /**
     * 🚀 Inicializar con limpieza forzada de cache
     */
    async initialize() {
        try {
            this.log('🚀 Inicializando DatabaseManager...');
            
            // 🧹 LIMPIEZA FORZADA DE CACHE EN CADA INICIO
            this.log('🧹 Limpiando cache anterior...');
            this.clearCache();
            this.currentMetaData = null;
            
            await this.loadCachedData();
            
            // Siempre forzar actualización para testing
            this.log('📊 Forzando actualización para testing...');
            try {
                await this.updateData();
            } catch (error) {
                this.logError('No se pudieron obtener datos nuevos:', error);
                throw error; // No usar cache viejo, fallar completamente
            }
            
            this.log('✅ DatabaseManager inicializado');
            return { success: true, source: this.getDataSource() };
        } catch (error) {
            this.logError('❌ Error inicializando:', error);
            throw error;
        }
    }

    /**
     * 🧹 Limpiar completamente la cache
     */
    clearCache() {
        try {
            Object.values(this.cacheKeys).forEach(key => {
                localStorage.removeItem(key);
            });
            this.log('🧹 Cache limpiada completamente');
        } catch (error) {
            this.logError('Error limpiando cache:', error);
        }
    }

    /**
     * 📁 Cargar datos desde cache
     */
    async loadCachedData() {
        try {
            const cachedData = localStorage.getItem(this.cacheKeys.metaData);
            
            if (cachedData) {
                this.currentMetaData = JSON.parse(cachedData);
                this.log('📁 Datos con cartas reales cargados desde cache');
                return true;
            } else {
                this.log('📁 No hay datos en cache');
                return false;
            }
        } catch (error) {
            this.logError('Error cargando cache:', error);
            return false;
        }
    }

    /**
     * 🕐 Verificar si necesita actualización
     */
    needsUpdate() {
        if (!this.currentMetaData) {
            this.log('🕐 Necesita actualización: No hay datos');
            return true;
        }
        
        const lastUpdate = this.currentMetaData.lastUpdated;
        if (!lastUpdate) {
            this.log('🕐 Necesita actualización: Sin timestamp');
            return true;
        }
        
        const timeDiff = Date.now() - new Date(lastUpdate).getTime();
        const needsUpdate = timeDiff > this.config.maxCacheAge;
        
        this.log(`🕐 Última actualización: ${new Date(lastUpdate).toLocaleString()}`);
        this.log(`🕐 Diferencia: ${Math.round(timeDiff / 1000 / 60)} minutos`);
        this.log(`🕐 Necesita actualización: ${needsUpdate}`);
        
        return needsUpdate;
    }

    /**
     * 🔄 Actualizar datos
     */
    async updateData() {
        if (this.isUpdating) {
            this.log('🔄 Actualización ya en progreso, esperando...');
            return await this.updatePromise;
        }

        this.isUpdating = true;
        this.updatePromise = this.performRealUpdate();
        
        try {
            const result = await this.updatePromise;
            return result;
        } finally {
            this.isUpdating = false;
            this.updatePromise = null;
        }
    }

    /**
     * 🔄 Realizar actualización con cartas reales
     */
    async performRealUpdate() {
        try {
            this.log('🔄 Iniciando scraping completo con CARTAS REALES...');
            this.updateStatus('scraping', 'Scrapeando top 15 mazos con todas sus cartas...');

            // Usar el scraper completo para obtener cartas reales
            const freshData = await this.scraper.scrapeCompleteMetaData();

            if (!freshData || !freshData.decks || freshData.decks.length === 0) {
                throw new Error('No se obtuvieron datos válidos del scraper');
            }

            const decksWithCards = freshData.decks.filter(deck => 
                deck.mainboard && deck.mainboard.length > 3  // 3+ cartas del breakdown
            );

            if (decksWithCards.length === 0) {
                throw new Error('No se scrapearon cartas reales de los mazos');
            }

            // Procesar datos para predicción
            this.updateStatus('processing', 'Procesando cartas para sistema de predicción...');
            const processedData = await this.processRealCardData(freshData);

            // Guardar en cache
            await this.saveToCache(processedData);
            
            // Actualizar datos actuales
            this.currentMetaData = processedData;

            this.updateStatus('completed', `✅ ${processedData.decks.length} mazos con ${processedData.totalRealCards} cartas reales`);
            this.log(`✅ Actualización completada: ${processedData.decks.length} mazos con cartas reales`);

            return processedData;

        } catch (error) {
            this.logError('❌ Error en actualización con cartas reales:', error);
            this.updateStatus('error', `Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 🔧 Procesar datos reales para el sistema de predicción
     */
    async processRealCardData(rawData) {
        this.log('🔧 Procesando datos reales para predicción...');
        
        const processedDecks = rawData.decks.map(deck => {
            // Asegurar que cada mazo tenga un ID único
            const deckId = this.generateDeckId(deck.name);
            
            return {
                ...deck,
                id: deckId,
                // Asegurar arrays vacíos si no hay datos
                mainboard: deck.mainboard || [],
                sideboard: deck.sideboard || [],
                keyCards: deck.keyCards || [],
                colors: deck.colors || [],
                // Metadatos adicionales para predicción
                cardCount: deck.totalCards || 0,
                realCardCount: deck.totalCardsInDeck || 0,
                confidence: deck.hasExactList ? 1.0 : 0.7,
                processedAt: new Date().toISOString()
            };
        });

        // Estadísticas globales
        const totalRealCards = processedDecks.reduce((sum, deck) => 
            sum + (deck.realCardCount || 0), 0);
        const totalUniqueCards = processedDecks.reduce((sum, deck) => 
            sum + (deck.cardCount || 0), 0);

        return {
            ...rawData,
            decks: processedDecks,
            totalRealCards,
            totalUniqueCards,
            processedAt: new Date().toISOString(),
            version: 'v3-real-cards'
        };
    }

    /**
     * 🆔 Generar ID único para mazo
     */
    generateDeckId(deckName) {
        return deckName
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 30);
    }

    /**
     * 💾 Guardar en cache
     */
    async saveToCache(data) {
        try {
            localStorage.setItem(this.cacheKeys.metaData, JSON.stringify(data));
            localStorage.setItem(this.cacheKeys.lastUpdate, Date.now().toString());
            this.log('💾 Datos guardados en cache');
        } catch (error) {
            this.logError('Error guardando en cache:', error);
        }
    }

    /**
     * 📊 Actualizar estado
     */
    updateStatus(status, message) {
        const statusData = {
            status,
            message,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem(this.cacheKeys.updateStatus, JSON.stringify(statusData));
        } catch (error) {
            this.logError('Error actualizando status:', error);
        }
        
        this.log(`📊 Status: ${status} - ${message}`);
    }

    /**
     * 🔄 Forzar actualización
     */
    async forceUpdate() {
        this.log('🔄 Forzando actualización...');
        this.clearCache();
        this.currentMetaData = null;
        return await this.updateData();
    }

    /**
     * 📈 Obtener estadísticas
     */
    getStats() {
        const status = this.getUpdateStatus();
        const lastUpdate = localStorage.getItem(this.cacheKeys.lastUpdate);
        
        return {
            isReady: !!this.currentMetaData,
            lastUpdated: lastUpdate ? new Date(parseInt(lastUpdate)).toISOString() : null,
            deckCount: this.currentMetaData?.deckCount || 0,
            totalRealCards: this.currentMetaData?.totalRealCards || 0,
            status: status?.status || 'unknown',
            dataSource: this.getDataSource(),
            hasRealCards: this.hasRealCards(),
            config: this.config
        };
    }

    /**
     * 📊 Obtener estado de actualización
     */
    getUpdateStatus() {
        try {
            const status = localStorage.getItem(this.cacheKeys.updateStatus);
            return status ? JSON.parse(status) : null;
        } catch {
            return null;
        }
    }

    /**
     * 📋 Obtener datos meta
     */
    async getMetaData(forceUpdate = false) {
        try {
            if (forceUpdate) {
                return await this.forceUpdate();
            }
            
            if (!this.currentMetaData) {
                this.log('⚠️ No hay datos disponibles');
                return null;
            }
            
            return this.currentMetaData;
        } catch (error) {
            this.logError('Error obteniendo meta data:', error);
            return this.currentMetaData;
        }
    }

    /**
     * 📋 Obtener datos meta actuales
     */
    getCurrentMetaData() {
        return this.currentMetaData;
    }

    /**
     * 🔍 Obtener fuente de datos
     */
    getDataSource() {
        if (!this.currentMetaData) return 'none';
        return this.currentMetaData.source || 'unknown';
    }

    /**
     * 🃏 Verificar si tiene cartas reales
     */
    hasRealCards() {
        if (!this.currentMetaData || !this.currentMetaData.decks) return false;
        
        return this.currentMetaData.decks.some(deck => 
            deck.mainboard && deck.mainboard.length > 0
        );
    }

    /**
     * 🔍 Buscar mazos por carta
     */
    findDecksByCard(cardName) {
        if (!this.currentMetaData || !this.currentMetaData.decks) return [];
        
        const normalizedCardName = cardName.toLowerCase();
        
        return this.currentMetaData.decks.filter(deck => {
            if (!deck.mainboard) return false;
            
            return deck.mainboard.some(card => 
                card.name.toLowerCase().includes(normalizedCardName)
            );
        });
    }

    /**
     * 🎯 Obtener cartas populares
     */
    getPopularCards(limit = 20) {
        if (!this.currentMetaData || !this.currentMetaData.decks) return [];
        
        const cardFrequency = new Map();
        
        this.currentMetaData.decks.forEach(deck => {
            if (deck.mainboard) {
                deck.mainboard.forEach(card => {
                    const count = cardFrequency.get(card.name) || 0;
                    cardFrequency.set(card.name, count + 1);
                });
            }
        });
        
        return Array.from(cardFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([name, frequency]) => ({ name, frequency }));
    }

    /**
     * 📊 Obtener distribución de arquetipos
     */
    getArchetypeDistribution() {
        if (!this.currentMetaData || !this.currentMetaData.decks) return {};
        
        const distribution = {};
        
        this.currentMetaData.decks.forEach(deck => {
            const archetype = deck.archetype || 'Unknown';
            distribution[archetype] = (distribution[archetype] || 0) + 1;
        });
        
        return distribution;
    }

    /**
     * 🎨 Obtener distribución de colores
     */
    getColorDistribution() {
        if (!this.currentMetaData || !this.currentMetaData.decks) return {};
        
        const distribution = {};
        
        this.currentMetaData.decks.forEach(deck => {
            const colors = deck.colors || [];
            const colorKey = colors.length === 0 ? 'Colorless' : 
                           colors.length === 1 ? `Mono ${colors[0]}` :
                           colors.sort().join('');
            
            distribution[colorKey] = (distribution[colorKey] || 0) + 1;
        });
        
        return distribution;
    }

    /**
     * 📋 Obtener mazo por ID
     */
    getDeckById(deckId) {
        if (!this.currentMetaData || !this.currentMetaData.decks) return null;
        
        return this.currentMetaData.decks.find(deck => deck.id === deckId);
    }

    /**
     * 🔍 Buscar mazos
     */
    searchDecks(query) {
        if (!this.currentMetaData || !this.currentMetaData.decks) return [];
        
        const normalizedQuery = query.toLowerCase();
        
        return this.currentMetaData.decks.filter(deck => {
            return deck.name.toLowerCase().includes(normalizedQuery) ||
                   (deck.keyCards && deck.keyCards.some(card => 
                       card.toLowerCase().includes(normalizedQuery)
                   ));
        });
    }

    /**
     * 📊 Obtener mazos por rango de meta share
     */
    getDecksByMetaRange(minShare = 0, maxShare = 100) {
        if (!this.currentMetaData || !this.currentMetaData.decks) return [];
        
        return this.currentMetaData.decks.filter(deck => {
            const share = deck.metaShare || 0;
            return share >= minShare && share <= maxShare;
        });
    }

    /**
     * 🎯 Obtener recomendaciones basadas en cartas
     */
    getRecommendations(inputCards, limit = 5) {
        if (!this.currentMetaData || !this.currentMetaData.decks || !inputCards.length) return [];
        
        const scores = this.currentMetaData.decks.map(deck => {
            let score = 0;
            let matches = 0;
            
            if (deck.mainboard) {
                inputCards.forEach(inputCard => {
                    const found = deck.mainboard.find(deckCard => 
                        deckCard.name.toLowerCase() === inputCard.toLowerCase()
                    );
                    
                    if (found) {
                        matches++;
                        score += (found.weight || 1) * (deck.metaShare || 1);
                    }
                });
            }
            
            return {
                deck,
                score,
                matches,
                confidence: matches / inputCards.length
            };
        });
        
        return scores
            .filter(item => item.matches > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * 📝 Logging
     */
    log(message, data = null) {
        if (!this.debugMode) return;
        console.log(`🗄️ [DatabaseManager-Real] ${message}`, data || '');
    }

    /**
     * ❌ Error logging
     */
    logError(message, error = null) {
        console.error(`❌ [DatabaseManager-Real] ${message}`, error || '');
    }
}

export default DatabaseManager;