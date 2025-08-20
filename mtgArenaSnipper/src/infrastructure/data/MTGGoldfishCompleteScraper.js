// src/infrastructure/data/MTGGoldfishCompleteScraper.js
// 🐟 Scraper COMPLETO con todas las cartas e imágenes

class MTGGoldfishCompleteScraper {
    constructor() {
        this.baseUrl = 'https://www.mtggoldfish.com';
        this.metaUrl = '/metagame/standard#paper';
        
       this.corsProxies = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
];
        
    // POR:
    this.rateLimitDelay = 3000;
    this.timeout = 15000;
    this.maxDecks = 5;
        this.debugMode = true;
        
        // Cache de imágenes
        this.imageCache = this.loadImageCache();
        this.workingProxies = [];
        
        // URLs de Scryfall para imágenes
        this.scryfallSearchUrl = 'https://api.scryfall.com/cards/named?exact=';
    }

async scrapeCompleteMetaData() {
    try {
        this.log('🐟 Scraping BÁSICO de MTGGoldfish...');
        
        const metaDecks = await this.scrapeMetaOverview();
        
        if (!metaDecks || metaDecks.length === 0) {
            throw new Error('No se pudieron obtener arquetipos');
        }
        
        this.log(`📋 Encontrados ${metaDecks.length} arquetipos`);
        
        const finalData = {
            lastUpdated: new Date().toISOString(),
            format: 'standard',
            source: 'MTGGoldfish-Basic',
            deckCount: metaDecks.length,
            decks: metaDecks
        };
        
        this.log(`✅ Scraping básico exitoso: ${metaDecks.length} mazos`);
        return finalData;
    } catch (error) {
        this.logError('❌ Error en scraping:', error);
        throw error;
    }
}

    /**
     * 🧪 Probar proxies rápidamente
     */
    async testProxies() {
        this.log('🧪 Probando proxies...');
        
        for (const proxy of this.corsProxies) {
            try {
                const testResult = await this.testSingleProxy(proxy, 'https://httpbin.org/json');
                if (testResult.success) {
                    this.workingProxies.push(proxy);
                    this.log(`✅ ${proxy.name}: OK`);
                } else {
                    this.log(`❌ ${proxy.name}: ${testResult.error}`);
                }
            } catch (error) {
                this.log(`❌ ${proxy.name}: ${error.message}`);
            }
        }
        
        if (this.workingProxies.length === 0) {
            throw new Error('No hay proxies funcionales');
        }
        
        this.log(`📡 ${this.workingProxies.length} proxies funcionando`);
    }

    /**
     * 📊 Scrapear overview del meta
     */
    async scrapeMetaOverview() {
        this.log('📊 Scrapeando página principal del meta...');
        
        const html = await this.fetchWithProxy(this.baseUrl + this.metaUrl);
        const archetyperUrls = this.extractArchetypeUrls(html);
        
        return archetyperUrls.slice(0, this.maxDecks);
    }

    /**
     * 🃏 Scrapear cartas completas de todos los mazos
     */
    async scrapeAllDeckListsWithImages(metaDecks) {
        const completeDecks = [];
        
        this.log(`🃏 Scrapeando cartas de ${metaDecks.length} mazos...`);
        
        for (let i = 0; i < metaDecks.length; i++) {
            const deck = metaDecks[i];
            
            try {
                this.log(`📋 [${i + 1}/${metaDecks.length}] Procesando: ${deck.name}`);
                
                // Rate limiting
                if (i > 0) {
                    this.log(`⏳ Esperando ${this.rateLimitDelay/1000}s...`);
                    await this.sleep(this.rateLimitDelay);
                }
                
                const completeDeck = await this.scrapeSingleDeckWithImages(deck);
                completeDecks.push(completeDeck);
                
                this.log(`✅ ${deck.name}: ${completeDeck.totalCards || 0} cartas extraídas`);

            } catch (error) {
                this.logError(`❌ Error en ${deck.name}:`, error.message);
                
                // Añadir mazo básico si falla
                completeDecks.push({
                    ...deck,
                    mainboard: [],
                    sideboard: [],
                    keyCards: [],
                    totalCards: 0,
                    deckImage: null,
                    scrapingError: error.message
                });
            }
        }
        
        return completeDecks;
    }

    /**
     * 📋 Scrapear un mazo individual con todas sus cartas e imágenes
     */
    async scrapeSingleDeckWithImages(deck) {
        try {
            const deckUrl = this.baseUrl + deck.url;
            this.log(`🔗 Scrapeando: ${deckUrl}`);
            
            // 1. Obtener HTML de la página del mazo
            const html = await this.fetchWithProxy(deckUrl);
            
            // 2. Parsear cartas del mazo
            const deckList = this.parseArchetypePage(html);
            
            // 3. Obtener imagen del mazo desde MTGGoldfish
            const deckImage = this.extractDeckImage(html, deckUrl);
            
            // 4. Obtener imágenes de las cartas principales
            const enrichedMainboard = await this.enrichCardsWithImages(deckList.mainboard || []);
            const enrichedSideboard = await this.enrichCardsWithImages(deckList.sideboard || []);
            
            // 5. Combinar todo
            const completeDeck = {
                ...deck,
                mainboard: enrichedMainboard,
                sideboard: enrichedSideboard,
                keyCards: this.identifyKeyCards(enrichedMainboard),
                totalCards: enrichedMainboard.length + enrichedSideboard.length,
                deckImage: deckImage,
                colors: this.inferColorsFromCards(enrichedMainboard),
                archetype: this.inferArchetypeFromCards(enrichedMainboard),
                strategy: this.inferStrategy(deck.name),
                weakness: this.inferWeakness(deck.name),
                listScrapedAt: new Date().toISOString()
            };
            
            return completeDeck;

        } catch (error) {
            this.logError(`Error scrapeando ${deck.name}:`, error);
            throw error;
        }
    }

    /**
     * 📄 Parsear página de arquetipo para extraer listas de cartas
     */
    parseArchetypePage(html) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const deckList = {
                mainboard: [],
                sideboard: []
            };
            
            // Buscar tablas de cartas
            const cardTables = doc.querySelectorAll('table.deck-view-deck-table, table');
            
            for (const table of cardTables) {
                const tableContext = this.getTableContext(table);
                const cards = this.parseCardTable(table);
                
                if (cards.length > 0) {
                    if (tableContext.includes('sideboard') || tableContext.includes('side')) {
                        deckList.sideboard.push(...cards);
                        this.log(`  📦 Sideboard: ${cards.length} cartas`);
                    } else {
                        deckList.mainboard.push(...cards);
                        this.log(`  🃏 Mainboard: ${cards.length} cartas`);
                    }
                }
            }
            
            // Si no encontramos en tablas, buscar en otros elementos
            if (deckList.mainboard.length === 0) {
                this.log('  🔍 Buscando cartas en formato alternativo...');
                const alternativeCards = this.parseAlternativeCardFormat(doc);
                deckList.mainboard.push(...alternativeCards);
            }
            
            return deckList;

        } catch (error) {
            this.logError('Error parseando página de arquetipo:', error);
            return { mainboard: [], sideboard: [] };
        }
    }

    /**
     * 📋 Parsear tabla de cartas
     */
    parseCardTable(table) {
        const cards = [];
        const rows = table.querySelectorAll('tr');
        
        for (const row of rows) {
            const card = this.parseCardRow(row);
            if (card) {
                cards.push(card);
            }
        }
        
        return cards;
    }

    /**
     * 🃏 Parsear fila de carta individual
     */
    parseCardRow(row) {
        try {
            const cells = row.querySelectorAll('td, th');
            
            if (cells.length >= 2) {
                const quantityText = cells[0].textContent.trim();
                const nameElement = cells[1];
                
                // Extraer cantidad
                const quantity = parseInt(quantityText);
                if (isNaN(quantity) || quantity <= 0 || quantity > 4) {
                    return null;
                }
                
                // Extraer nombre (puede estar en un enlace)
                const nameLink = nameElement.querySelector('a');
                let cardName = nameLink ? nameLink.textContent : nameElement.textContent;
                cardName = this.cleanCardName(cardName);
                
                if (!cardName || cardName.length < 2) {
                    return null;
                }
                
                return {
                    name: cardName,
                    quantity: quantity,
                    extractedAt: new Date().toISOString()
                };
            }
            
            // Fallback: patrón de texto
            const rowText = row.textContent.trim();
            const cardPattern = /^(\d+)\s*x?\s+(.+)$/;
            const match = rowText.match(cardPattern);
            
            if (match) {
                const quantity = parseInt(match[1]);
                const cardName = this.cleanCardName(match[2]);
                
                if (cardName && quantity > 0 && quantity <= 4) {
                    return {
                        name: cardName,
                        quantity: quantity,
                        extractedAt: new Date().toISOString()
                    };
                }
            }
            
            return null;

        } catch (error) {
            return null;
        }
    }

    /**
     * 🧹 Limpiar nombre de carta
     */
    cleanCardName(cardName) {
        if (!cardName) return '';
        
        // Remover precios, sets, números de coleccionista
        cardName = cardName.replace(/\$\d+\.?\d*/g, '');
        cardName = cardName.replace(/\([A-Z0-9]+\)/g, '');
        cardName = cardName.replace(/#\d+/g, '');
        cardName = cardName.replace(/\s+/g, ' ').trim();
        
        // Fix para nombres duplicados como "Izzet Cauldron Izzet Cauldron"
        const words = cardName.split(' ');
        const uniqueWords = [];
        let lastWord = '';
        
        for (const word of words) {
            if (word !== lastWord) {
                uniqueWords.push(word);
                lastWord = word;
            }
        }
        
        return uniqueWords.join(' ');
    }

    /**
     * 🖼️ Enriquecer cartas con imágenes
     */
    async enrichCardsWithImages(cards) {
        const enrichedCards = [];
        
        // Solo obtener imágenes de las primeras 10 cartas para no sobrecargar
        const cardsToEnrich = cards.slice(0, 10);
        
        for (const card of cardsToEnrich) {
            const enrichedCard = {
                ...card,
                imageUrl: await this.getCardImageUrl(card.name)
            };
            enrichedCards.push(enrichedCard);
            
            // Pequeño delay entre requests de imágenes
            await this.sleep(200);
        }
        
        // Añadir el resto sin imágenes
        const remainingCards = cards.slice(10).map(card => ({
            ...card,
            imageUrl: null
        }));
        
        return [...enrichedCards, ...remainingCards];
    }

    /**
     * 🖼️ Obtener URL de imagen de carta (con cache)
     */
    async getCardImageUrl(cardName) {
        try {
            // Verificar cache primero
            if (this.imageCache[cardName]) {
                return this.imageCache[cardName];
            }
            
            // Obtener desde Scryfall API
            const response = await fetch(this.scryfallSearchUrl + encodeURIComponent(cardName));
            
            if (response.ok) {
                const cardData = await response.json();
                const imageUrl = cardData.image_uris?.normal || cardData.image_uris?.large;
                
                if (imageUrl) {
                    this.imageCache[cardName] = imageUrl;
                    return imageUrl;
                }
            }
            
            // Fallback: imagen placeholder
            const placeholderUrl = `https://via.placeholder.com/200x280/333333/ffffff?text=${encodeURIComponent(cardName)}`;
            this.imageCache[cardName] = placeholderUrl;
            return placeholderUrl;
            
        } catch (error) {
            this.log(`⚠️ Error obteniendo imagen para ${cardName}: ${error.message}`);
            const placeholderUrl = `https://via.placeholder.com/200x280/333333/ffffff?text=${encodeURIComponent(cardName)}`;
            this.imageCache[cardName] = placeholderUrl;
            return placeholderUrl;
        }
    }

    /**
     * 🖼️ Extraer imagen del mazo desde MTGGoldfish
     */
    extractDeckImage(html, deckUrl) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Buscar imagen del arquetipo
            const metaImages = doc.querySelectorAll('img[src*="archetype"], img[src*="deck"], img[alt*="archetype"]');
            
            for (const img of metaImages) {
                const src = img.getAttribute('src');
                if (src && src.includes('http')) {
                    return src;
                } else if (src) {
                    return this.baseUrl + src;
                }
            }
            
            // Fallback: imagen de MTGGoldfish genérica
            return `https://www.mtggoldfish.com/images/logos/mtggoldfish.png`;
            
        } catch (error) {
            this.log(`⚠️ Error extrayendo imagen del mazo: ${error.message}`);
            return null;
        }
    }

    /**
     * 🎨 Inferir colores desde cartas
     */
    inferColorsFromCards(cards) {
        const colors = new Set();
        
        for (const card of cards) {
            const name = card.name.toLowerCase();
            
            // Tierras básicas
            if (name.includes('mountain')) colors.add('R');
            if (name.includes('island')) colors.add('U');
            if (name.includes('swamp')) colors.add('B');
            if (name.includes('forest')) colors.add('G');
            if (name.includes('plains')) colors.add('W');
            
            // Patrones comunes de nombres
            if (name.includes('red') || name.includes('fire') || name.includes('burn')) colors.add('R');
            if (name.includes('blue') || name.includes('counter') || name.includes('draw')) colors.add('U');
            if (name.includes('black') || name.includes('death') || name.includes('destroy')) colors.add('B');
            if (name.includes('green') || name.includes('growth') || name.includes('elf')) colors.add('G');
            if (name.includes('white') || name.includes('angel') || name.includes('heal')) colors.add('W');
        }
        
        return Array.from(colors);
    }

    // Métodos auxiliares (extractArchetypeUrls, fetchWithProxy, etc.) permanecen igual...
    
    /**
     * 🔗 Extraer URLs de arquetipos
     */
    extractArchetypeUrls(html) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const archetyperData = [];
            const archetypeLinks = doc.querySelectorAll('a[href*="/archetype/standard"]');
            
            this.log(`🔍 Encontrados ${archetypeLinks.length} enlaces de arquetipos`);
            
            for (const link of archetypeLinks) {
                const href = link.getAttribute('href');
                const deckName = this.cleanText(link.textContent);
                
                if (!deckName || deckName.length < 3 || !href) continue;
                
                const percentage = this.findPercentageInContext(link);
                
                if (percentage && percentage > 0 && percentage <= 50) {
                    archetyperData.push({
                        id: this.generateDeckId(deckName),
                        name: deckName,
                        metaShare: percentage,
                        url: href,
                        extractedAt: new Date().toISOString()
                    });
                }
            }
            
            const uniqueArchetypes = archetyperData.filter((deck, index, self) => 
                index === self.findIndex(d => d.url === deck.url)
            );
            
            uniqueArchetypes.sort((a, b) => b.metaShare - a.metaShare);
            uniqueArchetypes.forEach((deck, index) => {
                deck.rank = index + 1;
            });
            
            return uniqueArchetypes;

        } catch (error) {
            this.logError('Error extrayendo URLs:', error);
            return [];
        }
    }

    /**
     * 🌐 Fetch con proxy
     */
    async fetchWithProxy(url) {
        for (const proxy of this.workingProxies) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                
                const proxyUrl = proxy.url + encodeURIComponent(url);
                
                const response = await fetch(proxyUrl, {
                    method: proxy.method,
                    headers: this.getOptimalHeaders(),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                let html;
                if (proxy.parseJSON) {
                    const json = await response.json();
                    html = json.contents || json.data || json.body || '';
                } else {
                    html = await response.text();
                }

                if (html && html.length > 500) {
                    return html;
                }
                
                throw new Error('Respuesta muy corta');

            } catch (error) {
                this.log(`⚠️ ${proxy.name} falló: ${error.message}`);
                continue;
            }
        }
        
        throw new Error('Todos los proxies fallaron');
    }

    // Cache de imágenes
    loadImageCache() {
        try {
            const cached = localStorage.getItem('mtg_image_cache');
            return cached ? JSON.parse(cached) : {};
        } catch {
            return {};
        }
    }

    saveImageCache() {
        try {
            localStorage.setItem('mtg_image_cache', JSON.stringify(this.imageCache));
        } catch (error) {
            this.log('⚠️ Error guardando cache de imágenes');
        }
    }

    // Resto de métodos auxiliares...
    async testSingleProxy(proxy, testUrl) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const proxyUrl = proxy.url + encodeURIComponent(testUrl);
            const response = await fetch(proxyUrl, {
                method: proxy.method,
                headers: this.getOptimalHeaders(),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}` };
            }

            let data;
            if (proxy.parseJSON) {
                const json = await response.json();
                data = json.contents || json.data || json.body;
            } else {
                data = await response.text();
            }

            return { success: !!data && data.length > 10 };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getOptimalHeaders() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };
    }

    findPercentageInContext(linkElement) {
        let parent = linkElement.parentElement;
        let attempts = 0;
        
        while (parent && attempts < 5) {
            const text = parent.textContent;
            const percentageMatch = text.match(/(\d+\.?\d*)\s*%/);
            
            if (percentageMatch) {
                const percentage = parseFloat(percentageMatch[1]);
                if (percentage > 0 && percentage <= 50) {
                    return percentage;
                }
            }
            
            parent = parent.parentElement;
            attempts++;
        }
        
        return null;
    }

    getTableContext(table) {
        let element = table.previousElementSibling;
        let context = '';
        let attempts = 0;
        
        while (element && attempts < 5) {
            context += element.textContent.toLowerCase() + ' ';
            element = element.previousElementSibling;
            attempts++;
        }
        
        if (table.parentElement) {
            context += table.parentElement.textContent.toLowerCase();
        }
        
        return context;
    }

    parseAlternativeCardFormat(doc) {
        const cards = [];
        const cardElements = doc.querySelectorAll('.deck-card, .card-entry, .decklist-card, [class*="card"]');
        
        for (const element of cardElements) {
            const card = this.parseCardRow(element);
            if (card) {
                cards.push(card);
            }
        }
        
        return cards;
    }

    identifyKeyCards(mainboard) {
        return mainboard
            .filter(card => card.quantity >= 3)
            .map(card => ({
                name: card.name,
                quantity: card.quantity,
                weight: card.quantity * 25,
                role: 'key'
            }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 8);
    }

    inferArchetypeFromCards(cards) {
        if (!cards || cards.length === 0) return 'midrange';
        
        let aggro = 0;
        let control = 0;
        
        for (const card of cards) {
            const name = card.name.toLowerCase();
            if (name.includes('bolt') || name.includes('burn') || name.includes('aggressive')) {
                aggro += card.quantity || 1;
            }
            if (name.includes('counter') || name.includes('control') || name.includes('wrath')) {
                control += card.quantity || 1;
            }
        }
        
        if (aggro > control + 2) return 'aggro';
        if (control > aggro + 2) return 'control';
        return 'midrange';
    }

    inferStrategy(deckName) {
        const name = deckName.toLowerCase();
        if (name.includes('aggro') || name.includes('burn')) return 'Presión agresiva temprana';
        if (name.includes('control')) return 'Control hasta win conditions';
        if (name.includes('ramp') || name.includes('domain')) return 'Acelerar maná para amenazas grandes';
        return 'Estrategia de intercambio eficiente';
    }

    inferWeakness(deckName) {
        const name = deckName.toLowerCase();
        if (name.includes('aggro')) return 'Board wipes y lifegain';
        if (name.includes('control')) return 'Presión agresiva temprana';
        if (name.includes('ramp')) return 'Aggro rápido';
        return 'Estrategias especializadas';
    }

    cleanText(text) {
        if (!text) return '';
        return text.trim().replace(/\s+/g, ' ').replace(/[^\w\s\-'.,]/g, '').trim();
    }

    generateDeckId(name) {
        return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 50);
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