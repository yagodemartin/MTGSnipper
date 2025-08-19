// src/infrastructure/data/MTGGoldfishScraper.js
// 🐟 Scraper automático de MTGGoldfish con actualización diaria

class MTGGoldfishScraper {
    constructor() {
        this.baseUrl = 'https://www.mtggoldfish.com';
        this.metaUrl = '/metagame/standard#paper';
        this.updateInterval = 24 * 60 * 60 * 1000; // 24 horas en ms
        this.maxDecks = 20; // Top 20 mazos
        this.cache = new Map();
        this.lastUpdate = null;
        
        // Configuración del scraper
        this.config = {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            timeout: 10000,
            retries: 3,
            rateLimit: 1000 // 1 segundo entre requests
        };

        this.debugMode = true;
    }

    /**
     * 🚀 Método principal: actualizar base de datos si es necesario
     */
    async updateIfNeeded() {
        try {
            this.log('🔍 Verificando si necesita actualización...');

            const lastUpdate = this.getLastUpdateTimestamp();
            const now = Date.now();
            const timeSinceUpdate = now - lastUpdate;

            if (timeSinceUpdate < this.updateInterval) {
                const hoursRemaining = Math.ceil((this.updateInterval - timeSinceUpdate) / (1000 * 60 * 60));
                this.log(`⏰ Actualización reciente. Próxima en ${hoursRemaining}h`);
                return this.loadCachedData();
            }

            this.log('🔄 Iniciando actualización automática...');
            return await this.performFullUpdate();

        } catch (error) {
            this.logError('❌ Error en updateIfNeeded:', error);
            // Fallback a datos cached si hay error
            return this.loadCachedData();
        }
    }

    /**
     * 🔄 Realizar actualización completa
     */
    async performFullUpdate() {
        try {
            this.log('📊 Scrapeando meta de MTGGoldfish...');

            // Paso 1: Obtener lista de mazos del meta
            const metaDecks = await this.scrapeMetaOverview();
            
            if (!metaDecks || metaDecks.length === 0) {
                throw new Error('No se pudieron obtener mazos del meta');
            }

            this.log(`📋 Encontrados ${metaDecks.length} mazos en el meta`);

            // Paso 2: Obtener detalles de cada mazo (top 20)
            const detailedDecks = await this.scrapeDetailedDecks(metaDecks.slice(0, this.maxDecks));

            // Paso 3: Normalizar y guardar datos
            const normalizedData = this.normalizeMetaData(detailedDecks);
            await this.saveToCache(normalizedData);

            this.lastUpdate = Date.now();
            this.saveLastUpdateTimestamp(this.lastUpdate);

            this.log(`✅ Actualización completada: ${normalizedData.decks.length} mazos actualizados`);
            return normalizedData;

        } catch (error) {
            this.logError('❌ Error en actualización completa:', error);
            throw error;
        }
    }

    /**
     * 📊 Scrapear overview del meta (lista principal)
     */
    async scrapeMetaOverview() {
        try {
            // Para desarrollo en cliente, usar proxy/CORS proxy
            const proxyUrl = this.getProxyUrl();
            const url = `${proxyUrl}${this.baseUrl}${this.metaUrl}`;

            const response = await this.fetchWithRetry(url);
            const html = await response.text();

            return this.parseMetaOverview(html);

        } catch (error) {
            this.logError('Error scrapeando meta overview:', error);
            
            // Fallback: datos simulados para desarrollo
            if (this.debugMode) {
                this.log('🔧 Usando datos simulados para desarrollo');
                return this.getMockMetaData();
            }
            
            throw error;
        }
    }

    /**
     * 🔍 Parsear HTML del meta overview
     */
    parseMetaOverview(html) {
        try {
            // Crear DOM parser
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const decks = [];
            
            // Buscar tabla de meta (selector puede cambiar)
            const metaTable = doc.querySelector('.metagame-table, .deck-table, table');
            
            if (!metaTable) {
                this.log('⚠️ No se encontró tabla de meta, usando selectores alternativos');
                return this.parseAlternativeSelectors(doc);
            }

            const rows = metaTable.querySelectorAll('tr');
            
            rows.forEach((row, index) => {
                if (index === 0) return; // Skip header

                const cells = row.querySelectorAll('td');
                if (cells.length < 3) return;

                const deckName = this.extractDeckName(cells[0]);
                const metaShare = this.extractMetaShare(cells[1]);
                const deckUrl = this.extractDeckUrl(cells[0]);

                if (deckName && metaShare && deckUrl) {
                    decks.push({
                        name: deckName,
                        metaShare: metaShare,
                        url: deckUrl,
                        rank: decks.length + 1
                    });
                }
            });

            return decks;

        } catch (error) {
            this.logError('Error parseando meta overview:', error);
            return [];
        }
    }

    /**
     * 📋 Scrapear detalles de mazos individuales
     */
    async scrapeDetailedDecks(metaDecks) {
        const detailedDecks = [];

        for (let i = 0; i < metaDecks.length; i++) {
            const metaDeck = metaDecks[i];
            
            try {
                this.log(`📋 Scrapeando detalles ${i + 1}/${metaDecks.length}: ${metaDeck.name}`);

                // Rate limiting
                if (i > 0) {
                    await this.sleep(this.config.rateLimit);
                }

                const deckDetails = await this.scrapeDeckDetails(metaDeck);
                detailedDecks.push(deckDetails);

            } catch (error) {
                this.logError(`Error scrapeando ${metaDeck.name}:`, error);
                
                // Agregar datos básicos aunque falle el detalle
                detailedDecks.push({
                    ...metaDeck,
                    mainboard: [],
                    keyCards: [],
                    colors: []
                });
            }
        }

        return detailedDecks;
    }

    /**
     * 🎴 Scrapear detalles de un mazo específico
     */
    async scrapeDeckDetails(metaDeck) {
        try {
            const proxyUrl = this.getProxyUrl();
            const url = `${proxyUrl}${this.baseUrl}${metaDeck.url}`;

            const response = await this.fetchWithRetry(url);
            const html = await response.text();

            return this.parseDeckDetails(html, metaDeck);

        } catch (error) {
            this.logError(`Error obteniendo detalles de ${metaDeck.name}:`, error);
            throw error;
        }
    }

    /**
     * 🃏 Parsear detalles de mazo desde HTML
     */
    parseDeckDetails(html, metaDeck) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Parsear mainboard
            const mainboard = this.parseMainboard(doc);
            
            // Parsear sideboard
            const sideboard = this.parseSideboard(doc);
            
            // Extraer colores
            const colors = this.extractColors(mainboard);
            
            // Identificar cartas clave
            const keyCards = this.identifyKeyCards(mainboard);

            return {
                ...metaDeck,
                mainboard,
                sideboard,
                colors,
                keyCards,
                cardCount: mainboard.reduce((sum, card) => sum + card.quantity, 0),
                lastUpdated: new Date().toISOString()
            };

        } catch (error) {
            this.logError('Error parseando detalles del mazo:', error);
            throw error;
        }
    }

    /**
     * 📋 Parsear mainboard del mazo
     */
    parseMainboard(doc) {
        const mainboard = [];
        
        // Múltiples selectores posibles para la lista del mazo
        const selectors = [
            '.deck-view-decklist .deck-view-decklist-table tr',
            '.decklist-mainboard tr',
            '.deck-col .deck-category tr'
        ];

        for (const selector of selectors) {
            const rows = doc.querySelectorAll(selector);
            
            if (rows.length > 0) {
                rows.forEach(row => {
                    const cardData = this.parseCardRow(row);
                    if (cardData) {
                        mainboard.push(cardData);
                    }
                });
                break; // Usar el primer selector que funcione
            }
        }

        return mainboard;
    }

    /**
     * 🃏 Parsear fila de carta individual
     */
    parseCardRow(row) {
        try {
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) return null;

            const quantityText = cells[0]?.textContent?.trim();
            const nameElement = cells[1]?.querySelector('a') || cells[1];
            const nameText = nameElement?.textContent?.trim();

            if (!quantityText || !nameText) return null;

            const quantity = parseInt(quantityText) || 1;
            const name = this.normalizeCardName(nameText);

            return {
                name,
                quantity,
                type: this.inferCardType(name),
                manaCost: this.inferManaCost(name) // Se podría mejorar con API
            };

        } catch (error) {
            return null;
        }
    }

    /**
     * 🎨 Extraer colores del mazo
     */
    extractColors(mainboard) {
        const colors = new Set();
        
        // Lógica básica para detectar colores por nombres de cartas
        // Se podría mejorar con base de datos de cartas
        
        mainboard.forEach(card => {
            const cardColors = this.inferCardColors(card.name);
            cardColors.forEach(color => colors.add(color));
        });

        return Array.from(colors);
    }

    /**
     * 🔑 Identificar cartas clave del mazo
     */
    identifyKeyCards(mainboard) {
        return mainboard
            .filter(card => {
                // Cartas con 3+ copias son probablemente importantes
                return card.quantity >= 3 && 
                       !this.isBasicLand(card.name) &&
                       !this.isCommonUtility(card.name);
            })
            .map(card => ({
                name: card.name,
                weight: this.calculateCardWeight(card),
                role: this.inferCardRole(card.name)
            }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 8); // Top 8 cartas clave
    }

    /**
     * 🔧 Normalizar datos del meta
     */
    normalizeMetaData(detailedDecks) {
        return {
            lastUpdated: new Date().toISOString(),
            format: 'standard',
            source: 'MTGGoldfish',
            updateInterval: this.updateInterval,
            deckCount: detailedDecks.length,
            
            decks: detailedDecks.map(deck => ({
                id: this.generateDeckId(deck.name),
                name: deck.name,
                metaShare: deck.metaShare,
                rank: deck.rank,
                colors: deck.colors,
                mainboard: deck.mainboard,
                sideboard: deck.sideboard || [],
                keyCards: deck.keyCards,
                archetype: this.classifyArchetype(deck),
                lastUpdated: deck.lastUpdated
            }))
        };
    }

    /**
     * 🔧 Métodos auxiliares
     */
    getProxyUrl() {
        // Para desarrollo, usar CORS proxy público
        // En producción, usar tu propio backend
        return 'https://api.allorigins.win/raw?url=';
    }

    async fetchWithRetry(url, retries = this.config.retries) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': this.config.userAgent
                    },
                    timeout: this.config.timeout
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return response;

            } catch (error) {
                this.logError(`Intento ${i + 1}/${retries} falló:`, error);
                
                if (i === retries - 1) throw error;
                
                // Backoff exponencial
                await this.sleep(Math.pow(2, i) * 1000);
            }
        }
    }

    generateDeckId(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .trim();
    }

    normalizeCardName(name) {
        return name.trim()
            .replace(/\s+/g, ' ')
            .replace(/[""]/g, '"'); // Normalizar comillas
    }

    calculateCardWeight(card) {
        // Peso basado en cantidad y tipo estimado
        let weight = card.quantity * 10;
        
        if (this.isLegendary(card.name)) weight += 20;
        if (this.isPlaneswalker(card.name)) weight += 15;
        if (this.isRare(card.name)) weight += 10;
        
        return weight;
    }

    // Métodos de inferencia (mejorar con base de datos real)
    inferCardType(name) {
        if (this.isBasicLand(name)) return 'Land';
        if (this.isPlaneswalker(name)) return 'Planeswalker';
        return 'Unknown'; // Se mejoraría con Scryfall API
    }

    inferCardColors(name) {
        // Lógica básica, se mejoraría con base de datos
        if (name.includes('Mountain') || name.includes('Red')) return ['R'];
        if (name.includes('Island') || name.includes('Blue')) return ['U'];
        if (name.includes('Swamp') || name.includes('Black')) return ['B'];
        if (name.includes('Forest') || name.includes('Green')) return ['G'];
        if (name.includes('Plains') || name.includes('White')) return ['W'];
        return [];
    }

    isBasicLand(name) {
        const basics = ['Mountain', 'Island', 'Swamp', 'Forest', 'Plains'];
        return basics.some(basic => name.includes(basic));
    }

    isPlaneswalker(name) {
        return name.includes('Teferi') || name.includes('Jace') || 
               name.includes('Chandra') || name.includes('Liliana');
    }

    isLegendary(name) {
        // Heurística básica
        return name.includes(',') || this.isPlaneswalker(name);
    }

    classifyArchetype(deck) {
        const colors = deck.colors?.length || 0;
        const avgCMC = this.calculateAverageCMC(deck.mainboard);
        
        if (colors === 1 && avgCMC < 2.5) return 'aggro';
        if (colors >= 3) return 'midrange';
        if (avgCMC > 4) return 'control';
        return 'midrange';
    }

    calculateAverageCMC(mainboard) {
        // Estimación básica del CMC promedio
        const totalCMC = mainboard.reduce((sum, card) => {
            const estimatedCMC = this.estimateCMC(card.name);
            return sum + (estimatedCMC * card.quantity);
        }, 0);
        
        const totalCards = mainboard.reduce((sum, card) => sum + card.quantity, 0);
        return totalCards > 0 ? totalCMC / totalCards : 0;
    }

    estimateCMC(name) {
        // Heurística muy básica
        if (this.isBasicLand(name)) return 0;
        if (name.length < 10) return 1;
        if (name.length < 15) return 2;
        if (name.length < 20) return 3;
        return 4;
    }

    // Datos mock para desarrollo
    getMockMetaData() {
        return [
            { name: 'Domain Ramp', metaShare: 18.2, url: '/archetype/standard-domain-ramp', rank: 1 },
            { name: 'Mono Red Aggro', metaShare: 15.8, url: '/archetype/standard-mono-red-aggro', rank: 2 },
            { name: 'Golgari Midrange', metaShare: 12.4, url: '/archetype/standard-golgari-midrange', rank: 3 }
        ];
    }

    // Cache y persistencia
    async saveToCache(data) {
        try {
            const cacheKey = 'mtgArenaSniffer_metaData';
            localStorage.setItem(cacheKey, JSON.stringify(data));
            this.log('💾 Datos guardados en cache local');
        } catch (error) {
            this.logError('Error guardando en cache:', error);
        }
    }

    loadCachedData() {
        try {
            const cacheKey = 'mtgArenaSniffer_metaData';
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                const data = JSON.parse(cached);
                this.log('📁 Datos cargados desde cache');
                return data;
            }
            
            return null;
        } catch (error) {
            this.logError('Error cargando cache:', error);
            return null;
        }
    }

    getLastUpdateTimestamp() {
        try {
            const timestamp = localStorage.getItem('mtgArenaSniffer_lastUpdate');
            return timestamp ? parseInt(timestamp) : 0;
        } catch {
            return 0;
        }
    }

    saveLastUpdateTimestamp(timestamp) {
        try {
            localStorage.setItem('mtgArenaSniffer_lastUpdate', timestamp.toString());
        } catch (error) {
            this.logError('Error guardando timestamp:', error);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(message, data = null) {
        if (!this.debugMode) return;
        console.log(`🐟 [MTGGoldfishScraper] ${message}`, data || '');
    }

    logError(message, error = null) {
        console.error(`❌ [MTGGoldfishScraper] ${message}`, error || '');
    }
}

export default MTGGoldfishScraper;