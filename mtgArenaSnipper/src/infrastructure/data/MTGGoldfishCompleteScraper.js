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
                    sum + (deck.mainboard?.length || 0), 0),
                decks: completeDecks
            };

            this.log(`✅ Scraping completo: ${completeDecks.length} arquetipos con ${finalData.totalRealCards} cartas totales`);
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
                
                this.log(`✅ ${archetype.name}: ${completeDeck.totalCards || 0} cartas del breakdown`);

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
            
            if (!deckList.mainboard || deckList.mainboard.length === 0) {
                throw new Error('No se encontró Card Breakdown válido en el arquetipo');
            }
            
            this.log(`✅ Card Breakdown: ${deckList.mainboard.length} mainboard, ${deckList.sideboard.length} sideboard`);
            
            // Construir objeto completo del mazo
            return {
                ...archetype,
                mainboard: deckList.mainboard,
                sideboard: deckList.sideboard,
                keyCards: this.identifyKeyCards(deckList.mainboard),
                totalCards: deckList.mainboard.length + deckList.sideboard.length,
                colors: this.inferColorsFromCards(deckList.mainboard),
                archetype: this.inferArchetypeFromCards(deckList.mainboard),
                source: 'MTGGoldfish-CardBreakdown',
                hasRealCards: true,
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
                throw new Error('Card Breakdown no encontrado');
            }
            
            this.log(`📊 Breakdown parseado: ${deckList.mainboard.length} mainboard, ${deckList.sideboard.length} sideboard`);
            return deckList;
            
        } catch (error) {
            this.logError('Error parseando Card Breakdown:', error);
            throw error;
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
                
                // Fallback a querySelector
                const elements = doc.querySelectorAll('h1, h2, h3, h4, div, section');
                for (const element of elements) {
                    if (element.textContent && element.textContent.includes(searchText)) {
                        this.log(`✅ Breakdown encontrado con fallback: "${searchText}"`);
                        
                        let container = element;
                        for (let i = 0; i < 5; i++) {
                            if (!container.parentElement) break;
                            container = container.parentElement;
                            if (container.textContent && container.textContent.length > 1500) {
                                return container;
                            }
                        }
                        return element.parentElement || element;
                    }
                }
            }
        }
        
        this.log('❌ No se encontró sección Card Breakdown con ningún método');
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
            'in % of decks', // Patrón de estadísticas
            'in 100% of decks', // Patrón común
            'in 90% of decks', // Otro patrón común
            'copies', // Indicador de cantidad
            'average', // Estadística promedio
            'most popular', // Texto común en breakdowns
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
            
            // ESTRATEGIA 2: Si no encontramos suficientes categorías, parsear por texto
            if (Object.keys(categories).length < 3) {
                this.log('🔄 Pocas categorías encontradas, intentando parsing por texto...');
                const textCategories = this.parseBreakdownByText(breakdownSection);
                Object.assign(categories, textCategories);
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
     * 📝 Parsear breakdown por texto cuando fallan los headers (completamente genérico)
     */
    parseBreakdownByText(breakdownSection) {
        this.log('📝 Parseando breakdown por texto...');
        const categories = {};
        
        if (!breakdownSection.textContent) return categories;
        
        const fullText = breakdownSection.textContent;
        
        // Categorías universales de MTG (nunca cambian)
        const universalCategories = [
            'Creatures', 'Spells', 'Artifacts', 'Enchantments', 
            'Lands', 'Planeswalkers', 'Sideboard'
        ];
        
        for (let i = 0; i < universalCategories.length; i++) {
            const category = universalCategories[i];
            const nextCategory = universalCategories[i + 1];
            
            const categoryIndex = fullText.toLowerCase().indexOf(category.toLowerCase());
            if (categoryIndex === -1) continue;
            
            const nextCategoryIndex = nextCategory ? 
                fullText.toLowerCase().indexOf(nextCategory.toLowerCase(), categoryIndex + 1) : 
                fullText.length;
            
            const sectionText = fullText.substring(
                categoryIndex, 
                nextCategoryIndex === -1 ? fullText.length : nextCategoryIndex
            );
            
            // Solo incluir si la sección tiene contenido significativo
            if (sectionText.length > 50 && this.containsCardPatterns(sectionText)) {
                // Crear elemento temporal con el texto
                const tempDiv = document.createElement('div');
                tempDiv.textContent = sectionText;
                categories[category] = tempDiv;
                
                this.log(`📝 Sección por texto: ${category} (${sectionText.length} chars)`);
            }
        }
        
        return categories;
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
     * 🔑 Identificar cartas clave (completamente dinámico)
     */
    identifyKeyCards(mainboard) {
        if (!mainboard || mainboard.length === 0) return [];
        
        return mainboard
            .filter(card => {
                // Solo basado en estadísticas del scraping web
                const hasHighUsage = card.percentage >= 75; // 75%+ de mazos
                const hasMultipleCopies = card.copies >= 2;
                const isFrequentlyUsed = card.weight >= 80;
                
                return hasHighUsage || hasMultipleCopies || isFrequentlyUsed;
            })
            .sort((a, b) => b.weight - a.weight)
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
     * 🏗️ Inferir tipo de arquetipo (completamente genérico)
     */
    inferArchetypeFromCards(mainboard) {
        if (!mainboard || mainboard.length === 0) return 'Mixed';
        
        // Análisis puramente estadístico sin nombres hardcodeados
        const totalCards = mainboard.length;
        const highCopyCards = mainboard.filter(card => card.copies >= 3).length;
        const singleCopyCards = mainboard.filter(card => card.copies === 1).length;
        
        // Clasificar por distribución de cartas
        if (highCopyCards / totalCards > 0.4) {
            return 'Focused'; // Mazos con muchas copias = focused
        } else if (singleCopyCards / totalCards > 0.6) {
            return 'Toolbox'; // Mazos con singles = toolbox
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
     * 🏝️ Verificar si es tierra básica (solo nombres universales que nunca cambian)
     */
    isBasicLand(cardName) {
        const name = cardName.toLowerCase().trim();
        const basicLands = ['mountain', 'island', 'plains', 'swamp', 'forest'];
        return basicLands.includes(name);
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