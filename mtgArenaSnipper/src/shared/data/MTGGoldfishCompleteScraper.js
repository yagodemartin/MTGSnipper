// src/infrastructure/data/MTGGoldfishCompleteScraper.js
// 🐟 Scraper completamente dinámico para MTGGoldfish

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
        this.maxDecks = 8;
        this.debugMode = true;
        
        // Cache de imágenes
        this.imageCache = this.loadImageCache();
        this.workingProxies = [];
        
        // URLs de Scryfall para imágenes
        this.scryfallSearchUrl = 'https://api.scryfall.com/cards/named?exact=';
    }

    /**
     * 🐟 MÉTODO PRINCIPAL - Scraping de UN SOLO mazo para testing
     */
    async scrapeCompleteMetaData() {
        try {
            this.log('🎯 Iniciando scraping de UN SOLO mazo para testing...');
            
            // 1. Extraer arquetipos desde archetype-tile elements
            const archetypes = await this.scrapeMetaOverview(); // ← CORRECCIÓN AQUÍ
            
            if (!archetypes || archetypes.length === 0) {
                throw new Error('No se pudieron obtener arquetipos desde tiles');
            }

            this.log(`📋 Encontrados ${archetypes.length} arquetipos`);
            
            // 🎯 CAMBIO PRINCIPAL: Solo tomar el PRIMER arquetipo
            const firstArchetype = archetypes[0];
            this.log(`🎯 Procesando SOLO el primer arquetipo: ${firstArchetype.name}`);

            // 2. Scrapear Card Breakdown del PRIMER arquetipo únicamente
            let completeDecks = [];
            
            try {
                const completeDeck = await this.scrapeArchetypeWithCards(firstArchetype);
                completeDecks.push(completeDeck);
                
                this.log(`✅ Mazo procesado: ${completeDeck.name}`);
                this.log(`📊 Cartas: ${completeDeck.mainboard.length} mainboard, ${completeDeck.sideboard.length} sideboard`);
                
            } catch (error) {
                this.logError(`❌ Error procesando ${firstArchetype.name}:`, error.message);
                throw error;
            }

            const finalData = {
                lastUpdated: new Date().toISOString(),
                format: 'standard',
                source: 'MTGGoldfish-SingleDeck-Test',
                deckCount: completeDecks.length,
                totalRealCards: completeDecks.reduce((sum, deck) => 
                    sum + (deck.totalCardsInDeck || deck.totalCards || 0), 0),
                totalUniqueCards: completeDecks.reduce((sum, deck) => 
                    sum + (deck.totalCards || 0), 0),
                decks: completeDecks
            };

            this.log(`✅ Scraping de UN mazo completado exitosamente`);
            this.log(`📊 Total: ${finalData.totalUniqueCards} cartas únicas, ${finalData.totalRealCards} cartas en mazo`);
            
            return finalData;

        } catch (error) {
            this.logError('❌ Error en scraping de mazo único:', error);
            throw error;
        }
    }

    /**
     * 🔍 PASO 1: Extraer arquetipos desde archetype-tile elements
     */
    async scrapeMetaOverview() {
        this.log('🔍 Extrayendo arquetipos desde archetype-tile elements...');
        
        const html = await this.fetchWithProxy(this.baseUrl + this.metaUrl);
        if (!html) {
            throw new Error('No se pudo obtener HTML de la página meta');
        }

        const archetypes = this.extractArchetypesFromTiles(html);
        
        if (archetypes.length === 0) {
            throw new Error('No se encontraron archetype-tile elements');
        }

        this.log(`✅ Encontrados ${archetypes.length} arquetipos desde tiles`);
        return archetypes.slice(0, this.maxDecks);
    }

    /**
     * 🎯 Extraer arquetipos desde archetype-tile elements
     */
    extractArchetypesFromTiles(html) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Buscar todos los elementos archetype-tile
            const tiles = doc.querySelectorAll('.archetype-tile');
            
            this.log(`🔍 Encontrados ${tiles.length} archetype-tile elements`);

            const archetypes = [];

            Array.from(tiles).forEach((tile, index) => {
                try {
                    // EXTRAER URL Y NOMBRE - Preferir paper, fallback a online
                    const titleDiv = tile.querySelector('.archetype-tile-title');
                    if (!titleDiv) {
                        this.log(`⚠️ Tile ${index + 1}: Sin archetype-tile-title`);
                        return;
                    }

                    // Priorizar paper sobre online
                    let linkElement = titleDiv.querySelector('.deck-price-paper a') || 
                                     titleDiv.querySelector('.deck-price-online a') ||
                                     titleDiv.querySelector('a[href*="/archetype/"]');
                    
                    if (!linkElement) {
                        this.log(`⚠️ Tile ${index + 1}: Sin enlace de arquetipo`);
                        return;
                    }

                    const url = linkElement.getAttribute('href');
                    const name = this.cleanText(linkElement.textContent);

                    // EXTRAER META%
                    const metaElement = tile.querySelector('.metagame-percentage .archetype-tile-statistic-value');
                    const metaText = metaElement ? metaElement.textContent.trim() : '0%';
                    const metaShare = parseFloat(metaText.replace('%', '')) || 0;

                    // EXTRAER CARTAS CLAVE desde la lista ul li
                    const keyCardsList = tile.querySelectorAll('ul li');
                    const keyCards = Array.from(keyCardsList).map(li => this.cleanText(li.textContent));

                    // EXTRAER IMAGEN DE LA CARTA PRINCIPAL
                    const cardImage = tile.querySelector('.card-image-tile');
                    const deckImage = cardImage ? 
                        cardImage.style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/, '$1') : null;

                    // VALIDAR DATOS
                    if (!url || !this.isValidArchetypeName(name) || !url.includes('/archetype/')) {
                        this.log(`⚠️ Tile ${index + 1}: Datos inválidos - ${name}, ${url}`);
                        return;
                    }

                    const archetype = {
                        name,
                        url,
                        rank: index + 1,
                        metaShare,
                        keyCards, // Cartas mostradas en el tile
                        deckImage, // URL de imagen principal
                        extractedAt: new Date().toISOString()
                    };

                    archetypes.push(archetype);
                    this.log(`✅ ${index + 1}. ${name} (${metaShare}%) → ${url}`);
                    this.log(`   Cartas clave: ${keyCards.join(', ')}`);

                } catch (error) {
                    this.logError(`❌ Error procesando tile ${index + 1}:`, error.message);
                }
            });

            // Ordenar por meta share descendente
            archetypes.sort((a, b) => b.metaShare - a.metaShare);

            // Reasignar ranks después del ordenamiento
            archetypes.forEach((archetype, index) => {
                archetype.rank = index + 1;
            });

            this.log(`📊 Top arquetipos encontrados:`);
            archetypes.slice(0, 5).forEach(archetype => {
                this.log(`  ${archetype.rank}. ${archetype.name} - ${archetype.metaShare}%`);
            });

            return archetypes;
            
        } catch (error) {
            this.logError('Error extrayendo arquetipos desde tiles:', error);
            return [];
        }
    }

    /**
     * 🃏 PASO 2: Scrapear Card Breakdown de todos los arquetipos
     */
    async scrapeAllArchetypeBreakdowns(archetypes) {
        const completeDecks = [];
        
        this.log(`🃏 Scrapeando breakdowns de ${archetypes.length} arquetipos...`);
        
        for (let i = 0; i < archetypes.length; i++) {
            const archetype = archetypes[i];
            
            try {
                this.log(`📋 [${i + 1}/${archetypes.length}] Procesando: ${archetype.name}`);
                
                // Rate limiting
                if (i > 0) {
                    this.log(`⏳ Esperando ${this.rateLimitDelay/1000}s...`);
                    await this.sleep(this.rateLimitDelay);
                }
                
                const completeDeck = await this.scrapeArchetypeWithCards(archetype);
                completeDecks.push(completeDeck);
                
                const uniqueCards = completeDeck.totalCards || 0;
                const totalDeckSize = completeDeck.totalCardsInDeck || 0;
                const source = completeDeck.hasExactList ? 'Lista exacta' : 'Breakdown';
                
                this.log(`✅ ${archetype.name}: ${uniqueCards} cartas únicas (${totalDeckSize} total) - ${source}`);

            } catch (error) {
                this.logError(`❌ Error en ${archetype.name}:`, error.message);
                // Continuar con los siguientes para obtener al menos algunos mazos
                continue;
            }
        }
        
        return completeDecks;
    }

    /**
     * 🎯 Scrapear un arquetipo específico para obtener su Card Breakdown
     */
    async scrapeArchetypeWithCards(archetype) {
        try {
            // Construir URL completa del arquetipo
            let archetypeUrl = archetype.url;
            if (!archetypeUrl.startsWith('http')) {
                archetypeUrl = this.baseUrl + archetypeUrl;
            }

            this.log(`📋 Scrapeando arquetipo: ${archetypeUrl}`);
            
            // Obtener HTML del arquetipo
            const archetypeHtml = await this.fetchWithProxy(archetypeUrl);
            if (!archetypeHtml) {
                throw new Error('No se pudo obtener HTML del arquetipo');
            }
            
            // Parsear Card Breakdown desde la página del arquetipo
            const deckList = this.parseCardBreakdownFromArchetype(archetypeHtml);
            
            // NUEVO: Parsear lista completa del mazo ejemplo (75 cartas)
            const completeDeckList = this.parseCompleteDeckList(archetypeHtml);
            
            this.log(`🔍 Resultados del parsing:`);
            this.log(`  📊 Card Breakdown: ${deckList.mainboard.length} mainboard, ${deckList.sideboard.length} sideboard`);
            this.log(`  🎯 Lista completa: ${completeDeckList.mainboard.length} mainboard, ${completeDeckList.sideboard.length} sideboard`);
            
            // PRIORIZAR LISTA COMPLETA - Solo usar breakdown si no hay lista exacta
            let finalMainboard, finalSideboard, sourceType;
            
            if (completeDeckList.mainboard.length >= 20 || completeDeckList.sideboard.length >= 5) {
                // Usar lista completa si tiene suficientes cartas
                finalMainboard = completeDeckList.mainboard;
                finalSideboard = completeDeckList.sideboard;
                sourceType = 'Lista exacta (75 cartas)';
                this.log('✅ USANDO LISTA EXACTA - Tiene cartas suficientes');
            } else if (deckList.mainboard.length > 0) {
                // Fallback a breakdown si la lista completa falló
                finalMainboard = deckList.mainboard;
                finalSideboard = deckList.sideboard;
                sourceType = 'Card Breakdown (estadísticas)';
                this.log('⚠️ USANDO BREAKDOWN - Lista exacta insuficiente');
            } else {
                throw new Error('No se pudo extraer ni lista exacta ni breakdown');
            }
            
            this.log(`📊 RESULTADO FINAL: ${finalMainboard.length} mainboard, ${finalSideboard.length} sideboard`);
            this.log(`📋 Fuente: ${sourceType}`);
            
            // Debug: mostrar algunas cartas extraídas
            if (finalMainboard.length > 0) {
                this.log('🎯 Primeras cartas del mainboard:');
                finalMainboard.slice(0, 5).forEach((card, i) => {
                    this.log(`  ${i + 1}. ${card.copies}x ${card.name}${card.price ? ` (${card.price})` : ''}`);
                });
            }
            
            // Construir objeto completo del mazo
            return {
                ...archetype,
                mainboard: finalMainboard,
                sideboard: finalSideboard,
                cardBreakdown: deckList, // Mantener breakdown para estadísticas
                keyCards: this.identifyKeyCards(finalMainboard),
                totalCards: this.calculateTotalCards(finalMainboard, finalSideboard),
                totalCardsInDeck: this.calculateActualDeckSize(finalMainboard, finalSideboard), // 75 cartas reales
                colors: this.inferColorsFromCards(finalMainboard),
                archetype: this.inferArchetypeFromCards(finalMainboard),
                source: completeDeckList.mainboard.length >= 20 ? 'MTGGoldfish-CompleteDeck' : 'MTGGoldfish-CardBreakdown',
                hasRealCards: true,
                hasExactList: completeDeckList.mainboard.length >= 20,
                lastUpdated: new Date().toISOString()
            };

        } catch (error) {
            this.logError(`❌ Error scrapeando ${archetype.name}:`, error.message);
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
                
                // Procesar categorías principales (mainboard) - categorías universales
                const mainboardCategories = ['Creatures', 'Spells', 'Artifacts', 'Enchantments', 'Lands', 'Planeswalkers'];
                
                for (const category of mainboardCategories) {
                    if (categories[category]) {
                        const categoryCards = this.parseCardsFromCategory(categories[category]);
                        deckList.mainboard.push(...categoryCards);
                        this.log(`📋 ${category}: ${categoryCards.length} cartas`);
                    }
                }
                
                // Procesar sideboard si existe
                if (categories['Sideboard']) {
                    const sideboardCards = this.parseCardsFromCategory(categories['Sideboard']);
                    deckList.sideboard.push(...sideboardCards);
                    this.log(`📋 Sideboard: ${sideboardCards.length} cartas`);
                }
            } else {
                this.log('⚠️ No se encontró sección Card Breakdown');
            }
            
            return deckList;
            
        } catch (error) {
            this.logError('Error parseando breakdown:', error);
            return { mainboard: [], sideboard: [] };
        }
    }

    /**
     * 🔍 Encontrar sección Card Breakdown
     */
    findCardBreakdownSection(doc) {
        this.log('🔍 Buscando sección Card Breakdown...');
        
        // Términos universales que usa MTGGoldfish (nunca cambian)
        const searchTexts = [
            'Card Breakdown',
            'Below are the most popular cards', 
            'Most popular cards',
            'Popular cards'
        ];
        
        for (const searchText of searchTexts) {
            this.log(`🔍 Buscando texto: "${searchText}"`);
            
            // Usar XPath para búsqueda más precisa
            try {
                const xpath = `//*[contains(text(), "${searchText}")]`;
                const result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                
                if (result.singleNodeValue) {
                    this.log(`✅ Breakdown encontrado con XPath: "${searchText}"`);
                    
                    let container = result.singleNodeValue;
                    this.log(`📍 Elemento inicial: ${container.tagName}, texto: ${container.textContent.substring(0, 100)}...`);
                    
                    // Buscar el contenedor padre apropiado
                    for (let i = 0; i < 8; i++) {
                        if (!container || !container.parentElement) {
                            this.log(`⚠️ Sin parentElement en iteración ${i}`);
                            break;
                        }
                        
                        container = container.parentElement;
                        const textLength = container.textContent ? container.textContent.length : 0;
                        this.log(`📍 Iteración ${i}: ${container.tagName}, ${textLength} chars, hijos: ${container.children.length}`);
                        
                        // Verificar si tiene suficiente contenido y estructura
                        if (textLength > 1000 && this.hasCardBreakdownStructure(container)) {
                            this.log(`✅ Contenedor válido encontrado: ${container.tagName}`);
                            return container;
                        }
                    }
                }
            } catch (error) {
                this.logError(`Error en XPath "${searchText}":`, error);
            }
        }
        
        this.log('❌ No se encontró sección Card Breakdown válida');
        return null;
    }

    /**
     * 🏗️ Verificar si tiene estructura de Card Breakdown
     */
    hasCardBreakdownStructure(element) {
        const text = element.textContent || '';
        const text_lower = text.toLowerCase();
        
        // Verificar palabras clave universales que siempre aparecen
        const requiredCategories = ['creatures', 'spells', 'lands'];
        const foundCategories = requiredCategories.filter(cat => 
            text_lower.includes(cat)
        );
        
        return foundCategories.length >= 3; // Al menos 3 categorías principales
    }

    /**
     * 📂 Parsear categorías del breakdown
     */
    parseBreakdownCategories(breakdownSection) {
        this.log('📂 Parseando categorías del breakdown...');
        
        const categories = {};
        
        try {
            // Categorías universales estándar
            const universalCategories = ['Creatures', 'Spells', 'Artifacts', 'Enchantments', 'Lands', 'Planeswalkers', 'Sideboard'];
            
            // Buscar headers con estas categorías
            const headers = breakdownSection.querySelectorAll('h3, h4, h5, strong, .breakdown-header');
            
            Array.from(headers).forEach(header => {
                const headerText = header.textContent ? header.textContent.trim() : '';
                this.log(`📋 Evaluando header: "${headerText}"`);
                
                const matchedCategory = universalCategories.find(cat => 
                    headerText.toLowerCase().includes(cat.toLowerCase())
                );
                
                if (matchedCategory && !categories[matchedCategory]) {
                    this.log(`✅ Categoría universal encontrada: ${matchedCategory}`);
                    
                    // Buscar contenido de la categoría
                    const content = this.findCategoryContent(header);
                    if (content) {
                        categories[matchedCategory] = content;
                        this.log(`📄 Contenido asignado para ${matchedCategory}: ${content.textContent.length} chars`);
                    }
                }
            });
            
            this.log(`📊 Categorías finales encontradas: ${Object.keys(categories).join(', ')}`);
            
        } catch (error) {
            this.logError('Error parseando categorías:', error);
        }
        
        return categories;
    }

    /**
     * 🔍 Buscar contenido de una categoría
     */
    findCategoryContent(header) {
        // Buscar el siguiente elemento que contenga las cartas
        let contentElement = header.nextElementSibling;
        let attempts = 0;
        
        while (contentElement && attempts < 8) {
            const textLength = contentElement.textContent ? contentElement.textContent.length : 0;
            
            if (textLength > 50 && this.looksLikeCardList(contentElement)) {
                this.log(`✅ Contenido encontrado: ${textLength} chars`);
                return contentElement;
            }
            
            contentElement = contentElement.nextElementSibling;
            attempts++;
        }
        
        this.log('⚠️ No se encontró contenido válido para la categoría');
        return null;
    }

    /**
     * 🃏 Verificar si parece una lista de cartas
     */
    looksLikeCardList(element) {
        const text = element.textContent || '';
        
        // Buscar patrones típicos de cartas
        const cardPatterns = [
            /\d+%.*[A-Z]/,  // "85% Lightning Bolt"
            /[A-Z][a-z]+.*\d+%/,  // "Lightning Bolt 85%"
            /\$\d+\.\d+/,  // Precios
        ];
        
        return cardPatterns.some(pattern => pattern.test(text));
    }

    /**
     * 🎴 Parsear cartas desde una categoría
     */
    parseCardsFromCategory(categoryElement) {
        const cards = [];
        
        try {
            const text = categoryElement.textContent || '';
            
            // Patrones para extraer cartas con porcentajes
            const cardPatterns = [
                // "85% Lightning Bolt $1.23"
                /(\d+)%\s+([A-Z][^$\n]+?)(?:\s*\$[\d.]+)?\s*(?=\d+%|$)/g,
                // "Lightning Bolt 85% $1.23"
                /([A-Z][^0-9\n]+?)\s+(\d+)%(?:\s*\$[\d.]+)?\s*(?=\d+%|[A-Z]|$)/g
            ];
            
            for (const pattern of cardPatterns) {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    let percentage, cardName;
                    
                    if (pattern.source.startsWith('(\\d+)%')) {
                        // Primer patrón: "85% Lightning Bolt"
                        percentage = parseInt(match[1]);
                        cardName = this.cleanCardName(match[2]);
                    } else {
                        // Segundo patrón: "Lightning Bolt 85%"
                        cardName = this.cleanCardName(match[1]);
                        percentage = parseInt(match[2]);
                    }
                    
                    if (cardName && percentage > 0 && this.isValidCardName(cardName)) {
                        cards.push({
                            name: cardName,
                            copies: Math.ceil(percentage / 25), // Estimar copias desde porcentaje
                            weight: percentage,
                            source: 'breakdown'
                        });
                    }
                }
            }
            
        } catch (error) {
            this.logError('Error parseando cartas de categoría:', error);
        }
        
        return cards;
    }

    /**
     * 📜 Parsear lista completa del mazo (75 cartas)
     */
    parseCompleteDeckList(html) {
        this.log('📜 Buscando lista completa del mazo (75 cartas)...');
        
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Buscar elementos que contengan listas completas de mazos
            const candidates = [
                ...doc.querySelectorAll('table'),
                ...doc.querySelectorAll('.deck-list'),
                ...doc.querySelectorAll('.decklist'),
                ...doc.querySelectorAll('[class*="deck"]'),
                ...doc.querySelectorAll('div')
            ];
            
            this.log(`🔍 Evaluando ${candidates.length} candidatos para deck list...`);
            
            for (const candidate of candidates) {
                if (this.looksLikeCompleteDeckTable(candidate)) {
                    this.log('✅ Candidato prometedor encontrado, parseando...');
                    
                    const deckList = this.parseCompleteDeckFromElement(candidate);
                    
                    if (deckList.mainboard.length >= 20) {
                        this.log(`✅ Lista completa válida: ${deckList.mainboard.length} mainboard, ${deckList.sideboard.length} sideboard`);
                        return deckList;
                    }
                }
            }
            
            this.log('⚠️ No se encontró lista completa válida');
            return { mainboard: [], sideboard: [] };
            
        } catch (error) {
            this.logError('Error parseando lista completa:', error);
            return { mainboard: [], sideboard: [] };
        }
    }

    /**
     * 📋 Parsear deck completo desde elemento específico
     */
    parseCompleteDeckFromElement(element) {
        const deckList = { mainboard: [], sideboard: [] };
        const fullText = element.textContent;
        
        this.log('📋 Parseando deck desde elemento específico...');
        
        // Usar el parseador de categorías mejorado
        const categories = this.parseCompleteDeckCategories(element);
        
        // Procesar cada categoría
        for (const [categoryName, categoryText] of Object.entries(categories)) {
            const cards = this.parseExactCardsFromCategory(categoryText, categoryName);
            
            if (categoryName === 'Sideboard') {
                deckList.sideboard.push(...cards);
            } else {
                deckList.mainboard.push(...cards);
            }
            
            this.log(`🔍 ${categoryName}: ${cards.length} cartas extraídas`);
        }
        
        return deckList;
    }

    /**
     * 🗂️ Parsear categorías de la lista completa - MEJORADO
     */
    parseCompleteDeckCategories(deckListSection) {
        this.log('🗂️ Parseando categorías de la lista completa...');
        const categories = {};
        
        if (!deckListSection) return categories;
        
        const fullText = deckListSection.textContent;
        this.log(`📝 Texto completo del deck: ${fullText.length} caracteres`);
        
        // Categorías universales con patrones dinámicos
        const categoryPatterns = [
            { name: 'Creatures', pattern: /Creatures\s*\(\d+\)/i },
            { name: 'Spells', pattern: /Spells\s*\(\d+\)/i },
            { name: 'Artifacts', pattern: /Artifacts\s*\(\d+\)/i },
            { name: 'Enchantments', pattern: /Enchantments\s*\(\d+\)/i },
            { name: 'Lands', pattern: /Lands\s*\(\d+\)/i },
            { name: 'Planeswalkers', pattern: /Planeswalkers\s*\(\d+\)/i },
            { name: 'Sideboard', pattern: /Sideboard\s*\(\d+\)/i }
        ];
        
        for (let i = 0; i < categoryPatterns.length; i++) {
            const currentCategory = categoryPatterns[i];
            const nextCategory = categoryPatterns[i + 1];
            
            const currentMatch = currentCategory.pattern.exec(fullText);
            if (!currentMatch) continue;
            
            const startIndex = currentMatch.index + currentMatch[0].length;
            let endIndex = fullText.length;
            
            // Buscar el final usando la siguiente categoría
            if (nextCategory) {
                const nextMatch = nextCategory.pattern.exec(fullText.substring(startIndex));
                if (nextMatch) {
                    endIndex = startIndex + nextMatch.index;
                }
            }
            
            const categoryText = fullText.substring(startIndex, endIndex).trim();
            
            if (categoryText.length > 10) {
                categories[currentCategory.name] = categoryText;
                this.log(`✅ ${currentCategory.name}: ${categoryText.length} caracteres`);
            }
        }
        
        return categories;
    }

    /**
     * 🃏 Parsear cartas exactas desde categoría (con cantidad real)
     */
    parseExactCardsFromCategory(categoryText, categoryName) {
        const cards = [];
        
        try {
            // Patrones para cartas exactas: "4 Lightning Bolt"
            const exactCardPattern = /^(\d+)\s+([A-Z][A-Za-z\s,'-]+)(?:\s*\$[\d.]+)?$/gm;
            
            let match;
            while ((match = exactCardPattern.exec(categoryText)) !== null) {
                const copies = parseInt(match[1]);
                const cardName = this.cleanCardName(match[2]);
                
                if (cardName && copies > 0 && copies <= 4 && this.isValidCardName(cardName)) {
                    cards.push({
                        name: cardName,
                        copies: copies,
                        weight: copies,
                        source: 'exact'
                    });
                }
            }
            
        } catch (error) {
            this.logError(`Error parseando cartas exactas de ${categoryName}:`, error);
        }
        
        return cards;
    }

    /**
     * 🎯 Verificar si una tabla parece ser una lista completa de mazo
     */
    looksLikeCompleteDeckTable(table) {
        const text = table.textContent || '';
        
        // Buscar patrones que indican lista completa
        const completeDeckPatterns = [
            /\d+\s+[A-Za-z]/,  // "4 Card Name"
            /Creatures.*\(\d+\)/i, // "Creatures (20)"
            /Sideboard.*\(\d+\)/i, // "Sideboard (15)"
            /75.*Cards.*Total/i // "75 Cards Total"
        ];
        
        const matchingPatterns = completeDeckPatterns.filter(pattern => pattern.test(text));
        
        return matchingPatterns.length >= 2;
    }

    /**
     * 📋 Verificar si contiene patrones de deck completo
     */
    containsCompleteDeckPattern(element) {
        const text = element.textContent || '';
        
        // Debe tener múltiples indicadores de deck list
        const hasQuantities = /\b\d+\s+[A-Za-z]/.test(text); // "4 Lightning Bolt"
        const hasCategoryTotals = /\(\d+\)/.test(text); // "(20)"
        const hasMultipleCards = (text.match(/\b\d+\s+[A-Z]/g) || []).length >= 10;
        
        return hasQuantities && hasCategoryTotals && hasMultipleCards;
    }

    /**
     * 🧮 Calcular tamaño real del mazo (cartas individuales)
     */
    calculateActualDeckSize(mainboard, sideboard) {
        const mainboardSize = mainboard.reduce((sum, card) => sum + (card.copies || 1), 0);
        const sideboardSize = sideboard.reduce((sum, card) => sum + (card.copies || 1), 0);
        return mainboardSize + sideboardSize;
    }

    /**
     * 🧮 Calcular total de cartas únicas
     */
    calculateTotalCards(mainboard, sideboard) {
        return mainboard.length + sideboard.length;
    }

    /**
     * 🔑 Identificar cartas clave del mazo
     */
    identifyKeyCards(mainboard) {
        if (!mainboard || mainboard.length === 0) return [];
        
        // Ordenar por relevancia y cantidad
        return mainboard
            .filter(card => card.name && card.name.length > 2)
            .sort((a, b) => {
                // Priorizar cartas exactas sobre estimadas
                if (a.source === 'exact' && b.source !== 'exact') {
                    return -1;
                } else if (b.source === 'exact' && a.source !== 'exact') {
                    return 1;
                } else {
                    return (b.weight || 0) - (a.weight || 0);
                }
            })
            .slice(0, 8)
            .map(card => card.name);
    }

    /**
     * 🎨 Inferir colores desde cartas (solo tierras básicas universales)
     */
    inferColorsFromCards(mainboard) {
        const colors = new Set();
        
        for (const card of mainboard) {
            const name = card.name.toLowerCase();
            
            // Solo tierras básicas universales (nunca cambian)
            if (name === 'mountain') colors.add('R');
            if (name === 'island') colors.add('U');
            if (name === 'swamp') colors.add('B');
            if (name === 'forest') colors.add('G');
            if (name === 'plains') colors.add('W');
        }
        
        return Array.from(colors);
    }

    /**
     * 🏗️ Inferir tipo de arquetipo (adaptado para ambos tipos de datos)
     */
    inferArchetypeFromCards(mainboard) {
        if (!mainboard || mainboard.length === 0) return 'Mixed';
        
        // Análisis estadístico adaptado para cartas exactas y breakdown
        const totalCards = mainboard.length;
        
        // Para cartas exactas, usar la cantidad real de copias
        let highCopyCards = 0;
        let singleCopyCards = 0;
        
        for (const card of mainboard) {
            const copies = card.copies || 1;
            
            if (copies >= 3) {
                highCopyCards++;
            } else if (copies === 1) {
                singleCopyCards++;
            }
        }
        
        // Clasificar por distribución de cartas
        if (highCopyCards / totalCards > 0.4) {
            return 'Focused'; // Mazos con muchas copias múltiples = focused
        } else if (singleCopyCards / totalCards > 0.6) {
            return 'Toolbox'; // Mazos con muchos singles = toolbox
        } else {
            return 'Balanced'; // Distribución balanceada
        }
    }

    /**
     * ✅ Validar nombre de arquetipo
     */
    isValidArchetypeName(name) {
        if (!name || name.length < 3) return false;
        
        // Términos que NO deben aparecer en nombres válidos
        const invalidTerms = ['price', 'cost', 'budget', 'login', 'register', 'more'];
        const nameLower = name.toLowerCase();
        
        return !invalidTerms.some(term => nameLower.includes(term));
    }

    /**
     * ✅ Validar nombre de carta
     */
    isValidCardName(name) {
        if (!name || name.length < 2) return false;
        
        // Términos que NO son nombres de cartas
        const invalidTerms = ['price', 'more', 'view', 'total', 'cards'];
        const nameLower = name.toLowerCase();
        
        return !invalidTerms.some(term => nameLower.includes(term));
    }

    /**
     * 🧹 Limpiar nombre de carta (solo limpieza estructural)
     */
    cleanCardName(name) {
        if (!name) return '';
        
        return name
            .trim()
            .replace(/^\d+\s*/, '') // Remover números iniciales
            .replace(/\s+/g, ' ') // Normalizar espacios
            .replace(/[""'']/g, '') // Remover comillas tipográficas
            .trim();
    }

    /**
     * 🧹 Limpiar texto genérico (solo limpieza estructural)
     */
    cleanText(text) {
        if (!text) return '';
        
        return text
            .trim()
            .replace(/\s+/g, ' ') // Normalizar espacios
            .replace(/^\d+\.\s*/, '') // Remover numeración inicial
            .replace(/\$[\d,\.]+/g, '') // Remover precios
            .trim();
    }

    /**
     * ⏱️ Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 🖼️ Cargar cache de imágenes
     */
    loadImageCache() {
        try {
            const cached = localStorage.getItem('mtggoldfish_image_cache');
            return cached ? JSON.parse(cached) : {};
        } catch {
            return {};
        }
    }

    /**
     * 💾 Guardar cache de imágenes
     */
    saveImageCache() {
        try {
            localStorage.setItem('mtggoldfish_image_cache', JSON.stringify(this.imageCache));
        } catch (error) {
            this.logError('Error guardando cache de imágenes:', error);
        }
    }

    /**
     * 🌐 Fetch con proxy y fallbacks
     */
    async fetchWithProxy(url) {
        this.log(`🌐 Fetching: ${url}`);
        
        // Intentar fetch directo primero
        try {
            const response = await fetch(url, { 
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (response.ok) {
                const html = await response.text();
                if (html && html.length > 500) {
                    this.log(`✅ Fetch directo exitoso: ${html.length} caracteres`);
                    return html;
                }
            }
        } catch (error) {
            this.log(`⚠️ Fetch directo falló: ${error.message}`);
        }
        
        // Usar proxies CORS
        for (const proxy of this.corsProxies) {
            try {
                this.log(`🔄 Intentando proxy: ${proxy}`);
                
                const proxyUrl = proxy + encodeURIComponent(url);
                const response = await fetch(proxyUrl, { timeout: this.timeout });
                
                if (response.ok) {
                    const html = await response.text();
                    if (html && html.length > 500) {
                        this.log(`✅ Proxy exitoso: ${html.length} caracteres`);
                        return html;
                    }
                }
            } catch (proxyError) {
                this.logError(`❌ Error con proxy ${proxy}:`, proxyError);
                continue;
            }
        }
        
        throw new Error('Todos los métodos de fetch fallaron');
    }

    log(message) {
        if (this.debugMode) {
            console.log(`🐟 [DeckListScraper] ${message}`);
        }
    }

    logError(message, error) {
        console.error(`❌ [DeckListScraper] ${message}`, error);
    }
}

// Exportar la clase
export default MTGGoldfishCompleteScraper;