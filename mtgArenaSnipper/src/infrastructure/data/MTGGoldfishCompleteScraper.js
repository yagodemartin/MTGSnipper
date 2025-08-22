// src/infrastructure/data/MTGGoldfishCompleteScraper.js
// 🐟 Scraper usando Card Breakdown de MTGGoldfish

class MTGGoldfishCompleteScraper {
    constructor() {
        this.baseUrl = 'https://www.mtggoldfish.com';
        this.metaUrl = '/metagame/standard#paper';
        
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        
        this.rateLimitDelay = 3000;
        this.timeout = 15000;
        this.maxDecks = 20;
        this.debugMode = true;
        
        // Cache de imágenes
        this.imageCache = this.loadImageCache();
        this.workingProxies = [];
        
        // URLs de Scryfall para imágenes
        this.scryfallSearchUrl = 'https://api.scryfall.com/cards/named?exact=';
    }

    /**
     * 🐟 Scraping completo usando Card Breakdown
     */
    async scrapeCompleteMetaData() {
        try {
            this.log('🐟 Scraping con Card Breakdown...');
            
            // 1. Obtener arquetipos del meta
            const metaDecks = await this.scrapeMetaOverview();
            
            if (!metaDecks || metaDecks.length === 0) {
                throw new Error('No se pudieron obtener arquetipos del meta');
            }

            this.log(`📋 Encontrados ${metaDecks.length} arquetipos, extrayendo breakdowns...`);

            // 2. Extraer card breakdown de cada arquetipo
            const completeDecks = await this.scrapeAllDeckBreakdowns(metaDecks);

            const finalData = {
                lastUpdated: new Date().toISOString(),
                format: 'standard',
                source: 'MTGGoldfish-CardBreakdown',
                deckCount: completeDecks.length,
                totalRealCards: completeDecks.reduce((sum, deck) => 
                    sum + (deck.mainboard?.length || 0), 0),
                decks: completeDecks
            };

            this.log(`✅ Scraping completo: ${completeDecks.length} mazos con ${finalData.totalRealCards} cartas del breakdown`);
            return finalData;

        } catch (error) {
            this.logError('❌ Error en scraping:', error);
            throw error;
        }
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
     * 🃏 Scrapear card breakdowns de todos los arquetipos
     */
    async scrapeAllDeckBreakdowns(metaDecks) {
        const completeDecks = [];
        
        this.log(`🃏 Scrapeando breakdowns de ${metaDecks.length} arquetipos...`);
        
        for (let i = 0; i < metaDecks.length; i++) {
            const deck = metaDecks[i];
            
            try {
                this.log(`📋 [${i + 1}/${metaDecks.length}] Procesando: ${deck.name}`);
                
                // Rate limiting
                if (i > 0) {
                    this.log(`⏳ Esperando ${this.rateLimitDelay/1000}s...`);
                    await this.sleep(this.rateLimitDelay);
                }
                
                const completeDeck = await this.scrapeSingleDeckWithCards(deck);
                completeDecks.push(completeDeck);
                
                this.log(`✅ ${deck.name}: ${completeDeck.totalCards || 0} cartas del breakdown`);

            } catch (error) {
                this.logError(`❌ Error en ${deck.name}:`, error.message);
                throw error; // NO fallback - solo datos reales
            }
        }
        
        return completeDecks;
    }

    /**
     * 🎯 Scrapear mazo usando Card Breakdown - ENFOQUE CORRECTO
     */
    async scrapeSingleDeckWithCards(deck) {
        try {
            // PASO 1: Ir SOLO a página del arquetipo (ej: /archetype/standard-izzet-cauldron-woe#paper)
            const archetypeUrl = this.baseUrl + deck.url;
            this.log(`📋 Scrapeando arquetipo directamente: ${archetypeUrl}`);
            
            const archetypeHtml = await this.fetchWithProxy(archetypeUrl);
            if (!archetypeHtml) {
                throw new Error('No se pudo obtener HTML del arquetipo');
            }
            
            // PASO 2: Parsear Card Breakdown directamente de la página del arquetipo
            const deckList = this.parseCardBreakdownFromArchetype(archetypeHtml);
            
            if (!deckList.mainboard || deckList.mainboard.length === 0) {
                throw new Error('No se encontró Card Breakdown en el arquetipo');
            }
            
            this.log(`✅ Card Breakdown encontrado: ${deckList.mainboard.length} mainboard, ${deckList.sideboard.length} sideboard`);
            
            // PASO 3: Construir mazo completo con datos del breakdown
            return {
                ...deck,
                mainboard: deckList.mainboard,
                sideboard: deckList.sideboard,
                keyCards: this.identifyKeyCards(deckList.mainboard),
                totalCards: deckList.mainboard.length + deckList.sideboard.length,
                colors: this.inferColorsFromCards(deckList.mainboard),
                archetype: this.inferArchetypeFromCards(deckList.mainboard),
                source: 'CardBreakdown',
                hasRealCards: true
            };

        } catch (error) {
            this.logError(`❌ Error en ${deck.name}:`, error.message);
            throw error;
        }
    }

    /**
     * 📊 Parsear Card Breakdown desde página del arquetipo
     */
    parseCardBreakdownFromArchetype(html) {
        this.log('🔍 Parseando Card Breakdown desde página del arquetipo...');
        
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const deckList = {
                mainboard: [],
                sideboard: []
            };
            
            // Buscar la sección "Card Breakdown"
            const breakdownSection = this.findCardBreakdownSection(doc);
            
            if (breakdownSection) {
                this.log('✅ Sección Card Breakdown encontrada');
                
                // Parsear cada categoría del breakdown
                const categories = this.parseBreakdownCategories(breakdownSection);
                
                // Procesar categorías principales (mainboard)
                const mainboardCategories = ['Creatures', 'Spells', 'Artifacts', 'Enchantments', 'Lands', 'Planeswalkers'];
                
                for (const category of mainboardCategories) {
                    if (categories[category]) {
                        const categoryCards = this.parseCardsFromCategory(categories[category]);
                        deckList.mainboard.push(...categoryCards);
                        this.log(`📋 ${category}: ${categoryCards.length} cartas`);
                    }
                }
                
                // Procesar sideboard
                if (categories['Sideboard']) {
                    const sideboardCards = this.parseCardsFromCategory(categories['Sideboard']);
                    deckList.sideboard.push(...sideboardCards);
                    this.log(`📋 Sideboard: ${sideboardCards.length} cartas`);
                }
                
            } else {
                this.log('❌ No se encontró sección Card Breakdown, intentando parsing de texto...');
                
                // Fallback: buscar por texto del breakdown
                const textBreakdown = this.parseBreakdownFromText(html);
                deckList.mainboard.push(...textBreakdown.mainboard);
                deckList.sideboard.push(...textBreakdown.sideboard);
            }
            
            this.log(`📊 Breakdown parseado: ${deckList.mainboard.length} mainboard, ${deckList.sideboard.length} sideboard`);
            return deckList;
            
        } catch (error) {
            this.logError('Error parseando Card Breakdown:', error);
            return { mainboard: [], sideboard: [] };
        }
    }

    /**
     * 🔍 Encontrar sección Card Breakdown
     */
    findCardBreakdownSection(doc) {
        // Buscar texto "Card Breakdown" o "Below are the most popular cards"
        const searchTexts = [
            'Card Breakdown',
            'Below are the most popular cards',
            'Most popular cards',
            'Creatures',
            'Spells'
        ];
        
        for (const searchText of searchTexts) {
            const xpath = `//*[contains(text(), "${searchText}")]`;
            const result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            
            if (result.singleNodeValue) {
                this.log(`✅ Breakdown encontrado con texto: "${searchText}"`);
                
                // Buscar el contenedor padre que tiene todo el breakdown
                let container = result.singleNodeValue;
                for (let i = 0; i < 5; i++) {
                    container = container.parentElement;
                    if (container && container.textContent.length > 500) {
                        return container;
                    }
                }
                
                return result.singleNodeValue.parentElement;
            }
        }
        
        this.log('❌ No se encontró sección Card Breakdown');
        return null;
    }

    /**
     * 📋 Parsear categorías del breakdown
     */
    parseBreakdownCategories(breakdownSection) {
        const categories = {};
        
        // Buscar encabezados de categorías (Creatures, Spells, etc.)
        const categoryHeaders = breakdownSection.querySelectorAll('h3, h4, h5, strong, b');
        
        for (const header of categoryHeaders) {
            const headerText = header.textContent.trim();
            
            // Identificar categorías conocidas
            const knownCategories = [
                'Creatures', 'Spells', 'Artifacts', 'Enchantments', 
                'Lands', 'Planeswalkers', 'Sideboard'
            ];
            
            const matchedCategory = knownCategories.find(cat => 
                headerText.toLowerCase().includes(cat.toLowerCase())
            );
            
            if (matchedCategory) {
                this.log(`📋 Categoría encontrada: ${matchedCategory}`);
                
                // Encontrar contenido de la categoría (siguiente elemento o hermanos)
                let contentElement = header.nextElementSibling;
                let attempts = 0;
                
                while (contentElement && attempts < 5) {
                    if (contentElement.textContent.trim().length > 10) {
                        categories[matchedCategory] = contentElement;
                        break;
                    }
                    contentElement = contentElement.nextElementSibling;
                    attempts++;
                }
                
                // Si no encuentra contenido como hermano, buscar en el padre
                if (!categories[matchedCategory]) {
                    const parentContent = header.parentElement;
                    if (parentContent && parentContent.textContent.length > headerText.length + 20) {
                        categories[matchedCategory] = parentContent;
                    }
                }
            }
        }
        
        return categories;
    }

   /**
 * 🃏 Parsear cartas desde categoría - ARREGLADO para extraer TODAS
 */
parseCardsFromCategory(categoryElement) {
    const cards = [];
    const text = categoryElement.textContent;
    
    this.log(`🔍 DEBUG: Parseando categoría con texto de ${text.length} caracteres`);
    this.log(`🔍 DEBUG: Primeros 200 chars: ${text.substring(0, 200)}`);
    
    // Patrón MEJORADO para cartas del breakdown
    const cardPatterns = [
        // Patrón principal: "Fear of Missing Out\n4.0 in 100% of decks"
        /([A-Za-z][A-Za-z\s,''-]+?)\s*[\n\r]+\s*(\d+\.?\d*)\s+in\s+(\d+)%\s+of\s+decks/gm,
        
        // Patrón alternativo: "Fear of Missing Out 4.0 in 100% of decks"
        /([A-Za-z][A-Za-z\s,''-]+?)\s+(\d+\.?\d*)\s+in\s+(\d+)%\s+of\s+decks/gm,
        
        // Patrón más flexible: cualquier carta seguida de números
        /([A-Za-z][A-Za-z\s,''\-]+?)\s*[\n\r]?\s*(\d+\.?\d*)\s+in\s+(\d+)%/gm
    ];
    
    for (const pattern of cardPatterns) {
        pattern.lastIndex = 0; // Reset regex
        let match;
        let foundInThisPattern = 0;
        
        while ((match = pattern.exec(text)) !== null && foundInThisPattern < 20) {
            const cardName = this.cleanCardName(match[1]);
            const averageCount = parseFloat(match[2]);
            const deckPercentage = parseInt(match[3]);
            
            // Validar que no sea un duplicado
            const isDuplicate = cards.some(existing => 
                this.normalizeCardName(existing.name) === this.normalizeCardName(cardName)
            );
            
            if (!isDuplicate && cardName && cardName.length > 2 && averageCount > 0) {
                const quantity = Math.round(averageCount);
                
                if (quantity >= 1 && quantity <= 4) {
                    cards.push({
                        name: cardName,
                        quantity: quantity,
                        averageCount: averageCount,
                        deckPercentage: deckPercentage,
                        extractedAt: new Date().toISOString(),
                        source: 'breakdown'
                    });
                    
                    foundInThisPattern++;
                    this.log(`🃏 ${cardName}: ${quantity}x (${averageCount} avg, ${deckPercentage}%)`);
                }
            }
        }
        
        this.log(`🔍 Patrón ${cardPatterns.indexOf(pattern) + 1}: ${foundInThisPattern} cartas encontradas`);
        
        // Si encontramos cartas con este patrón, usar solo este
        if (foundInThisPattern > 0) {
            break;
        }
    }
    
    return cards;
}

// TAMBIÉN AÑADIR normalizeCardName si no existe:

normalizeCardName(name) {
    return name.toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ');
}

    /**
 * 📝 Parsear breakdown desde texto - MEJORADO
 */
parseBreakdownFromText(html) {
    const cards = { mainboard: [], sideboard: [] };
    
    try {
        this.log('🔍 Parseando breakdown desde texto completo...');
        
        // Dividir por secciones primero
        const sections = this.splitTextIntoSections(html);
        
        for (const [sectionName, sectionText] of Object.entries(sections)) {
            const isMainboard = ['creatures', 'spells', 'artifacts', 'enchantments', 'lands', 'planeswalkers'].includes(sectionName);
            const targetArray = isMainboard ? cards.mainboard : cards.sideboard;
            
            const sectionCards = this.extractCardsFromSectionText(sectionText);
            targetArray.push(...sectionCards);
            
            this.log(`📋 ${sectionName}: ${sectionCards.length} cartas extraídas`);
        }
        
    } catch (error) {
        this.logError('Error parsing breakdown from text:', error);
    }
    
    return cards;
}

// AÑADIR estos métodos auxiliares:

/**
 * 📂 Dividir texto en secciones
 */
splitTextIntoSections(html) {
    const sections = {};
    
    // Buscar secciones por encabezados
    const sectionPattern = /(Creatures|Spells|Artifacts|Enchantments|Lands|Planeswalkers|Sideboard)(.*?)(?=Creatures|Spells|Artifacts|Enchantments|Lands|Planeswalkers|Sideboard|$)/gis;
    
    let match;
    while ((match = sectionPattern.exec(html)) !== null) {
        const sectionName = match[1].toLowerCase();
        const sectionContent = match[2];
        sections[sectionName] = sectionContent;
    }
    
    return sections;
}

/**
 * 🃏 Extraer cartas de texto de sección
 */
extractCardsFromSectionText(sectionText) {
    const cards = [];
    
    // Múltiples patrones para mayor flexibilidad
    const patterns = [
        /([A-Za-z][A-Za-z\s,''-]+?)\s*[\n\r]+\s*(\d+\.?\d*)\s+in\s+(\d+)%\s+of\s+decks/gm,
        /([A-Za-z][A-Za-z\s,''-]+?)\s+(\d+\.?\d*)\s+in\s+(\d+)%\s+of\s+decks/gm,
        /([A-Za-z'][A-Za-z\s,''\-]+?)\s*(\d+\.?\d*)\s+in\s+(\d+)%/gm
    ];
    
    for (const pattern of patterns) {
        pattern.lastIndex = 0;
        let match;
        
        while ((match = pattern.exec(sectionText)) !== null) {
            const cardName = this.cleanCardName(match[1]);
            const averageCount = parseFloat(match[2]);
            const deckPercentage = parseInt(match[3]);
            
            if (cardName && cardName.length > 2 && averageCount > 0) {
                const quantity = Math.round(averageCount);
                
                if (quantity >= 1 && quantity <= 4) {
                    cards.push({
                        name: cardName,
                        quantity: quantity,
                        averageCount: averageCount,
                        deckPercentage: deckPercentage,
                        extractedAt: new Date().toISOString(),
                        source: 'breakdown-text'
                    });
                }
            }
        }
        
        if (cards.length > 0) break; // Si encontró cartas, no probar más patrones
    }
    
    return cards;
}


    /**
     * 🌐 Fetch usando proxy CORS
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
     * 🧹 Limpiar nombre de carta
     */
    cleanCardName(cardName) {
        if (!cardName) return '';
        
        return cardName
            .replace(/\$\d+\.?\d*/g, '')           // Remover precios
            .replace(/\([A-Z0-9]+\)/g, '')         // Remover códigos de set
            .replace(/#\d+/g, '')                  // Remover números de coleccionista
            .replace(/\s+/g, ' ')                  // Normalizar espacios
            .trim();
    }

    /**
     * 🔑 Identificar cartas clave
     */
    identifyKeyCards(mainboard) {
        return mainboard
            .filter(card => card.quantity >= 3)
            .map(card => ({
                name: card.name,
                quantity: card.quantity,
                weight: card.quantity * 25,
                role: 'key',
                deckPercentage: card.deckPercentage || 0
            }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 8);
    }

    /**
     * 🎨 Inferir colores desde cartas
     */
    inferColorsFromCards(cards) {
        const colors = new Set();
        
        for (const card of cards) {
            const name = card.name.toLowerCase();
            
            // Tierras básicas
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
     * 🏗️ Detectar arquetipo desde cartas
     */
    inferArchetypeFromCards(mainboard) {
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

    // Métodos auxiliares
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

    log(message, data = null) {
        if (!this.debugMode) return;
        console.log(`🐟 [BreakdownScraper] ${message}`, data || '');
    }

    logError(message, error = null) {
        console.error(`❌ [BreakdownScraper] ${message}`, error || '');
    }
}

export default MTGGoldfishCompleteScraper;