// src/infrastructure/data/DatabaseManager.js
// 🗄️ DatabaseManager actualizado para cartas reales del scraper

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
        maxCacheAge: 0 * 60 * 60 * 1000, // 2 horas (más frecuente)
        autoUpdate: true, // ← ACTIVADO
        debugMode: true,
        forceUpdateOnStart: true // ← NUEVO: forzar al iniciar
    };

    this.debugMode = true;
}

 async initialize() {
    try {
        this.log('🚀 Inicializando DatabaseManager...');
        await this.loadCachedData();
        
        // CAMBIO: Verificar si necesita actualización
        if (!this.currentMetaData || this.needsUpdate()) {
            this.log('📊 Datos desactualizados, actualizando...');
            try {
                await this.updateData();
            } catch (error) {
                this.logError('No se pudieron obtener datos nuevos:', error);
                // Si falla, usar datos cache si existen
                if (!this.currentMetaData) {
                    throw error;
                }
            }
        } else {
            this.log('📁 Usando datos en cache (actuales)');
        }
        
        this.log('✅ DatabaseManager inicializado');
        return { success: true, source: this.getDataSource() };
    } catch (error) {
        this.logError('❌ Error inicializando:', error);
        return { success: false, error: error.message };
    }
}

// En DatabaseManager, añadir:
async forceUpdateFromUI() {
    this.log('🔄 FORZANDO actualización desde UI...');
    
    // Limpiar cache completamente
    this.clearCache();
    
    // Forzar nueva actualización
    return await this.updateData();
}

// En DatabaseManager.js, añadir:

clearCache() {
    try {
        localStorage.removeItem(this.cacheKeys.metaData);
        localStorage.removeItem(this.cacheKeys.lastUpdate);
        localStorage.removeItem(this.cacheKeys.updateStatus);
        
        // Resetear datos actuales
        this.currentMetaData = null;
        
        this.log('🗑️ Cache limpiado completamente');
        return true;
    } catch (error) {
        this.logError('Error limpiando cache:', error);
        return false;
    }
}

async resetAndUpdate() {
    this.log('🔄 Reset completo de base de datos...');
    
    // Limpiar todo
    this.clearCache();
    
    // Forzar nueva actualización
    return await this.updateData();
}

    /**
     * 📊 Verificar si tenemos cartas reales
     */
    hasRealCards() {
        if (!this.currentMetaData || !this.currentMetaData.decks) return false;
        
        // Verificar que al menos un mazo tenga cartas reales
        return this.currentMetaData.decks.some(deck => 
            deck.mainboard && deck.mainboard.length > 30 // Al menos 30 cartas reales
        );
    }

    /**
     * 🔄 Actualizar con scraper completo
     */
    async updateData() {
        if (this.isUpdating) {
            return this.updatePromise;
        }

        this.isUpdating = true;
        this.updateStatus('updating', 'Scrapeando cartas reales de MTGGoldfish...');

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
     * ⚙️ Procesar datos reales del scraper para predicción
     */
   async processRealCardData(scrapedData) {
    try {
        this.log('⚙️ Procesando cartas reales para sistema de predicción...');

        // Procesar mazos y eliminar duplicados
        const processedDecks = scrapedData.decks
            .map(deck => this.processRealDeck(deck))
            .filter(deck => deck && deck.name && deck.name.length > 2); // Filtrar nombres válidos

        // ELIMINAR DUPLICADOS por nombre similar
        const uniqueDecks = this.removeDuplicateDecks(processedDecks);

        // Ordenar por meta share
        uniqueDecks.sort((a, b) => b.metaShare - a.metaShare);

        // Reasignar ranks
        uniqueDecks.forEach((deck, index) => {
            deck.rank = index + 1;
        });

        // Estadísticas de cartas reales
        const totalRealCards = uniqueDecks.reduce((sum, deck) => 
            sum + (deck.mainboard?.length || 0) + (deck.sideboard?.length || 0), 0
        );

        const processedData = {
            ...scrapedData,
            decks: uniqueDecks,
            processedAt: new Date().toISOString(),
            version: '3.0-real-cards',
            deckCount: uniqueDecks.length,
            totalRealCards,
            dataFreshness: 'real-cards',
            
            // Estadísticas del meta con cartas reales
            metaStats: this.calculateRealMetaStats(uniqueDecks),
            
            // Índices de búsqueda por cartas reales
            indices: this.buildRealCardIndices(uniqueDecks)
        };

        this.log(`✅ Mazos únicos procesados: ${uniqueDecks.length}`);
        uniqueDecks.forEach(deck => {
            this.log(`  ${deck.rank}. ${deck.name} (${deck.metaShare}%) - ${deck.mainboard?.length || 0} cartas`);
        });

        return processedData;

    } catch (error) {
        this.logError('Error procesando cartas reales:', error);
        throw error;
    }
}

removeDuplicateDecks(decks) {
    const unique = [];
    const seenIds = new Set();
    
    for (const deck of decks) {
        if (!deck || !deck.name || deck.name.length < 3) continue;
        
        // Solo verificar duplicados por ID
        if (!seenIds.has(deck.id)) {
            seenIds.add(deck.id);
            unique.push(deck);
            this.log(`✅ Mazo único: ${deck.name}`);
        } else {
            this.log(`🔄 Eliminando duplicado: ${deck.name}`);
        }
    }
    
    return unique;
}

    /**
     * 🃏 Procesar mazo individual con cartas reales
     */
    processRealDeck(rawDeck) {
    try {
        // Validar datos de entrada
        if (!rawDeck || !rawDeck.name || rawDeck.name.length < 3) {
            this.log(`⚠️ Mazo inválido: ${rawDeck?.name || 'sin nombre'}`);
            return null;
        }
        
        // Limpiar nombre del mazo
        const cleanName = rawDeck.name
            .replace(/^\d+\.\s*/, '') // Remover número inicial
            .replace(/\$.*$/, '') // Remover precio
            .replace(/\([^)]*\)$/, '') // Remover paréntesis al final
            .trim();
        
        if (cleanName.length < 3) {
            this.log(`⚠️ Nombre muy corto después de limpiar: ${cleanName}`);
            return null;
        }
        
        const id = this.generateDeckId(cleanName);
        
        // Procesar cartas reales del mainboard
        const processedMainboard = this.processCardList(rawDeck.mainboard || []);
        const processedSideboard = this.processCardList(rawDeck.sideboard || []);
        
        // Verificar que tiene cartas válidas
        if (processedMainboard.length === 0) {
            this.log(`⚠️ Mazo sin cartas mainboard: ${cleanName}`);
            return null;
        }

        // Resto del procesamiento...
        const signatureCards = this.identifyRealSignatureCards(processedMainboard);
        const keyCards = this.identifyRealKeyCards(processedMainboard);
        const archetype = this.detectArchetypeFromRealCards(processedMainboard);
        const colors = this.inferColorsFromRealCards(processedMainboard);

        return {
            id,
            name: cleanName,
            metaShare: parseFloat(rawDeck.metaShare) || 0,
            rank: rawDeck.rank || 0,
            colors,
            archetype,
            
            // CARTAS REALES para predicción
            signatureCards,
            keyCards,
            mainboard: processedMainboard,
            sideboard: processedSideboard,
            
            // Datos visuales
            deckImage: rawDeck.deckImage,
            
            // Información estratégica
            strategy: this.inferStrategy(archetype, cleanName),
            weakness: this.inferWeakness(archetype, cleanName),
            
            // Métricas
            cardCount: processedMainboard.length + processedSideboard.length,
            mainboardCount: processedMainboard.length,
            sideboardCount: processedSideboard.length,
            
            // Metadatos
            lastUpdated: rawDeck.extractedAt || new Date().toISOString(),
            source: 'MTGGoldfish-Real-Cards',
            dataAge: 'real'
        };

    } catch (error) {
        this.logError(`Error procesando mazo ${rawDeck?.name}:`, error);
        return null; // Retornar null en lugar de estructura vacía
    }
}

    /**
     * 📋 Procesar lista de cartas
     */
    processCardList(cardList) {
        if (!cardList || !Array.isArray(cardList)) return [];
        
        return cardList.map(card => ({
            name: card.name,
            quantity: card.quantity || 1,
            imageUrl: card.imageUrl || null,
            normalizedName: this.normalizeCardName(card.name),
            extractedAt: card.extractedAt || new Date().toISOString()
        }));
    }

    /**
     * 🎯 Identificar cartas signature REALES (peso máximo para predicción)
     */
    identifyRealSignatureCards(mainboard) {
        if (!mainboard || mainboard.length === 0) return [];

        // Cartas signature = 4 copias + nombre único/característico
        const signatureCards = mainboard
            .filter(card => card.quantity === 4)
            .filter(card => this.isSignatureCard(card.name))
            .map(card => ({
                name: card.name,
                weight: 100, // Peso máximo
                probability: 0.98, // 98% probability si aparece
                role: 'signature',
                quantity: card.quantity,
                imageUrl: card.imageUrl
            }))
            .slice(0, 3); // Top 3 signature cards

        return signatureCards;
    }

    /**
     * 🔑 Identificar cartas clave REALES
     */
    identifyRealKeyCards(mainboard) {
        if (!mainboard || mainboard.length === 0) return [];

        // Cartas clave = 2+ copias, excluyendo tierras básicas
        const keyCards = mainboard
            .filter(card => card.quantity >= 2)
            .filter(card => !this.isBasicLand(card.name))
            .map(card => ({
                name: card.name,
                weight: this.calculateCardWeight(card),
                probability: this.calculateCardProbability(card),
                role: this.inferCardRole(card.name),
                quantity: card.quantity,
                imageUrl: card.imageUrl
            }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 12); // Top 12 key cards

        return keyCards;
    }

    /**
     * 🎯 Verificar si una carta es signature
     */
    isSignatureCard(cardName) {
        const name = cardName.toLowerCase();
        
        // Cartas que son claramente signature de arquetipos específicos
        const signaturePatterns = [
            'cauldron', 'atraxa', 'leyline', 'teferi', 'sheoldred',
            'monastery swiftspear', 'goblin guide', 'supreme verdict',
            'wedding announcement', 'up the beanstalk', 'omnath'
        ];
        
        // No son signature: tierras básicas, cartas genéricas
        if (this.isBasicLand(cardName)) return false;
        if (name.includes('mountain') || name.includes('island') || 
            name.includes('plains') || name.includes('swamp') || 
            name.includes('forest')) return false;
        
        return signaturePatterns.some(pattern => name.includes(pattern)) ||
               this.isUniqueCardName(name);
    }

    /**
     * 🔍 Verificar si es nombre único de carta
     */
    isUniqueCardName(name) {
        // Cartas con nombres largos/únicos tienden a ser signature
        return name.length > 15 && name.includes(' ') && !name.includes('land');
    }

    /**
     * 🎨 Inferir colores desde cartas reales
     */
    inferColorsFromRealCards(mainboard) {
        const colors = new Set();
        
        for (const card of mainboard) {
            const name = card.name.toLowerCase();
            
            // Tierras básicas (fuente más confiable)
            if (name === 'mountain') colors.add('R');
            if (name === 'island') colors.add('U');
            if (name === 'swamp') colors.add('B');
            if (name === 'forest') colors.add('G');
            if (name === 'plains') colors.add('W');
            
            // Patrones en nombres de cartas
            if (name.includes('lightning') || name.includes('red') || name.includes('fire')) colors.add('R');
            if (name.includes('counter') || name.includes('blue') || name.includes('draw')) colors.add('U');
            if (name.includes('destroy') || name.includes('black') || name.includes('death')) colors.add('B');
            if (name.includes('green') || name.includes('growth') || name.includes('elf')) colors.add('G');
            if (name.includes('white') || name.includes('angel') || name.includes('heal')) colors.add('W');
        }
        
        return Array.from(colors);
    }

    /**
     * 🏗️ Detectar arquetipo desde cartas reales
     */
    detectArchetypeFromRealCards(mainboard) {
        if (!mainboard || mainboard.length === 0) return 'midrange';
        
        let aggroScore = 0;
        let controlScore = 0;
        let rampScore = 0;
        
        for (const card of mainboard) {
            const name = card.name.toLowerCase();
            const qty = card.quantity || 1;
            
            // Patrones de aggro
            if (name.includes('bolt') || name.includes('burn') || name.includes('swiftspear') || 
                name.includes('guide') || name.includes('aggressive')) {
                aggroScore += qty * 2;
            }
            
            // Patrones de control
            if (name.includes('counter') || name.includes('verdict') || name.includes('control') ||
                name.includes('teferi') || name.includes('wrath')) {
                controlScore += qty * 2;
            }
            
            // Patrones de ramp
            if (name.includes('ramp') || name.includes('leyline') || name.includes('domain') ||
                name.includes('atraxa') || name.includes('beanstalk')) {
                rampScore += qty * 2;
            }
        }
        
        if (rampScore > Math.max(aggroScore, controlScore)) return 'ramp';
        if (aggroScore > controlScore + 3) return 'aggro';
        if (controlScore > aggroScore + 3) return 'control';
        
        return 'midrange';
    }

    /**
     * 📊 Construir índices de búsqueda por cartas reales
     */
    buildRealCardIndices(decks) {
        const indices = {
            byCard: {},      // carta -> [deckIds]
            byColors: {},    // colores -> [deckIds]
            byArchetype: {}, // arquetipo -> [deckIds]
            cardToDecks: {}  // nombre carta -> { deckId: { quantity, role, weight } }
        };

        decks.forEach(deck => {
            // Índice por cartas (todas las cartas del mainboard)
            [...(deck.mainboard || [])].forEach(card => {
                const cardName = card.name;
                
                if (!indices.byCard[cardName]) {
                    indices.byCard[cardName] = [];
                }
                indices.byCard[cardName].push(deck.id);
                
                // Índice detallado carta -> deck
                if (!indices.cardToDecks[cardName]) {
                    indices.cardToDecks[cardName] = {};
                }
                indices.cardToDecks[cardName][deck.id] = {
                    quantity: card.quantity,
                    imageUrl: card.imageUrl,
                    deckName: deck.name,
                    deckMetaShare: deck.metaShare
                };
            });

            // Índice por colores
            const colorKey = deck.colors.sort().join('');
            if (!indices.byColors[colorKey]) {
                indices.byColors[colorKey] = [];
            }
            indices.byColors[colorKey].push(deck.id);

            // Índice por arquetipo
            if (!indices.byArchetype[deck.archetype]) {
                indices.byArchetype[deck.archetype] = [];
            }
            indices.byArchetype[deck.archetype].push(deck.id);
        });

        return indices;
    }

    // Métodos auxiliares...
    
    calculateCardWeight(card) {
        let weight = card.quantity * 20; // Base: cantidad * 20
        
        if (card.quantity === 4) weight += 20; // Bonus por 4 copias
        if (card.quantity === 3) weight += 10; // Bonus por 3 copias
        if (this.isSignatureCard(card.name)) weight += 30; // Bonus signature
        
        return Math.min(weight, 100);
    }

    calculateCardProbability(card) {
        return Math.min(card.quantity / 4 * 0.9, 0.95); // Max 95%
    }

    inferCardRole(cardName) {
        const name = cardName.toLowerCase();
        
        if (name.includes('bolt') || name.includes('removal') || name.includes('destroy')) return 'removal';
        if (name.includes('counter') || name.includes('negate')) return 'counter';
        if (name.includes('teferi') || name.includes('planeswalker')) return 'planeswalker';
        if (name.includes('swiftspear') || name.includes('guide') || name.includes('creature')) return 'threat';
        if (this.isBasicLand(cardName)) return 'mana';
        
        return 'spell';
    }

    isBasicLand(cardName) {
        const exactBasics = ['Mountain', 'Island', 'Swamp', 'Forest', 'Plains'];
        return exactBasics.includes(cardName);
    }

    calculateRealMetaStats(decks) {
        const totalCards = decks.reduce((sum, deck) => 
            sum + (deck.mainboard?.length || 0) + (deck.sideboard?.length || 0), 0
        );
        
        const uniqueCards = new Set();
        decks.forEach(deck => {
            [...(deck.mainboard || []), ...(deck.sideboard || [])].forEach(card => {
                uniqueCards.add(card.name);
            });
        });

        return {
            totalDecks: decks.length,
            totalCards,
            uniqueCards: uniqueCards.size,
            averageCardsPerDeck: Math.round(totalCards / decks.length),
            decksWithImages: decks.filter(d => d.deckImage).length,
            cardsWithImages: decks.reduce((sum, deck) => 
                sum + (deck.mainboard?.filter(c => c.imageUrl).length || 0), 0
            )
        };
    }

    normalizeCardName(name) {
        return name.toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ');
    }

    generateDeckId(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 30);
    }

    inferStrategy(archetype, deckName) {
        const strategies = {
            aggro: 'Presiona rápidamente con criaturas eficientes y burn',
            control: 'Controla el juego con counters y removal hasta win conditions',
            midrange: 'Intercambia recursos eficientemente con amenazas sólidas',
            ramp: 'Acelera maná para desplegar amenazas grandes rápidamente',
            combo: 'Ensambla piezas específicas para ganar'
        };

        return strategies[archetype] || 'Estrategia adaptativa basada en value';
    }

    inferWeakness(archetype, deckName) {
        const weaknesses = {
            aggro: 'Board wipes, lifegain masivo y blockers grandes',
            control: 'Presión agresiva temprana y cartas uncounterable',
            midrange: 'Estrategias más especializadas y combos',
            ramp: 'Aggro muy rápido antes de estabilizar',
            combo: 'Disrupción específica y contrahechizos'
        };

        return weaknesses[archetype] || 'Depende del build específico';
    }

    // Métodos de cache y estado (sin cambios significativos)...
    
    async loadCachedData() {
        try {
            const cached = localStorage.getItem(this.cacheKeys.metaData);
            
            if (cached) {
                this.currentMetaData = JSON.parse(cached);
                this.log('📁 Datos con cartas reales cargados desde cache');
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
            this.log('💾 Datos con cartas reales guardados en cache');
        } catch (error) {
            this.logError('Error guardando en cache:', error);
        }
    }

    needsUpdate() {
        if (!this.currentMetaData) return true;
        
        const lastUpdate = this.getLastUpdateTimestamp();
        const now = Date.now();
        const timeSinceUpdate = now - lastUpdate;

        return timeSinceUpdate >= this.config.maxCacheAge;
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
        this.log('🔄 Forzando actualización con cartas reales...');
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

    getDataSource() {
        if (!this.currentMetaData) return 'none';
        
        const source = this.currentMetaData.source || '';
        
        if (source.includes('Real-Cards')) return 'real-cards';
        if (source.includes('Fallback')) return 'fallback';
        
        return 'unknown';
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
            totalRealCards: this.currentMetaData?.totalRealCards || 0,
            status: status?.status || 'unknown',
            dataSource: this.getDataSource(),
            hasRealCards: this.hasRealCards(),
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
    getCurrentMetaData() {
        return this.currentMetaData;
    }

   

    log(message, data = null) {
        if (!this.debugMode) return;
        console.log(`🗄️ [DatabaseManager-Real] ${message}`, data || '');
    }

    logError(message, error = null) {
        console.error(`❌ [DatabaseManager-Real] ${message}`, error || '');
    }
}

export default DatabaseManager;