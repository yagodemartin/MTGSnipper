
// src/infrastructure/data/DatabaseManager.js
// 🗄️ Gestor de base de datos dinámica con actualización automática

import MTGGoldfishScraper from './MTGGoldfishScraper.js';

class DatabaseManager {
    constructor() {
        this.scraper = new MTGGoldfishScraper();
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
            maxCacheAge: 24 * 60 * 60 * 1000, // 24 horas
            fallbackData: true, // Usar datos estáticos si falla scraping
            autoUpdate: true,   // Auto-actualizar al inicio
            debugMode: true
        };

        this.debugMode = true;
    }

    /**
     * 🚀 Inicializar base de datos - método principal
     */
    async initialize() {
        try {
            this.log('🚀 Inicializando DatabaseManager...');

            // Cargar datos existentes primero
            await this.loadCachedData();

            // Verificar si necesita actualización
            if (this.config.autoUpdate) {
                this.updateInBackground();
            }

            this.log('✅ DatabaseManager inicializado');
            return true;

        } catch (error) {
            this.logError('❌ Error inicializando DatabaseManager:', error);
            
            // Cargar datos fallback si falla todo
            if (this.config.fallbackData) {
                await this.loadFallbackData();
            }
            
            return false;
        }
    }

    /**
     * 📊 Obtener datos del meta actual
     */
    async getMetaData(forceUpdate = false) {
        try {
            // Si se fuerza actualización
            if (forceUpdate) {
                return await this.forceUpdate();
            }

            // Si ya tenemos datos y no necesitan actualización
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
     * 🔄 Actualizar datos (método principal)
     */
    async updateData() {
        if (this.isUpdating) {
            return this.updatePromise;
        }

        this.isUpdating = true;
        this.updateStatus('updating', 'Iniciando actualización...');

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
     * 🔄 Realizar actualización real
     */
    async performUpdate() {
        try {
            this.log('🔄 Iniciando actualización de datos...');
            this.updateStatus('scraping', 'Scrapeando MTGGoldfish...');

            // Usar el scraper para obtener datos frescos
            const freshData = await this.scraper.updateIfNeeded();

            if (!freshData || !freshData.decks || freshData.decks.length === 0) {
                throw new Error('No se obtuvieron datos válidos del scraper');
            }

            // Procesar y normalizar datos
            this.updateStatus('processing', 'Procesando datos...');
            const processedData = await this.processScrapedData(freshData);

            // Guardar en cache
            await this.saveToCache(processedData);
            
            // Actualizar datos actuales
            this.currentMetaData = processedData;

            this.updateStatus('completed', `✅ ${processedData.decks.length} mazos actualizados`);
            this.log(`✅ Actualización completada: ${processedData.decks.length} mazos`);

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
     * 🔄 Forzar actualización inmediata
     */
    async forceUpdate() {
        this.log('🔄 Forzando actualización inmediata...');
        
        // Limpiar cache de timestamps para forzar update
        this.clearUpdateTimestamp();
        
        return await this.updateData();
    }

    /**
     * 🔄 Actualización en background (no bloquea)
     */
    updateInBackground() {
        if (this.needsUpdate()) {
            this.log('🔄 Iniciando actualización en background...');
            
            // No await - se ejecuta en background
            this.updateData().catch(error => {
                this.logError('Error en actualización background:', error);
            });
        }
    }

    /**
     * ⚙️ Procesar datos scrapeados y convertir a formato estándar
     */
    async processScrapedData(scrapedData) {
        try {
            this.log('⚙️ Procesando datos scrapeados...');

            const processedDecks = scrapedData.decks.map(deck => this.processDeck(deck));

            // Añadir metadatos
            const processedData = {
                ...scrapedData,
                decks: processedDecks,
                processedAt: new Date().toISOString(),
                version: '1.0',
                deckCount: processedDecks.length,
                
                // Estadísticas del meta
                metaStats: this.calculateMetaStats(processedDecks),
                
                // Índices para búsqueda rápida
                indices: this.buildSearchIndices(processedDecks)
            };

            return processedData;

        } catch (error) {
            this.logError('Error procesando datos:', error);
            throw error;
        }
    }

    /**
     * 🃏 Procesar mazo individual
     */
    processDeck(rawDeck) {
        try {
            // Generar ID consistente
            const id = this.generateDeckId(rawDeck.name);

            // Procesar cartas clave para predicción
            const processedKeyCards = this.processKeyCards(rawDeck.keyCards || []);

            // Detectar arquetipo
            const archetype = this.detectArchetype(rawDeck);

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
                lastUpdated: rawDeck.lastUpdated || new Date().toISOString(),
                source: 'MTGGoldfish'
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
                lastUpdated: new Date().toISOString()
            };
        }
    }

    /**
     * 🔑 Identificar cartas signature (que confirman el mazo)
     */
    identifySignatureCards(deck) {
        if (!deck.keyCards || deck.keyCards.length === 0) {
            return [];
        }

        // Cartas con mayor peso son signature
        return deck.keyCards
            .filter(card => card.weight >= 80) // Alto peso = signature
            .map(card => ({
                name: card.name,
                weight: 100, // Peso máximo para signature
                probability: 0.95,
                role: card.role || 'signature'
            }))
            .slice(0, 3); // Max 3 signature cards
    }

    /**
     * 🃏 Procesar cartas clave para predicción
     */
    processKeyCards(keyCards) {
        return keyCards
            .filter(card => card.weight >= 50) // Filtrar cartas importantes
            .map(card => ({
                name: card.name,
                weight: Math.min(card.weight, 95), // Max 95 para key cards
                probability: this.calculateCardProbability(card),
                role: card.role || this.inferCardRole(card.name),
                copies: this.estimateCardCopies(card)
            }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 12); // Max 12 key cards
    }

    /**
     * 🏗️ Detectar arquetipo del mazo
     */
    detectArchetype(deck) {
        const colors = deck.colors?.length || 0;
        const name = deck.name.toLowerCase();

        // Detección por nombre
        if (name.includes('aggro') || name.includes('burn')) return 'aggro';
        if (name.includes('control')) return 'control';
        if (name.includes('midrange') || name.includes('value')) return 'midrange';
        if (name.includes('combo')) return 'combo';
        if (name.includes('ramp')) return 'ramp';

        // Detección por colores y características
        if (colors === 1) {
            if (name.includes('red')) return 'aggro';
            if (name.includes('blue')) return 'control';
        }

        if (colors >= 3) return 'midrange';
        if (colors === 2) return 'midrange';

        return 'midrange'; // Default
    }

    /**
     * 📊 Calcular estadísticas del meta
     */
    calculateMetaStats(decks) {
        const totalShare = decks.reduce((sum, deck) => sum + (deck.metaShare || 0), 0);
        
        const archetypes = {};
        const colorCombinations = {};

        decks.forEach(deck => {
            // Estadísticas por arquetipo
            if (!archetypes[deck.archetype]) {
                archetypes[deck.archetype] = { count: 0, totalShare: 0 };
            }
            archetypes[deck.archetype].count++;
            archetypes[deck.archetype].totalShare += deck.metaShare || 0;

            // Estadísticas por combinación de colores
            const colorKey = deck.colors.sort().join('');
            if (!colorCombinations[colorKey]) {
                colorCombinations[colorKey] = { count: 0, totalShare: 0, colors: deck.colors };
            }
            colorCombinations[colorKey].count++;
            colorCombinations[colorKey].totalShare += deck.metaShare || 0;
        });

        return {
            totalDecks: decks.length,
            totalMetaShare: totalShare,
            averageMetaShare: totalShare / decks.length,
            archetypes,
            colorCombinations,
            lastCalculated: new Date().toISOString()
        };
    }

    /**
     * 🔍 Construir índices para búsqueda rápida
     */
    buildSearchIndices(decks) {
        const indices = {
            byCard: {},      // card name -> deck ids
            byColor: {},     // color combo -> deck ids  
            byArchetype: {}, // archetype -> deck ids
            byRank: {}       // rank -> deck id
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

    /**
     * 🔍 Buscar mazos por carta
     */
    findDecksByCard(cardName) {
        if (!this.currentMetaData?.indices?.byCard) {
            return [];
        }

        const deckIds = this.currentMetaData.indices.byCard[cardName] || [];
        return deckIds.map(id => this.getDeckById(id)).filter(Boolean);
    }

    /**
     * 🔍 Obtener mazo por ID
     */
    getDeckById(deckId) {
        if (!this.currentMetaData?.decks) {
            return null;
        }

        return this.currentMetaData.decks.find(deck => deck.id === deckId) || null;
    }

    /**
     * 📋 Obtener top N mazos
     */
    getTopDecks(count = 10) {
        if (!this.currentMetaData?.decks) {
            return [];
        }

        return this.currentMetaData.decks
            .sort((a, b) => (b.metaShare || 0) - (a.metaShare || 0))
            .slice(0, count);
    }

    /**
     * ⏰ Verificar si necesita actualización
     */
    needsUpdate() {
        if (!this.currentMetaData) {
            return true;
        }

        const lastUpdate = this.getLastUpdateTimestamp();
        const now = Date.now();
        const timeSinceUpdate = now - lastUpdate;

        return timeSinceUpdate >= this.config.maxCacheAge;
    }

    /**
     * 📁 Cargar datos desde cache
     */
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

    /**
     * 💾 Guardar datos en cache
     */
    async saveToCache(data) {
        try {
            localStorage.setItem(this.cacheKeys.metaData, JSON.stringify(data));
            localStorage.setItem(this.cacheKeys.lastUpdate, Date.now().toString());
            this.log('💾 Datos guardados en cache local');
        } catch (error) {
            this.logError('Error guardando en cache:', error);
        }
    }

    /**
     * 📊 Cargar datos fallback (estáticos)
     */
    async loadFallbackData() {
        this.log('📊 Cargando datos fallback...');
        
        // Datos mínimos para que la app funcione
        const fallbackData = {
            lastUpdated: new Date().toISOString(),
            format: 'standard',
            source: 'fallback',
            deckCount: 3,
            decks: [
                {
                    id: 'domain-ramp',
                    name: 'Domain Ramp',
                    metaShare: 18.0,
                    rank: 1,
                    colors: ['W', 'U', 'B', 'R', 'G'],
                    archetype: 'ramp',
                    signatureCards: [
                        { name: 'Leyline of the Guildpact', weight: 100, probability: 0.95 }
                    ],
                    keyCards: [
                        { name: 'Up the Beanstalk', weight: 80, probability: 0.80 },
                        { name: 'Atraxa, Grand Unifier', weight: 90, probability: 0.85 }
                    ],
                    strategy: 'Accelerate mana with domain for big threats',
                    weakness: 'Fast aggro and mana disruption'
                },
                {
                    id: 'mono-red-aggro',
                    name: 'Mono Red Aggro', 
                    metaShare: 15.0,
                    rank: 2,
                    colors: ['R'],
                    archetype: 'aggro',
                    signatureCards: [
                        { name: 'Monastery Swiftspear', weight: 100, probability: 0.98 }
                    ],
                    keyCards: [
                        { name: 'Lightning Bolt', weight: 95, probability: 0.95 },
                        { name: 'Goblin Guide', weight: 90, probability: 0.90 }
                    ],
                    strategy: 'Fast pressure with efficient creatures and burn',
                    weakness: 'Lifegain and board wipes'
                },
                {
                    id: 'azorius-control',
                    name: 'Azorius Control',
                    metaShare: 12.0,
                    rank: 3,
                    colors: ['W', 'U'],
                    archetype: 'control',
                    signatureCards: [
                        { name: 'Teferi, Hero of Dominaria', weight: 100, probability: 0.95 }
                    ],
                    keyCards: [
                        { name: 'Counterspell', weight: 90, probability: 0.95 },
                        { name: 'Supreme Verdict', weight: 85, probability: 0.85 }
                    ],
                    strategy: 'Control the game until win condition',
                    weakness: 'Resilient midrange and hand disruption'
                }
            ]
        };

        // Procesar datos fallback
        const processedFallback = await this.processScrapedData(fallbackData);
        this.currentMetaData = processedFallback;
        
        return processedFallback;
    }

    /**
     * 🔧 Métodos auxiliares
     */
    generateDeckId(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 30);
    }

    calculateCardProbability(card) {
        // Probabilidad basada en peso
        return Math.min(card.weight / 100, 0.95);
    }

    estimateCardCopies(card) {
        // Estimar número de copias basado en peso
        if (card.weight >= 90) return 4;
        if (card.weight >= 70) return 3;
        if (card.weight >= 50) return 2;
        return 1;
    }

    inferCardRole(cardName) {
        const name = cardName.toLowerCase();
        
        if (name.includes('bolt') || name.includes('shock')) return 'removal';
        if (name.includes('teferi') || name.includes('jace')) return 'planeswalker';
        if (name.includes('counterspell') || name.includes('negate')) return 'counter';
        if (name.includes('mountain') || name.includes('island')) return 'mana';
        
        return 'threat';
    }

    inferStrategy(deck, archetype) {
        const strategies = {
            aggro: 'Deal 20 damage as quickly as possible',
            control: 'Control the game until you can deploy win conditions',
            midrange: 'Trade resources efficiently and deploy threats',
            combo: 'Assemble combo pieces and win quickly',
            ramp: 'Accelerate mana to deploy big threats early'
        };

        return strategies[archetype] || 'Unknown strategy';
    }

    inferWeakness(deck, archetype) {
        const weaknesses = {
            aggro: 'Lifegain, board wipes, and bigger creatures',
            control: 'Fast aggro and uncounterable threats',
            midrange: 'Combo decks and over-the-top strategies',
            combo: 'Disruption and fast aggro pressure',
            ramp: 'Fast aggro and mana disruption'
        };

        return weaknesses[archetype] || 'Unknown weakness';
    }

    calculateDeckMetrics(deck) {
        return {
            confidence: this.calculateConfidenceScore(deck),
            consistency: this.calculateConsistencyScore(deck),
            power: this.calculatePowerScore(deck)
        };
    }

    calculateConfidenceScore(deck) {
        // Score basado en calidad de datos
        let score = 0;
        
        if (deck.keyCards?.length >= 5) score += 30;
        if (deck.metaShare > 10) score += 25;
        if (deck.mainboard?.length >= 50) score += 25;
        if (deck.colors?.length > 0) score += 20;
        
        return Math.min(score, 100);
    }

    calculateConsistencyScore(deck) {
        // Estimación de consistencia basada en estructura
        return Math.floor(Math.random() * 40) + 60; // 60-100 placeholder
    }

    calculatePowerScore(deck) {
        // Estimación de poder basada en meta share y rank
        const metaScore = (deck.metaShare || 0) * 3;
        const rankScore = deck.rank ? Math.max(0, 100 - deck.rank * 5) : 0;
        
        return Math.min(metaScore + rankScore, 100);
    }

    getLastUpdateTimestamp() {
        try {
            const timestamp = localStorage.getItem(this.cacheKeys.lastUpdate);
            return timestamp ? parseInt(timestamp) : 0;
        } catch {
            return 0;
        }
    }

    clearUpdateTimestamp() {
        try {
            localStorage.removeItem(this.cacheKeys.lastUpdate);
        } catch (error) {
            this.logError('Error clearing timestamp:', error);
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

    getUpdateStatus() {
        try {
            const status = localStorage.getItem(this.cacheKeys.updateStatus);
            return status ? JSON.parse(status) : null;
        } catch {
            return null;
        }
    }

    // Configuración
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.log('⚙️ Configuración actualizada', this.config);
    }

    getConfig() {
        return { ...this.config };
    }

    // Estadísticas
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
            config: this.config
        };
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