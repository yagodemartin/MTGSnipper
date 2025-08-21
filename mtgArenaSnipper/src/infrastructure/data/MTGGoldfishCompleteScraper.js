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
        this.log('🐟 Scraping COMPLETO con cartas...');
        
        // 1. Obtener arquetipos del meta
        const metaDecks = await this.scrapeMetaOverview();
        
        if (!metaDecks || metaDecks.length === 0) {
            throw new Error('No se pudieron obtener arquetipos');
        }

        this.log(`📋 Encontrados ${metaDecks.length} arquetipos, scrapeando cartas...`);

        // 2. CAMBIAR ESTA LÍNEA - Scrapear cartas de cada mazo:
        const completeDecks = await this.scrapeAllDeckListsWithImages(metaDecks);

        const finalData = {
            lastUpdated: new Date().toISOString(),
            format: 'standard',
            source: 'MTGGoldfish-Complete',
            deckCount: completeDecks.length,
            decks: completeDecks // <- Mazos CON cartas
        };

        this.log(`✅ Scraping completo: ${completeDecks.length} mazos con cartas`);
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

  async scrapeSingleDeckWithImages(deck) {
    try {
        // IR DIRECTO al arquetipo, NO buscar deck específico
        const deckUrl = this.baseUrl + deck.url;
        this.log(`🔗 Scrapeando DIRECTO: ${deckUrl}`);
        
        const html = await this.fetchWithProxy(deckUrl);
        const deckList = this.parseArchetypePage(html);
        
        return {
            ...deck,
            mainboard: deckList.mainboard || [],
            sideboard: deckList.sideboard || [],
            totalCards: (deckList.mainboard?.length || 0) + (deckList.sideboard?.length || 0)
        };

    } catch (error) {
        this.logError(`Error scrapeando ${deck.name}:`, error);
        return { ...deck, mainboard: [], sideboard: [] };
    }
}

parseArchetypePage(html) {
    console.log('🔍 DEBUG: Parseando página de mazo...');
    
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const deckList = {
            mainboard: [],
            sideboard: []
        };
        
    // POR:
const cardRows = doc.querySelectorAll('tr');
console.log('🔍 DEBUG: Buscando con selector simple, encontradas:', cardRows.length, 'filas');
        let currentSection = 'mainboard';
        
        cardRows.forEach((row, index) => {
            const text = row.textContent.trim();

             // ← AÑADIR ESTAS LÍNEAS DE DEBUG:
    if (index < 10) { // Solo primeras 10 filas para no saturar
        console.log(`🔍 DEBUG: Fila ${index}:`, text.substring(0, 100));
        
        const quantity = this.extractQuantity(row);
        const cardName = this.extractCardName(row);
        console.log(`🔍 DEBUG: Fila ${index} -> Cantidad: ${quantity}, Carta: "${cardName}"`);
    }
            
            // Detectar sección Sideboard
            if (text.toLowerCase().includes('sideboard')) {
                currentSection = 'sideboard';
                console.log('🔍 DEBUG: Cambiando a sideboard en fila', index);
                return;
            }
            
            // Buscar celdas de cantidad y nombre
            const cells = row.querySelectorAll('td, th');
            if (cells.length < 2) return;
            
            // Intentar extraer cantidad y nombre de diferentes formas
            const quantity = this.extractQuantity(row);
            const cardName = this.extractCardName(row);
            
            if (quantity > 0 && cardName) {
                const card = {
                    quantity: quantity,
                    name: cardName,
                    section: currentSection
                };
                
                deckList[currentSection].push(card);
                console.log(`🔍 DEBUG: [${currentSection}] ${quantity}x ${cardName}`);
            }
        });
        
        console.log('🔍 DEBUG: Resultado final - Mainboard:', deckList.mainboard.length, 'Sideboard:', deckList.sideboard.length);
        return deckList;
        
    } catch (error) {
        console.error('❌ Error parseando página:', error);
        return { mainboard: [], sideboard: [] };
    }
}

// Métodos auxiliares
extractQuantity(row) {
    const text = row.textContent;
    // Buscar números al inicio: "4x", "2", etc.
    const quantityMatch = text.match(/^\s*(\d+)[\sx]*/);
    return quantityMatch ? parseInt(quantityMatch[1]) : 0;
}

extractCardName(row) {
    // Buscar enlaces de cartas con diferentes patrones
    let cardLink = row.querySelector('a[href*="/price/"]');
    if (!cardLink) cardLink = row.querySelector('a[href*="/cards/"]');
    if (!cardLink) cardLink = row.querySelector('a.card-link');
    
    if (cardLink) {
        console.log('🔍 DEBUG: Link encontrado:', cardLink.textContent.trim());
        return cardLink.textContent.trim();
    }
    
    // Fallback: buscar texto después del número
    const text = row.textContent.trim();
    console.log('🔍 DEBUG: Texto completo fila:', text);
    
    const nameMatch = text.match(/^\s*\d+[\sx]*(.+?)(?:\s+\$|\s*$)/);
    return nameMatch ? nameMatch[1].trim() : null;
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

         console.log('🔍 DEBUG: Parseando HTML de', html.length, 'caracteres');
    console.log('🔍 DEBUG: Buscando links...', html.includes('<a') ? 'SÍ' : 'NO');
  
    
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
 * 🌐 Fetch directo (extensión CORS activada)
 */
async fetchWithProxy(url) {
    this.log(`🔗 Fetch directo a: ${url}`);
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        

        
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getOptimalHeaders(),
            signal: controller.signal,
            mode: 'cors'
        });

        clearTimeout(timeoutId);

        

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }

        const html = await response.text();


// ← AÑADIR ESTAS LÍNEAS DE DEBUG:
console.log('🔍 DEBUG: Primeros 500 chars del HTML:', html.substring(0, 500));
console.log('🔍 DEBUG: Buscar "Deck" en HTML:', html.includes('Deck') ? 'SÍ' : 'NO');
console.log('🔍 DEBUG: Buscar "metagame" en HTML:', html.includes('metagame') ? 'SÍ' : 'NO');

        
        if (!html || html.length < 500) {
            throw new Error('Respuesta muy corta o vacía');
        }

        this.log(`✅ Fetch exitoso: ${html.length} caracteres`);
        return html;

    } catch (error) {
        this.logError(`❌ Error en fetch directo:`, error);
        throw error;
    }
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

    /**
 * 🔍 Buscar URL de deck específico dentro del arquetipo
 */
findSpecificDeckUrl(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Buscar primer enlace a deck específico
    const deckLink = doc.querySelector('a[href*="/deck/"]');
    if (deckLink) {
        const href = deckLink.getAttribute('href');
        this.log(`🔍 DEBUG: Encontrado deck específico: ${href}`);
        return this.baseUrl + href;
    }
    
    // Fallback: buscar otros patrones
    const tournamentLink = doc.querySelector('a[href*="/tournament/"]');
    if (tournamentLink) {
        const href = tournamentLink.getAttribute('href');
        this.log(`🔍 DEBUG: Encontrado torneo: ${href}`);
        return this.baseUrl + href;
    }
    
    this.log(`🔍 DEBUG: No se encontró deck específico`);
    return null;
}
}

export default MTGGoldfishCompleteScraper;