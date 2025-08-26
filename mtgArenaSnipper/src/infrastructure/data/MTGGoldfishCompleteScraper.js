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
     * 🐟 MÉTODO PRINCIPAL - Scraping completo de arquetipos con cartas reales
     */
    async scrapeCompleteMetaData() {
        try {
            this.log('🐟 Iniciando scraping completo de MTGGoldfish...');
            
            // 1. Extraer arquetipos desde archetype-tile elements
            const archetypes = await this.scrapeArchetypeUrls();
            
            if (!archetypes || archetypes.length === 0) {
                throw new Error('No se pudieron obtener arquetipos desde tiles');
            }

            this.log(`📋 Encontrados ${archetypes.length} arquetipos, scrapeando breakdowns...`);

            // 2. Scrapear Card Breakdown de cada arquetipo
            const completeDecks = await this.scrapeAllArchetypeBreakdowns(archetypes);

            const finalData = {
                lastUpdated: new Date().toISOString(),
                format: 'standard',
                source: 'MTGGoldfish-ArchetypeTiles',
                deckCount: completeDecks.length,
                totalRealCards: completeDecks.reduce((sum, deck) => 
                    sum + (deck.totalCardsInDeck || deck.totalCards || 0), 0),
                totalUniqueCards: completeDecks.reduce((sum, deck) => 
                    sum + (deck.totalCards || 0), 0),
                decks: completeDecks
            };

            this.log(`✅ Scraping completo: ${completeDecks.length} arquetipos`);
            this.log(`📊 Total: ${finalData.totalUniqueCards} cartas únicas, ${finalData.totalRealCards} cartas en mazos`);
            return finalData;

        } catch (error) {
            this.logError('❌ Error en scraping completo:', error);
            throw error;
        }
    }

    /**
     * 🔍 PASO 1: Extraer arquetipos desde archetype-tile elements
     */
    async scrapeArchetypeUrls() {
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
                
                // Procesar sideboard (categoría universal)
                if (categories['Sideboard']) {
                    const sideboardCards = this.parseCardsFromCategory(categories['Sideboard']);
                    deckList.sideboard.push(...sideboardCards);
                    this.log(`📋 Sideboard: ${sideboardCards.length} cartas`);
                }
                
            } else {
                this.log('❌ No se encontró sección Card Breakdown');
            }
            
            this.log(`📊 Breakdown parseado: ${deckList.mainboard.length} mainboard, ${deckList.sideboard.length} sideboard`);
            return deckList;
            
        } catch (error) {
            this.logError('Error parseando Card Breakdown:', error);
            return { mainboard: [], sideboard: [] };
        }
    }

    /**
     * 📋 Parsear lista completa del mazo (75 cartas exactas) - CON DEBUG MEJORADO
     */
    parseCompleteDeckList(html) {
        this.log('🎯 Parseando lista completa del mazo (75 cartas)...');
        
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const deckList = {
                mainboard: [],
                sideboard: []
            };
            
            // DEBUG: Buscar texto específico de deck lists
            this.log('🔍 DEBUG: Buscando indicadores de deck list...');
            const hasCreatures = html.includes('Creatures (');
            const hasSpells = html.includes('Spells (');
            const hasLands = html.includes('Lands (');
            const hasSideboard = html.includes('Sideboard (');
            const hasTotal = html.includes('Cards Total');
            
            this.log(`🔍 Indicadores encontrados: Creatures=${hasCreatures}, Spells=${hasSpells}, Lands=${hasLands}, Sideboard=${hasSideboard}, Total=${hasTotal}`);
            
            // Buscar la sección del deck list completo
            const deckListSection = this.findCompleteDeckSection(doc);
            
            if (deckListSection) {
                this.log('✅ Sección de lista completa encontrada');
                this.log(`📝 Texto de sección: ${deckListSection.textContent.length} caracteres`);
                
                // Extraer cartas organizadas por categorías
                const deckCategories = this.parseCompleteDeckCategories(deckListSection);
                
                this.log(`🗂️ Categorías parseadas: ${Object.keys(deckCategories).length}`);
                Object.keys(deckCategories).forEach(cat => {
                    this.log(`  📋 ${cat}: disponible`);
                });
                
                // Procesar categorías del mainboard
                const mainboardCategories = ['Creatures', 'Spells', 'Artifacts', 'Enchantments', 'Lands', 'Planeswalkers'];
                
                for (const category of mainboardCategories) {
                    if (deckCategories[category]) {
                        this.log(`🎯 Procesando categoría: ${category}`);
                        const categoryCards = this.parseExactCardsFromCategory(deckCategories[category], category);
                        deckList.mainboard.push(...categoryCards);
                        this.log(`🎯 ${category}: ${categoryCards.length} cartas extraídas`);
                    } else {
                        this.log(`⚠️ Categoría ${category} no encontrada`);
                    }
                }
                
                // Procesar sideboard
                if (deckCategories['Sideboard']) {
                    this.log(`🎯 Procesando sideboard...`);
                    const sideboardCards = this.parseExactCardsFromCategory(deckCategories['Sideboard'], 'Sideboard');
                    deckList.sideboard.push(...sideboardCards);
                    this.log(`🎯 Sideboard: ${sideboardCards.length} cartas extraídas`);
                } else {
                    this.log(`⚠️ Sideboard no encontrado`);
                }
                
            } else {
                this.log('⚠️ No se encontró sección de lista completa');
                
                // DEBUG ADICIONAL: Buscar texto manualmente
                if (html.includes('Creatures (')) {
                    this.log('🔍 ENCONTRADO "Creatures (" en HTML - problema en findCompleteDeckSection');
                    // Intentar parsing directo del HTML completo
                    const directParsed = this.parseCompleteDeckFromFullHTML(html);
                    deckList.mainboard.push(...directParsed.mainboard);
                    deckList.sideboard.push(...directParsed.sideboard);
                }
            }
            
            this.log(`🎯 Lista completa parseada: ${deckList.mainboard.length} mainboard, ${deckList.sideboard.length} sideboard`);
            return deckList;
            
        } catch (error) {
            this.logError('Error parseando lista completa del mazo:', error);
            return { mainboard: [], sideboard: [] };
        }
    }

    /**
     * 📝 Parsing directo desde HTML completo (fallback)
     */
    parseCompleteDeckFromFullHTML(html) {
        this.log('🔍 FALLBACK: Parsing directo desde HTML completo...');
        
        const deckList = {
            mainboard: [],
            sideboard: []
        };
        
        // Buscar secciones por texto directamente
        const categories = ['Creatures', 'Spells', 'Artifacts', 'Enchantments', 'Lands', 'Planeswalkers', 'Sideboard'];
        
        for (const category of categories) {
            const categoryPattern = new RegExp(`${category}\\s*\\((\\d+)\\)([\\s\\S]*?)(?=${categories.join('|')}\\s*\\(|$)`, 'i');
            const match = html.match(categoryPattern);
            
            if (match) {
                const categoryText = match[2];
                this.log(`🔍 Encontrada categoría ${category} con texto de ${categoryText.length} chars`);
                
                // Crear elemento temporal para el parsing
                const tempDiv = document.createElement('div');
                tempDiv.textContent = categoryText;
                
                const categoryCards = this.parseExactCardsFromCategory(tempDiv, category);
                
                if (category === 'Sideboard') {
                    deckList.sideboard.push(...categoryCards);
                } else {
                    deckList.mainboard.push(...categoryCards);
                }
                
                this.log(`🔍 ${category}: ${categoryCards.length} cartas extraídas`);
            }
        }
        
        return deckList;
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
                        
                        this.log(`📍 Nivel ${i + 1}: ${container.tagName}, texto: ${textLength} chars`);
                        
                        // Buscar contenedor que tenga suficiente contenido del breakdown
                        if (textLength > 2000 && this.containsCardBreakdownStructure(container)) {
                            this.log(`✅ Contenedor encontrado en nivel ${i + 1}: ${container.tagName}`);
                            return container;
                        }
                    }
                    
                    // Si no encontramos un contenedor grande, usar el elemento original
                    this.log(`⚠️ Usando elemento original como fallback`);
                    return result.singleNodeValue.parentElement || result.singleNodeValue;
                }
                
            } catch (xpathError) {
                this.log(`⚠️ Error con XPath para "${searchText}": ${xpathError.message}`);
            }
        }
        
        this.log('❌ No se encontró sección Card Breakdown con ningún método');
        return null;
    }

    /**
     * 🔍 Encontrar sección de lista completa del mazo - MEJORADO
     */
    findCompleteDeckSection(doc) {
        this.log('🔍 Buscando sección de lista completa del mazo...');
        
        // ESTRATEGIA 1: Buscar por texto específico de deck lists
        const deckListTexts = [
            '75 Cards Total',
            'Cards Total', 
            'Creatures (',
            'Spells (',
            'Lands ('
        ];
        
        for (const searchText of deckListTexts) {
            const elements = doc.querySelectorAll('*');
            for (const element of elements) {
                if (element.textContent && element.textContent.includes(searchText)) {
                    this.log(`✅ Lista encontrada por texto: "${searchText}"`);
                    
                    // Buscar contenedor padre que tenga toda la lista
                    let container = element;
                    for (let i = 0; i < 6; i++) {
                        if (!container.parentElement) break;
                        container = container.parentElement;
                        
                        const text = container.textContent || '';
                        const hasCategories = this.hasAllDeckCategories(text);
                        const hasCardQuantities = (text.match(/^\d+\s+[A-Za-z]/gm) || []).length >= 30;
                        
                        if (hasCategories && hasCardQuantities) {
                            this.log(`✅ Contenedor completo encontrado: ${container.tagName}`);
                            return container;
                        }
                    }
                }
            }
        }
        
        // ESTRATEGIA 2: Buscar por estructura HTML específica
        const deckContainers = [
            '.deck-view-deck-table',
            '.archetype-deck-list', 
            '.deck-list',
            '.deck-container'
        ];
        
        for (const selector of deckContainers) {
            const element = doc.querySelector(selector);
            if (element && this.hasAllDeckCategories(element.textContent)) {
                this.log(`✅ Lista encontrada por selector: ${selector}`);
                return element;
            }
        }
        
        // ESTRATEGIA 3: Buscar el contenedor más grande que tenga estructura de deck
        const allElements = doc.querySelectorAll('div, section, table, main');
        let bestCandidate = null;
        let bestScore = 0;
        
        for (const element of allElements) {
            const score = this.calculateDeckListScore(element);
            if (score > bestScore && score >= 5) {
                bestScore = score;
                bestCandidate = element;
            }
        }
        
        if (bestCandidate) {
            this.log(`✅ Mejor candidato encontrado con score: ${bestScore}`);
            return bestCandidate;
        }
        
        this.log('❌ No se encontró sección de lista completa');
        return null;
    }

    /**
     * 🎯 Verificar si tiene todas las categorías de deck
     */
    hasAllDeckCategories(text) {
        if (!text) return false;
        
        const text_lower = text.toLowerCase();
        const requiredCategories = [
            'creatures (',
            'spells (',
            'lands (',
            'sideboard ('
        ];
        
        const foundCategories = requiredCategories.filter(cat => 
            text_lower.includes(cat)
        );
        
        return foundCategories.length >= 3; // Al menos 3 categorías principales
    }

    /**
     * 🎯 Calcular score de probabilidad de ser deck list
     */
    calculateDeckListScore(element) {
        const text = element.textContent || '';
        let score = 0;
        
        // +2 por cada categoría principal
        const categories = ['Creatures (', 'Spells (', 'Artifacts (', 'Enchantments (', 'Lands (', 'Sideboard ('];
        categories.forEach(cat => {
            if (text.includes(cat)) score += 2;
        });
        
        // +1 por patrones de cartas con cantidad
        const cardMatches = text.match(/^\d+\s+[A-Za-z][A-Za-z\s,'-]+\s*\$/gm) || [];
        score += Math.min(cardMatches.length / 10, 3); // Max 3 puntos
        
        // +2 si menciona "75 Cards"
        if (text.includes('75 Cards')) score += 2;
        
        // +1 si tiene precios
        const priceMatches = text.match(/\$\s*\d+\.\d+/g) || [];
        if (priceMatches.length > 20) score += 1;
        
        return score;
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
            
            const currentMatch = fullText.match(currentCategory.pattern);
            if (!currentMatch) continue;
            
            const startIndex = currentMatch.index;
            let endIndex = fullText.length;
            
            // Buscar el final de esta sección (inicio de la siguiente)
            for (let j = i + 1; j < categoryPatterns.length; j++) {
                const futureCategory = categoryPatterns[j];
                const futureMatch = fullText.match(futureCategory.pattern);
                if (futureMatch && futureMatch.index > startIndex) {
                    endIndex = futureMatch.index;
                    break;
                }
            }
            
            // También buscar por "75 Cards Total" como fin
            const totalMatch = fullText.match(/\d+\s+Cards\s+Total/i);
            if (totalMatch && totalMatch.index > startIndex && totalMatch.index < endIndex) {
                endIndex = totalMatch.index;
            }
            
            // Extraer texto de esta categoría
            const sectionText = fullText.substring(startIndex, endIndex).trim();
            
            if (sectionText.length > 20) {
                // Crear elemento temporal con el texto
                const tempDiv = document.createElement('div');
                tempDiv.textContent = sectionText;
                categories[currentCategory.name] = tempDiv;
                
                this.log(`🗂️ ${currentCategory.name}: Sección de ${sectionText.length} caracteres extraída`);
                this.log(`📋 Preview: ${sectionText.substring(0, 100)}...`);
            }
        }
        
        this.log(`🗂️ Categorías extraídas: ${Object.keys(categories).join(', ')}`);
        return categories;
    }

    /**
     * 🎯 Buscar contenido de cartas para una categoría específica
     */
    findCategoryCardsContent(header, expectedCount) {
        // Buscar siguiente elemento que contenga las cartas
        let contentElement = header.nextElementSibling;
        let attempts = 0;
        
        while (contentElement && attempts < 10) {
            const text = contentElement.textContent || '';
            const cardMatches = text.match(/^\d+\s+[A-Za-z]/gm) || [];
            
            this.log(`🎯 Evaluando contenido: ${cardMatches.length} cartas encontradas vs ${expectedCount} esperadas`);
            
            // Si el número de cartas coincide aproximadamente
            if (cardMatches.length >= Math.floor(expectedCount * 0.8)) {
                this.log(`✅ Contenido de categoría encontrado: ${cardMatches.length} cartas`);
                return contentElement;
            }
            
            contentElement = contentElement.nextElementSibling;
            attempts++;
        }
        
        // Fallback: usar el elemento padre si contiene las cartas
        if (header.parentElement && header.parentElement.textContent) {
            const parentText = header.parentElement.textContent;
            const parentMatches = parentText.match(/^\d+\s+[A-Za-z]/gm) || [];
            
            if (parentMatches.length >= expectedCount * 0.5) {
                this.log(`🔄 Usando elemento padre como contenido`);
                return header.parentElement;
            }
        }
        
        return null;
    }

    /**
     * 🏗️ Verificar si el contenedor tiene estructura de Card Breakdown
     */
    containsCardBreakdownStructure(container) {
        if (!container || !container.textContent) return false;
        
        const text = container.textContent.toLowerCase();
        
        // Buscar indicadores estructurales de breakdown (sin nombres específicos)
        const structuralIndicators = [
            'in % of decks',
            'in 100% of decks',
            'in 90% of decks',
            'copies',
            'average',
            'most popular',
        ];
        
        // Buscar palabras que indican categorías de cartas (genéricas)
        const categoryWords = [
            'creatures',
            'spells', 
            'artifacts',
            'enchantments',
            'lands',
            'sideboard',
            'planeswalkers'
        ];
        
        const foundStructuralIndicators = structuralIndicators.filter(indicator => 
            text.includes(indicator)
        );
        
        const foundCategoryWords = categoryWords.filter(category => 
            text.includes(category)
        );
        
        const hasBreakdownStructure = foundStructuralIndicators.length >= 1;
        const hasMultipleCategories = foundCategoryWords.length >= 2;
        
        this.log(`📋 Indicadores estructurales: ${foundStructuralIndicators.length}`);
        this.log(`📋 Categorías encontradas: ${foundCategoryWords.length} (${foundCategoryWords.join(', ')})`);
        
        return hasBreakdownStructure && hasMultipleCategories;
    }

    /**
     * 📋 Parsear categorías del breakdown (completamente genérico)
     */
    parseBreakdownCategories(breakdownSection) {
        this.log('📋 Parseando categorías del breakdown...');
        const categories = {};
        
        if (!breakdownSection) {
            this.log('❌ breakdownSection is null');
            return categories;
        }
        
        try {
            // ESTRATEGIA 1: Buscar encabezados HTML
            const categoryHeaders = breakdownSection.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b, .category-header');
            this.log(`🔍 Encontrados ${categoryHeaders.length} posibles encabezados`);
            
            // Categorías universales de MTG (estructura estándar que nunca cambia)
            const universalCategories = [
                'Creatures', 'Spells', 'Artifacts', 'Enchantments', 
                'Lands', 'Planeswalkers', 'Sideboard'
            ];
            
            for (const header of categoryHeaders) {
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
            }
            
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
            
            this.log(`📍 Evaluando contenido nivel ${attempts}: ${contentElement.tagName}, ${textLength} chars`);
            
            // Si tiene suficiente texto y contiene patrones de cartas
            if (textLength > 50 && this.containsCardPatterns(contentElement.textContent)) {
                this.log(`✅ Contenido encontrado: ${contentElement.tagName}`);
                return contentElement;
            }
            
            contentElement = contentElement.nextElementSibling;
            attempts++;
        }
        
        // Fallback: usar el parent del header si no encontramos contenido específico
        if (header.parentElement && header.parentElement.textContent.length > 200) {
            this.log(`🔄 Usando parent como fallback para contenido`);
            return header.parentElement;
        }
        
        this.log(`⚠️ No se encontró contenido para header`);
        return null;
    }

    /**
     * 🃏 Parsear cartas desde categoría (completamente dinámico)
     */
    parseCardsFromCategory(categoryElement) {
        const cards = [];
        const text = categoryElement.textContent;
        
        this.log(`🔍 DEBUG: Parseando categoría con ${text.length} caracteres`);
        
        // Patrones para extraer cartas del breakdown (sin nombres hardcodeados)
        const cardPatterns = [
            // Patrón principal: "Card Name\n4.0 in 100% of decks"
            /([A-Za-z][A-Za-z\s,''-]+?)\s*[\n\r]+\s*(\d+\.?\d*)\s+in\s+(\d+)%\s+of\s+decks/gm,
            // Patrón alternativo: "Card Name 4.0 in 100% of decks"  
            /([A-Za-z][A-Za-z\s,''-]+?)\s+(\d+\.?\d*)\s+in\s+(\d+)%\s+of\s+decks/gm,
            // Patrón flexible: cualquier carta con porcentaje
            /([A-Za-z'][A-Za-z\s,''\-]+?)\s*(\d+\.?\d*)\s*in\s+(\d+)%/gm
        ];
        
        for (const pattern of cardPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const cardName = this.cleanCardName(match[1]);
                const avgCopies = parseFloat(match[2]) || 1;
                const percentage = parseInt(match[3]) || 0;
                
                // Validaciones puramente estructurales
                if (this.isValidCardName(cardName)) {
                    const card = {
                        name: cardName,
                        copies: Math.round(avgCopies),
                        percentage,
                        weight: percentage * avgCopies
                    };
                    
                    cards.push(card);
                    this.log(`  📄 ${cardName}: ${avgCopies} copias, ${percentage}%`);
                }
            }
            
            // Si encontramos cartas, no necesitamos otros patrones
            if (cards.length > 0) break;
        }
        
        return cards;
    }

    /**
     * 🃏 Parsear cartas exactas desde categoría - COMPLETAMENTE MEJORADO
     */
    parseExactCardsFromCategory(categoryElement, categoryName) {
        const cards = [];
        const text = categoryElement.textContent;
        
        this.log(`🃏 Parseando cartas exactas de ${categoryName}...`);
        this.log(`📝 Texto disponible: ${text.length} caracteres`);
        this.log(`📝 Preview: ${text.substring(0, 200)}...`);
        
        // Limpiar texto y dividir en líneas
        const lines = text
            .split(/[\n\r]+/)
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        this.log(`📝 Líneas encontradas: ${lines.length}`);
        
        // Patrones mejorados para diferentes formatos de MTGGoldfish
        const exactCardPatterns = [
            // Patrón principal: "4 Lightning Bolt $ 2.50"
            /^(\d+)\s+([A-Za-z][A-Za-z\s,''\-\.]+?)\s*\$\s*([\d,]+\.?\d+)/,
            
            // Patrón sin precio: "4 Lightning Bolt"
            /^(\d+)\s+([A-Za-z][A-Za-z\s,''\-\.]+?)$/,
            
            // Patrón con precio pegado: "4Lightning Bolt$ 2.50"
            /^(\d+)([A-Za-z][A-Za-z\s,''\-\.]+?)\$\s*([\d,]+\.?\d+)/,
            
            // Patrón flexible: detectar número + nombre + opcional precio
            /^(\d+)\s*([A-Za-z'][A-Za-z\s,''\-\.&]+?)(?:\s*\$\s*([\d,]+\.?\d+))?$/
        ];
        
        for (const line of lines) {
            // Saltar líneas que son headers o categorías
            if (/^(Creatures|Spells|Artifacts|Enchantments|Lands|Planeswalkers|Sideboard)\s*\(/i.test(line)) {
                this.log(`⏭️  Saltando header: ${line}`);
                continue;
            }
            
            // Saltar líneas de totales
            if (/Cards\s+Total/i.test(line)) {
                this.log(`⏭️  Saltando total: ${line}`);
                continue;
            }
            
            let cardFound = false;
            
            for (const pattern of exactCardPatterns) {
                const match = line.match(pattern);
                
                if (match) {
                    const quantity = parseInt(match[1]);
                    const rawCardName = match[2];
                    const priceStr = match[3] || '0';
                    const price = parseFloat(priceStr.replace(',', '')) || 0;
                    
                    // Limpiar nombre de carta
                    const cardName = this.cleanCardName(rawCardName);
                    
                    // Validaciones
                    if (quantity > 0 && quantity <= 20 && this.isValidCardName(cardName)) {
                        const card = {
                            name: cardName,
                            copies: quantity,
                            category: categoryName,
                            price: price,
                            exact: true // Marca que es cantidad exacta
                        };
                        
                        cards.push(card);
                        this.log(`  ✅ ${quantity}x ${cardName}${price > 0 ? ` (${price})` : ''}`);
                        cardFound = true;
                        break;
                    } else {
                        this.log(`  ❌ Carta inválida: qty=${quantity}, name="${cardName}"`);
                    }
                }
            }
            
            if (!cardFound && line.length > 3) {
                this.log(`  ⚠️  Línea no parseada: "${line}"`);
            }
        }
        
        this.log(`🃏 ${categoryName}: ${cards.length} cartas exactas extraídas`);
        
        // Debug: mostrar algunas cartas extraídas
        cards.slice(0, 3).forEach(card => {
            this.log(`  📄 ${card.copies}x ${card.name} (${card.price})`);
        });
        
        return cards;
    }

    /**
     * 🔑 Identificar cartas clave (adaptado para ambos tipos de datos)
     */
    identifyKeyCards(mainboard) {
        if (!mainboard || mainboard.length === 0) return [];
        
        return mainboard
            .filter(card => {
                // Si es carta exacta del deck completo
                if (card.exact) {
                    return card.copies >= 2; // 2+ copias en deck exacto
                }
                
                // Si es del Card Breakdown (estadísticas)
                const hasHighUsage = card.percentage >= 75; // 75%+ de mazos
                const hasMultipleCopies = card.copies >= 2;
                const isFrequentlyUsed = card.weight >= 80;
                
                return hasHighUsage || hasMultipleCopies || isFrequentlyUsed;
            })
            .sort((a, b) => {
                // Ordenar por relevancia
                if (a.exact && b.exact) {
                    return b.copies - a.copies; // Más copias = más importante
                } else if (a.exact || b.exact) {
                    return a.exact ? -1 : 1; // Cartas exactas primero
                } else {
                    return (b.weight || 0) - (a.weight || 0); // Por peso estadístico
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
            .replace(/\([^)]*\)/g, '') // Remover contenido entre paréntesis
            .replace(/[""'']/g, '') // Remover comillas tipográficas
            .trim();
    }

    /**
     * ✅ Validar nombre de carta (solo validaciones estructurales)
     */
    isValidCardName(cardName) {
        if (!cardName) return false;
        
        const name = cardName.trim();
        
        // Validaciones puramente estructurales
        const hasMinLength = name.length >= 3;
        const hasMaxLength = name.length <= 50;
        const hasLetters = /[a-zA-Z]/.test(name);
        const isNotOnlySpaces = name.replace(/\s/g, '').length > 0;
        const isNotBasicLand = !this.isBasicLand(name);
        
        return hasMinLength && hasMaxLength && hasLetters && isNotOnlySpaces && isNotBasicLand;
    }

    /**
     * ✅ Validar nombre de arquetipo (completamente genérico)
     */
    isValidArchetypeName(name) {
        if (!name || name.length < 4 || name.length > 40) return false;
        
        // Validaciones puramente estructurales
        const hasMultipleWords = name.trim().split(/\s+/).length >= 2;
        const hasLetters = /[a-zA-Z]/.test(name);
        const isNotOnlyNumbers = !/^\d+$/.test(name.trim());
        const hasReasonableLength = name.length >= 5 && name.length <= 35;
        
        return hasMultipleWords && hasLetters && isNotOnlyNumbers && hasReasonableLength;
    }

    /**
     * 🏝️ Verificar si es tierra básica (para incluirlas en colores)
     */
    isBasicLand(cardName) {
        const name = cardName.toLowerCase().trim();
        const basicLands = ['mountain', 'island', 'plains', 'swamp', 'forest'];
        return basicLands.includes(name);
    }

    /**
     * 🧮 Calcular total de cartas únicas
     */
    calculateTotalCards(mainboard, sideboard) {
        return (mainboard?.length || 0) + (sideboard?.length || 0);
    }

    /**
     * 🧮 Calcular tamaño real del mazo (suma de todas las copias)
     */
    calculateActualDeckSize(mainboard, sideboard) {
        const mainboardSize = (mainboard || []).reduce((sum, card) => sum + (card.copies || 1), 0);
        const sideboardSize = (sideboard || []).reduce((sum, card) => sum + (card.copies || 1), 0);
        return mainboardSize + sideboardSize;
    }

    /**
     * 🔍 Verificar si el texto contiene patrones de cartas (genérico)
     */
    containsCardPatterns(text) {
        if (!text) return false;
        
        // Patrones estructurales para identificar breakdown de cartas
        const cardPatterns = [
            /\d+\.?\d*\s+in\s+\d+%\s+of\s+decks/i, // "4.0 in 100% of decks"
            /\d+\s+copies/i, // "4 copies"
            /\d+%\s+of\s+decks/i, // "90% of decks"
            /\d+\.?\d*\s+average/i // "3.5 average"
        ];
        
        return cardPatterns.some(pattern => pattern.test(text));
    }

    /**
     * 🖼️ Cargar cache de imágenes
     */
    loadImageCache() {
        try {
            return JSON.parse(localStorage.getItem('mtg_image_cache') || '{}');
        } catch {
            return {};
        }
    }

    /**
     * 💾 Guardar cache de imágenes
     */
    saveImageCache() {
        try {
            localStorage.setItem('mtg_image_cache', JSON.stringify(this.imageCache));
        } catch (error) {
            this.logError('Error guardando cache de imágenes:', error);
        }
    }

    // MÉTODOS UTILITARIOS

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchWithProxy(url) {
        this.log(`🌐 Fetching: ${url}`);
        
        // Intentar fetch directo primero
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                timeout: this.timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            
            if (!html || html.length < 500) {
                throw new Error('Respuesta muy corta o vacía');
            }

            this.log(`✅ Fetch exitoso: ${html.length} caracteres`);
            return html;

        } catch (error) {
            this.logError(`❌ Error en fetch directo:`, error);
            
            // Intentar con proxies CORS
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
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[MTGGoldfish] ${message}`);
        }
    }

    logError(message, error) {
        console.error(`[MTGGoldfish] ${message}`, error);
    }
}

// Exportar la clase
export default MTGGoldfishCompleteScraper;