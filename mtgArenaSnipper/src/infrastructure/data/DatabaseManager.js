// src/infrastructure/data/DatabaseManager.js
// 🗄️ Gestor de base de datos dinámica con scraper de datos RECIENTES

import MTGGoldfishCompleteScraper from './MTGGoldfishCompleteScraper.js';

class DatabaseManager {
    constructor() {
        this.scraper = new MTGGoldfishCompleteScraper();
        this.currentMetaData = null;
        this.isUpdating = false;
        this.updatePromise = null;
        
        // Cache keys
        this.cacheKeys = {
            metaData: 'mtgArenaSniffer_metaData',
            lastUpdate: 'mtgArenaSniffer_lastUpdate',
            updateStatus: 'mtgArenaSniffer_updateStatus'
        };

        // Configuración
        this.config = {
            maxCacheAge: 12 * 60 * 60 * 1000, // 12 horas (más frecuente para datos recientes)
            fallbackData: true,
            autoUpdate: true,
            debugMode: true
        };

        this.debugMode = true;
    }

    /**
     * 🚀 Inicializar base de datos - método principal
     */
    async initialize() {
        try {
            this.log('🚀 Inicializando DatabaseManager con datos RECIENTES...');

            // Cargar datos existentes primero
            await this.loadCachedData();

            // Verificar si necesita actualización (más frecuente para datos recientes)
            if (this.config.autoUpdate && this.needsUpdate()) {
                this.log('📅 Datos desactualizados, actualizando con datos recientes...');
                this.updateInBackground();
            }

            // Si no tenemos datos, forzar actualización
            if (!this.currentMetaData) {
                this.log('📊 No hay datos en cache, forzando actualización...');
                await this.updateData();
            }

            this.log('✅ DatabaseManager inicializado con datos recientes');
            return { success: true, source: this.getDataSource() };

        } catch (error) {
            this.logError('❌ Error inicializando DatabaseManager:', error);
            
            // Cargar datos fallback si falla todo
            if (this.config.fallbackData) {
                await this.loadFallbackData();
                return { success: true, source: 'fallback', warning: error.message };
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * 📊 Obtener datos del meta actual (con datos recientes)
     */
    async getMetaData(forceUpdate = false) {
        try {
            // Si se fuerza actualización
            if (forceUpdate) {
                return await this.forceUpdate();
            }

            // Si ya tenemos datos recientes y no necesitan actualización
            if (this.currentMetaData && !this.needsUpdate()) {
                return this.currentMetaData;
            }

            // Si hay actualización en progreso, esperar
            if (this.isUpdating && this.updatePromise) {
                this.log('⏳ Esperando actualización en progreso...');
                await this.updatePromise;
                return this.currentMetaData;
            }

            // Iniciar actualización si es necesaria
            return await this.updateData();

        } catch (error) {
            this.logError('Error obteniendo meta data:', error);
            
            // Retornar datos cached si hay error
            return this.currentMetaData || await this.loadFallbackData();
        }
    }

    /**
     * 🔄 Actualizar datos (método principal con scraper reciente)
     */
    async updateData() {
        if (this.isUpdating) {
            return this.updatePromise;
        }

        this.isUpdating = true;
        this.updateStatus('updating', 'Obteniendo datos recientes de MTGGoldfish...');

        this.updatePromise = this.performUpdate();
        
        try {
            const result = await this.updatePromise;
            return result;
        } finally {
            this.isUpdating = false;
            this.updatePromise = null;
        }
    }

    /**
     * 🔄 Realizar actualización real con scraper reciente
     */
    async performUpdate() {
        try {
            this.log('🔄 Iniciando actualización con datos RECIENTES...');
            this.updateStatus('scraping', 'Scrapeando datos de últimos 7 días...');

            // Usar el scraper actualizado para obtener datos recientes
            const freshData = await this.scraper.scrapeCompleteMetaData();

            if (!freshData || !freshData.decks || freshData.decks.length === 0) {
                throw new Error('No se obtuvieron datos válidos del scraper reciente');
            }

            // Procesar y normalizar datos
            this.updateStatus('processing', 'Procesando datos recientes...');
            const processedData = await this.processScrapedData(freshData);

            // Guardar en cache
            await this.saveToCache(processedData);
            
            // Actualizar datos actuales
            this.currentMetaData = processedData;

            const dataAge = freshData.dataRange || 'últimos 7 días';
            this.updateStatus('completed', `✅ ${processedData.decks.length} mazos actualizados (${dataAge})`);
            this.log(`✅ Actualización completada: ${processedData.decks.length} mazos de ${dataAge}`);

            return processedData;

        } catch (error) {
            this.logError('❌ Error en actualización:', error);
            this.updateStatus('error', `Error: ${error.message}`);
            
            // Si falla, usar datos cached o fallback
            if (!this.currentMetaData) {
                this.currentMetaData = await this.loadFallbackData();
            }
            
            throw error;
        }
    }

    /**
     * ⚙️ Procesar datos scrapeados de fuente reciente
     */
    async processScrapedData(scrapedData) {
        try {
            this.log('⚙️ Procesando datos recientes scrapeados...');

            const processedDecks = scrapedData.decks.map(deck => this.processDeck(deck));

            // Añadir metadatos específicos para datos recientes
            const processedData = {
                ...scrapedData,
                decks: processedDecks,
                processedAt: new Date().toISOString(),
                version: '2.0',
                deckCount: processedDecks.length,
                dataFreshness: 'recent', // Marcador de datos recientes
                
                // Estadísticas del meta
                metaStats: this.calculateMetaStats(processedDecks),
                
                // Índices para búsqueda rápida
                indices: this.buildSearchIndices(processedDecks)
            };

            return processedData;

        } catch (error) {
            this.logError('Error procesando datos recientes:', error);
            throw error;
        }
    }

    /**
     * 🃏 Procesar mazo individual con datos recientes
     */
    processDeck(rawDeck) {
        try {
            // Generar ID consistente
            const id = this.generateDeckId(rawDeck.name);

            // Procesar cartas clave para predicción
            const processedKeyCards = this.processKeyCards(rawDeck.keyCards || []);

            // Detectar arquetipo (ya viene del scraper mejorado)
            const archetype = rawDeck.archetype || this.detectArchetype(rawDeck);

            // Calcular métricas
            const metrics = this.calculateDeckMetrics(rawDeck);

            return {
                id,
                name: rawDeck.name,
                metaShare: parseFloat(rawDeck.metaShare) || 0,
                rank: rawDeck.rank || 0,
                colors: rawDeck.colors || [],
                archetype,
                
                // Datos para predicción
                signatureCards: this.identifySignatureCards(rawDeck),
                keyCards: processedKeyCards,
                commonCards: this.identifyCommonCards(rawDeck),
                
                // Información estratégica
                strategy: this.inferStrategy(rawDeck, archetype),
                weakness: this.inferWeakness(rawDeck, archetype),
                expectedCurve: this.inferPlayPattern(rawDeck),
                
                // Datos técnicos
                mainboard: rawDeck.mainboard || [],
                sideboard: rawDeck.sideboard || [],
                cardCount: rawDeck.cardCount || 60,
                
                // Metadatos
                metrics,
                lastUpdated: rawDeck.extractedAt || new Date().toISOString(),
                source: rawDeck.source || 'MTGGoldfish-Recent',
                dataAge: 'recent' // Marcador de datos recientes
            };

        } catch (error) {
            this.logError(`Error procesando mazo ${rawDeck.name}:`, error);
            
            // Retornar estructura mínima si falla
            return {
                id: this.generateDeckId(rawDeck.name),
                name: rawDeck.name,
                metaShare: 0,
                rank: 999,
                colors: [],
                archetype: 'unknown',
                signatureCards: [],
                keyCards: [],
                commonCards: [],
                strategy: 'Unknown strategy',
                weakness: 'Unknown weakness',
                mainboard: [],
                sideboard: [],
                lastUpdated: new Date().toISOString(),
                dataAge: 'recent'
            };
        }
    }

    /**
     * 📊 Cargar datos de fallback actualizados
     */
    async loadFallbackData() {
        this.log('📊 Cargando datos fallback actualizados...');
        
        // Datos de fallback basados en el meta reciente de Standard
        const fallbackData = {
            lastUpdated: new Date().toISOString(),
            format: 'standard',
            source: 'Fallback-Recent',
            deckCount: 15,
            dataFreshness: 'fallback',
            dataRange: 'Meta actual estimado',
            decks: [
                {
                    id: 'domain-ramp',
                    name: 'Domain Ramp',
                    metaShare: 18.5,
                    rank: 1,
                    colors: ['W', 'U', 'B', 'R', 'G'],
                    archetype: 'ramp',
                    extractedAt: new Date().toISOString()
                },
                {
                    id: 'mono-red-aggro',
                    name: 'Mono Red Aggro',
                    metaShare: 15.2,
                    rank: 2,
                    colors: ['R'],
                    archetype: 'aggro',
                    extractedAt: new Date().toISOString()
                },
                {
                    id: 'azorius-control',
                    name: 'Azorius Control',
                    metaShare: 12.8,
                    rank: 3,
                    colors: ['W', 'U'],
                    archetype: 'control',
                    extractedAt: new Date().toISOString()
                },
                {
                    id: 'orzhov-midrange',
                    name: 'Orzhov Midrange',
                    metaShare: 11.4,
                    rank: 4,
                    colors: ['W', 'B'],
                    archetype: 'midrange',
                    extractedAt: new Date().toISOString()
                },
                {
                    id: 'boros-convoke',
                    name: 'Boros Convoke',
                    metaShare: 9.7,
                    rank: 5,
                    colors: ['W', 'R'],
                    archetype: 'aggro',
                    extractedAt: new Date().toISOString()
                },
                {
                    id: 'golgari-midrange',
                    name: 'Golgari Midrange',
                    metaShare: 8.3,
                    rank: 6,
                    colors: ['B', 'G'],
                    archetype: 'midrange',
                    extractedAt: new Date().toISOString()
                },
                {
                    id: 'esper-control',
                    name: 'Esper Control',
                    metaShare: 6.9,
                    rank: 7,
                    colors: ['W', 'U', 'B'],
                    archetype: 'control',
                    extractedAt: new Date().toISOString()
                },
                {
                    id: 'temur-discover',
                    name: 'Temur Discover',
                    metaShare: 5.8,
                    rank: 8,
                    colors: ['U', 'R', 'G'],
                    archetype: 'midrange',
                    extractedAt: new Date().toISOString()
                }
            ]
        };

        const processedFallback = await this.processScrapedData(fallbackData);
        this.currentMetaData = processedFallback;
        
        return processedFallback;
    }

    /**
     * ⏰ Verificar si necesita actualización (más frecuente para datos recientes)
     */
    needsUpdate() {
        if (!this.currentMetaData) {
            return true;
        }

        const lastUpdate = this.getLastUpdateTimestamp();
        const now = Date.now();
        const timeSinceUpdate = now - lastUpdate;

        // Para datos recientes, actualizar más frecuentemente
        return timeSinceUpdate >= this.config.maxCacheAge;
    }

    /**
     * 🔧 Obtener fuente de datos actual
     */
    getDataSource() {
        if (!this.currentMetaData) return 'none';
        
        const source = this.currentMetaData.source || '';
        
        if (source.includes('Recent') || source.includes('7Days')) return 'recent';
        if (source.includes('Fallback')) return 'fallback';
        if (source.includes('MTGGoldfish')) return 'scraped';
        
        return 'unknown';
    }

    // Resto de métodos permanecen igual...
    
    /**
     * 🔑 Identificar cartas signature
     */
    identifySignatureCards(deck) {
        if (!deck.keyCards || deck.keyCards.length === 0) {
            return [];
        }

        return deck.keyCards
            .filter(card => card.quantity >= 4) // 4 copias = signature
            .map(card => ({
                name: card.name,
                weight: 100,
                probability: 0.95,
                role: card.role || 'signature'
            }))
            .slice(0, 3);
    }

    /**
     * 🃏 Procesar cartas clave
     */
    processKeyCards(keyCards) {
        return keyCards
            .filter(card => card.quantity >= 2) // 2+ copias = key card
            .map(card => ({
                name: card.name,
                weight: Math.min(card.quantity * 20, 95), // Peso basado en cantidad
                probability: this.calculateCardProbability(card),
                role: card.role || this.inferCardRole(card.name),
                copies: card.quantity
            }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 12);
    }

    /**
     * 🔍 Identificar cartas comunes
     */
    identifyCommonCards(deck) {
        const mainboard = deck.mainboard || [];
        
        return mainboard
            .filter(card => card.quantity >= 2)
            .map(card => ({
                name: card.name,
                copies: card.quantity,
                role: this.inferCardRole(card.name)
            }))
            .slice(0, 20);
    }

    // Métodos auxiliares...
    
    calculateCardProbability(card) {
        return Math.min(card.quantity / 4, 0.95);
    }

    inferCardRole(cardName) {
        const name = cardName.toLowerCase();
        
        if (name.includes('bolt') || name.includes('shock') || name.includes('removal')) return 'removal';
        if (name.includes('teferi') || name.includes('jace') || name.includes('planeswalker')) return 'planeswalker';
        if (name.includes('counterspell') || name.includes('negate') || name.includes('counter')) return 'counter';
        if (name.includes('mountain') || name.includes('island') || name.includes('land')) return 'mana';
        
        return 'threat';
    }

    inferStrategy(deck, archetype) {
        const strategies = {
            aggro: 'Presiona rápidamente con criaturas eficientes',
            control: 'Controla el juego hasta desplegar win conditions',
            midrange: 'Intercambia recursos eficientemente',
            combo: 'Ensambla piezas de combo para ganar',
            ramp: 'Acelera maná para amenazas grandes',
            tempo: 'Despliega amenazas mientras disrumpe'
        };

        return strategies[archetype] || 'Estrategia adaptativa';
    }

    inferWeakness(deck, archetype) {
        const weaknesses = {
            aggro: 'Lifegain, board wipes, blockers grandes',
            control: 'Presión agresiva temprana',
            midrange: 'Estrategias especializadas',
            combo: 'Disrupción y contrahechizos',
            ramp: 'Aggro rápido y disrupción de maná',
            tempo: 'Removal masivo'
        };

        return weaknesses[archetype] || 'Vulnerabilidades situacionales';
    }

    detectArchetype(deck) {
        return deck.archetype || 'midrange';
    }

    calculateMetaStats(decks) {
        const totalShare = decks.reduce((sum, deck) => sum + (deck.metaShare || 0), 0);
        
        const archetypes = {};
        decks.forEach(deck => {
            if (!archetypes[deck.archetype]) {
                archetypes[deck.archetype] = { count: 0, totalShare: 0 };
            }
            archetypes[deck.archetype].count++;
            archetypes[deck.archetype].totalShare += deck.metaShare || 0;
        });

        return {
            totalDecks: decks.length,
            totalMetaShare: totalShare,
            averageMetaShare: totalShare / decks.length,
            archetypes,
            lastCalculated: new Date().toISOString()
        };
    }

    buildSearchIndices(decks) {
        const indices = {
            byCard: {},
            byColor: {},
            byArchetype: {},
            byRank: {}
        };

        decks.forEach(deck => {
            // Índice por cartas
            [...(deck.signatureCards || []), ...(deck.keyCards || [])].forEach(card => {
                if (!indices.byCard[card.name]) {
                    indices.byCard[card.name] = [];
                }
                indices.byCard[card.name].push(deck.id);
            });

            // Índice por colores
            const colorKey = deck.colors.sort().join('');
            if (!indices.byColor[colorKey]) {
                indices.byColor[colorKey] = [];
            }
            indices.byColor[colorKey].push(deck.id);

            // Índice por arquetipo
            if (!indices.byArchetype[deck.archetype]) {
                indices.byArchetype[deck.archetype] = [];
            }
            indices.byArchetype[deck.archetype].push(deck.id);

            // Índice por rank
            indices.byRank[deck.rank] = deck.id;
        });

        return indices;
    }

    calculateDeckMetrics(deck) {
        return {
            confidence: this.calculateConfidenceScore(deck),
            consistency: this.calculateConsistencyScore(deck),
            power: this.calculatePowerScore(deck)
        };
    }

    calculateConfidenceScore(deck) {
        let score = 0;
        
        if (deck.keyCards?.length >= 5) score += 30;
        if (deck.metaShare > 10) score += 25;
        if (deck.mainboard?.length >= 50) score += 25;
        if (deck.colors?.length > 0) score += 20;
        
        return Math.min(score, 100);
    }

    calculateConsistencyScore(deck) {
        return Math.floor(Math.random() * 40) + 60;
    }

    calculatePowerScore(deck) {
        const metaScore = (deck.metaShare || 0) * 3;
        const rankScore = deck.rank ? Math.max(0, 100 - deck.rank * 5) : 0;
        
        return Math.min(metaScore + rankScore, 100);
    }

    generateDeckId(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 30);
    }

    // Métodos de cache y estado...
    
    async loadCachedData() {
        try {
            const cached = localStorage.getItem(this.cacheKeys.metaData);
            
            if (cached) {
                this.currentMetaData = JSON.parse(cached);
                this.log('📁 Datos cargados desde cache local');
                return this.currentMetaData;
            }

            return null;

        } catch (error) {
            this.logError('Error cargando cache:', error);
            return null;
        }
    }

    async saveToCache(data) {
        try {
            localStorage.setItem(this.cacheKeys.metaData, JSON.stringify(data));
            localStorage.setItem(this.cacheKeys.lastUpdate, Date.now().toString());
            this.log('💾 Datos guardados en cache local');
        } catch (error) {
            this.logError('Error guardando en cache:', error);
        }
    }

    getLastUpdateTimestamp() {
        try {
            const timestamp = localStorage.getItem(this.cacheKeys.lastUpdate);
            return timestamp ? parseInt(timestamp) : 0;
        } catch {
            return 0;
        }
    }

    updateStatus(status, message) {
        const statusData = {
            status,
            message,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(this.cacheKeys.updateStatus, JSON.stringify(statusData));
        } catch (error) {
            this.logError('Error saving status:', error);
        }

        this.log(`📊 Status: ${status} - ${message}`);
    }

    async forceUpdate() {
        this.log('🔄 Forzando actualización...');
        this.clearUpdateTimestamp();
        return await this.updateData();
    }

    clearUpdateTimestamp() {
        try {
            localStorage.removeItem(this.cacheKeys.lastUpdate);
        } catch (error) {
            this.logError('Error clearing timestamp:', error);
        }
    }

    updateInBackground() {
        if (this.needsUpdate()) {
            this.log('🔄 Iniciando actualización en background...');
            
            this.updateData().catch(error => {
                this.logError('Error en actualización background:', error);
            });
        }
    }

    getStats() {
        const status = this.getUpdateStatus();
        const lastUpdate = this.getLastUpdateTimestamp();
        
        return {
            isInitialized: !!this.currentMetaData,
            isUpdating: this.isUpdating,
            needsUpdate: this.needsUpdate(),
            lastUpdate: lastUpdate ? new Date(lastUpdate).toISOString() : null,
            deckCount: this.currentMetaData?.deckCount || 0,
            status: status?.status || 'unknown',
            dataSource: this.getDataSource(),
            dataFreshness: this.currentMetaData?.dataFreshness || 'unknown',
            config: this.config
        };
    }

    getUpdateStatus() {
        try {
            const status = localStorage.getItem(this.cacheKeys.updateStatus);
            return status ? JSON.parse(status) : null;
        } catch {
            return null;
        }
    }

    getCurrentMetaData() {
        return this.currentMetaData;
    }

    log(message, data = null) {
        if (!this.debugMode) return;
        console.log(`🗄️ [DatabaseManager] ${message}`, data || '');
    }

    logError(message, error = null) {
        console.error(`❌ [DatabaseManager] ${message}`, error || '');
    }
}

export default DatabaseManager;