// src/infrastructure/data/MTGGoldfishCompleteScraper.js
// 🐟 Scraper COMPLETO de MTGGoldfish - Mazos + Listas de Cartas

class MTGGoldfishCompleteScraper {
    constructor() {
        this.baseUrl = 'https://www.mtggoldfish.com';
        this.metaUrl = '/metagame/standard#paper';
        this.maxDecks = 20; // Top 20 mazos del meta
        
        // CORS proxies
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://cors.bridged.cc/',
            'https://thingproxy.freeboard.io/fetch/'
        ];
        
        this.currentProxy = 0;
        this.debugMode = true;
        
        // Rate limiting para no sobrecargar MTGGoldfish
        this.rateLimitDelay = 2000; // 2 segundos entre requests
    }

    /**
     * 🚀 Método principal: scrapear mazos completos del meta
     */
    async scrapeCompleteMetaData() {
        try {
            this.log('🐟 Iniciando scraping COMPLETO de MTGGoldfish...');
            this.log(`🎯 Objetivo: Top ${this.maxDecks} mazos con listas completas`);

            // Paso 1: Obtener lista de mazos del meta
            const metaDecks = await this.scrapeMetaOverview();
            
            if (!metaDecks || metaDecks.length === 0) {
                throw new Error('No se pudieron obtener mazos del meta');
            }

            this.log(`📋 Encontrados ${metaDecks.length} mazos en el meta`);

            // Paso 2: Obtener listas completas de cada mazo
            const completeDecks = await this.scrapeCompleteDeckLists(metaDecks);

            // Paso 3: Construir datos finales
            const finalData = {
                lastUpdated: new Date().toISOString(),
                scrapedAt: new Date().toISOString(),
                format: 'standard',
                source: 'MTGGoldfish-Complete',
                sourceUrl: this.baseUrl + this.metaUrl,
                deckCount: completeDecks.length,
                decks: completeDecks
            };

            this.log(`✅ Scraping completo exitoso: ${completeDecks.length} mazos con listas`);
            return finalData;

        } catch (error) {
            this.logError('❌ Error en scraping completo:', error);
            throw error;
        }
    }

    /**
     * 📊 Paso 1: Scrapear overview del meta (nombres y porcentajes)
     */
    async scrapeMetaOverview() {
        try {
            this.log('📊 Scrapeando overview del meta...');
            
            const html = await this.fetchWithProxy(this.baseUrl + this.metaUrl);
            const decks = this.parseMetaDecks(html);
            
            return decks.slice(0, this.maxDecks); // Top 20

        } catch (error) {
            this.logError('Error scrapeando meta overview:', error);
            throw error;
        }
    }

    /**
     * 🃏 Paso 2: Scrapear listas completas de cada mazo
     */
    async scrapeCompleteDeckLists(metaDecks) {
        const completeDecks = [];
        
        this.log(`🃏 Scrapeando listas completas de ${metaDecks.length} mazos...`);
        
        for (let i = 0; i < metaDecks.length; i++) {
            const deck = metaDecks[i];
            
            try {
                this.log(`📋 Procesando ${i + 1}/${metaDecks.length}: ${deck.name}`);
                
                // Rate limiting para ser respetuosos con MTGGoldfish
                if (i > 0) {
                    await this.sleep(this.rateLimitDelay);
                }
                
                const completeDeck = await this.scrapeSingleDeckList(deck);
                completeDecks.push(completeDeck);
                
                this.log(`✅ ${deck.name}: ${completeDeck.totalCards} cartas extraídas`);

            } catch (error) {
                this.logError(`❌ Error scrapeando ${deck.name}:`, error.message);
                
                // Añadir mazo sin lista completa si falla
                completeDecks.push({
                    ...deck,
                    mainboard: [],
                    sideboard: [],
                    totalCards: 0,
                    scrapingError: error.message
                });
            }
        }
        
        return completeDecks;
    }

    /**
     * 📋 Scrapear lista individual de un mazo
     */
    async scrapeSingleDeckList(deck) {
        try {
            if (!deck.url) {
                throw new Error('No hay URL para este mazo');
            }
            
            const deckUrl = this.baseUrl + deck.url;
            this.log(`🔗 Scrapeando: ${deckUrl}`);
            
            const html = await this.fetchWithProxy(deckUrl);
            const deckList = this.parseDeckList(html);
            
            // Combinar datos del meta con lista completa
            const completeDeck = {
                ...deck,
                ...deckList,
                totalCards: (deckList.mainboard?.length || 0) + (deckList.sideboard?.length || 0),
                listScrapedAt: new Date().toISOString()
            };
            
            return completeDeck;

        } catch (error) {
            this.logError(`Error scrapeando lista de ${deck.name}:`, error);
            throw error;
        }
    }

    /**
     * 📄 Parsear mazos del meta (página principal)
     */
    parseMetaDecks(html) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const decks = [];
            
            // Buscar filas que contengan mazos
            const rows = doc.querySelectorAll('tr');
            
            for (const row of rows) {
                const archetypeLink = row.querySelector('a[href*="/archetype/standard"]');
                if (!archetypeLink) continue;
                
                const deckName = this.cleanText(archetypeLink.textContent);
                if (!deckName || deckName.length < 3) continue;
                
                // Buscar porcentaje en la fila
                const percentageMatch = row.textContent.match(/(\d+\.?\d*)\s*%/);
                if (!percentageMatch) continue;
                
                const metaShare = parseFloat(percentageMatch[1]);
                if (metaShare <= 0 || metaShare > 50) continue;
                
                // Filtrar nombres que parecen cartas individuales
                if (this.looksLikeCardName(deckName)) {
                    this.log(`🚫 Filtrado (parece carta): ${deckName}`);
                    continue;
                }
                
                decks.push({
                    id: this.generateDeckId(deckName),
                    name: deckName,
                    metaShare: metaShare,
                    rank: decks.length + 1,
                    url: archetypeLink.getAttribute('href'),
                    extractedAt: new Date().toISOString()
                });
                
                this.log(`📋 Mazo válido encontrado: ${deckName} (${metaShare}%)`);
            }
            
            if (decks.length === 0) {
                throw new Error('No se encontraron mazos válidos en el meta');
            }
            
            // Ordenar por meta share descendente
            decks.sort((a, b) => b.metaShare - a.metaShare);
            
            // Actualizar ranks después del ordenamiento
            decks.forEach((deck, index) => {
                deck.rank = index + 1;
            });
            
            return decks;

        } catch (error) {
            this.logError('Error parseando mazos del meta:', error);
            throw error;
        }
    }

    /**
     * 🃏 Parsear lista individual de cartas de un mazo
     */
    parseDeckList(html) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const deckList = {
                mainboard: [],
                sideboard: [],
                keyCards: []
            };
            
            // Buscar secciones de mainboard y sideboard
            const cardRows = doc.querySelectorAll('tr, .deck-card, .card-entry');
            
            let currentSection = 'mainboard';
            
            for (const row of cardRows) {
                // Detectar cambio de sección
                const sectionText = row.textContent.toLowerCase();
                if (sectionText.includes('sideboard')) {
                    currentSection = 'sideboard';
                    continue;
                }
                if (sectionText.includes('mainboard') || sectionText.includes('main deck')) {
                    currentSection = 'mainboard';
                    continue;
                }
                
                // Parsear carta individual
                const card = this.parseCardFromRow(row);
                if (card) {
                    deckList[currentSection].push(card);
                    
                    // Identificar cartas clave (3+ copias, no tierras básicas)
                    if (card.quantity >= 3 && !this.isBasicLand(card.name)) {
                        deckList.keyCards.push({
                            name: card.name,
                            quantity: card.quantity,
                            role: this.inferCardRole(card.name)
                        });
                    }
                }
            }
            
            this.log(`📊 Lista parseada: ${deckList.mainboard.length} main, ${deckList.sideboard.length} side`);
            
            return deckList;

        } catch (error) {
            this.logError('Error parseando lista de cartas:', error);
            throw error;
        }
    }

    /**
     * 🃏 Parsear carta individual de una fila
     */
    parseCardFromRow(row) {
        try {
            const text = row.textContent.trim();
            
            // Buscar patrón "4x Card Name" o "4 Card Name"
            const cardMatch = text.match(/^(\d+)\s*x?\s+(.+)$/);
            if (!cardMatch) return null;
            
            const quantity = parseInt(cardMatch[1]);
            const cardName = this.cleanText(cardMatch[2]);
            
            if (!cardName || quantity <= 0 || quantity > 4) return null;
            
            return {
                name: cardName,
                quantity: quantity,
                extractedAt: new Date().toISOString()
            };

        } catch (error) {
            return null;
        }
    }

    /**
     * 🌐 Fetch con proxy y retry
     */
    async fetchWithProxy(url) {
        for (let attempt = 0; attempt < this.corsProxies.length; attempt++) {
            const proxyIndex = (this.currentProxy + attempt) % this.corsProxies.length;
            const proxy = this.corsProxies[proxyIndex];
            
            try {
                const proxyUrl = proxy + encodeURIComponent(url);
                
                const response = await fetch(proxyUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                        'Accept': 'text/html,application/xhtml+xml',
                        'Cache-Control': 'no-cache'
                    },
                    timeout: 15000
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const html = await response.text();
                
                if (html.length < 1000) {
                    throw new Error('Respuesta demasiado corta');
                }
                
                // Marcar proxy como funcional
                this.currentProxy = proxyIndex;
                
                return html;

            } catch (error) {
                this.log(`⚠️ Proxy ${proxyIndex + 1} falló: ${error.message}`);
                continue;
            }
        }
        
        throw new Error('Todos los proxies fallaron');
    }

    /**
     * 🔧 Utilidades
     */
    looksLikeCardName(name) {
        // Filtrar nombres que parecen cartas individuales
        const cardIndicators = [
            /^[A-Z][a-z]+['']?s\s+[A-Z]/,  // "Agatha's Soul"
            /,\s+[A-Z]/,                   // "Kaito, Bane of Nightmares"
            /\bof\s+[A-Z]/,               // "Soul of [Something]"
            /\bthe\s+[A-Z]/,              // "Herald the [Something]"
        ];
        
        return cardIndicators.some(pattern => pattern.test(name));
    }

    inferCardRole(cardName) {
        const name = cardName.toLowerCase();
        
        // Inferir rol básico de la carta
        if (name.includes('bolt') || name.includes('push') || name.includes('shock')) return 'removal';
        if (name.includes('teferi') || name.includes('jace') || name.includes('liliana')) return 'planeswalker';
        if (name.includes('counterspell') || name.includes('negate')) return 'counter';
        if (name.includes('mountain') || name.includes('island') || name.includes('plains') || 
            name.includes('swamp') || name.includes('forest')) return 'land';
        
        return 'spell'; // Default
    }

    isBasicLand(cardName) {
        const basics = ['Mountain', 'Island', 'Swamp', 'Forest', 'Plains'];
        return basics.some(basic => cardName.includes(basic));
    }

    cleanText(text) {
        if (!text) return '';
        
        return text.trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\-'.,]/g, '')
            .trim();
    }

    generateDeckId(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(message, data = null) {
        if (!this.debugMode) return;
        console.log(`🐟 [CompleteScraper] ${message}`, data || '');
    }

    logError(message, error = null) {
        console.error(`❌ [CompleteScraper] ${message}`, error || '');
    }
}

export default MTGGoldfishCompleteScraper;