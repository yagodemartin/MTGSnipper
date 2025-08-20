// src/infrastructure/data/MTGGoldfishCompleteScraper.js
// 🐟 Scraper 100% DINÁMICO - Todo desde MTGGoldfish Online

class MTGGoldfishCompleteScraper {
    constructor() {
        this.baseUrl = 'https://www.mtggoldfish.com';
        this.metaUrl = '/metagame/standard#paper';
        
        // Proxies CORS actualizados para 2025
        this.corsProxies = [
            // Proxies más confiables y actualizados
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://cors-anywhere.herokuapp.com/',
            'https://proxy.cors.sh/',
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://thingproxy.freeboard.io/fetch/',
            // Proxies alternativos
            'https://yacdn.org/proxy/',
            'https://cors.sh/',
            'https://api.codetabs.com/v1/proxy/?quest=',
            'https://cors.bridged.cc/'
        ];
        
        this.rateLimitDelay = 1500; // Delay entre requests
        this.timeout = 20000; // 20 segundos timeout
        this.maxDecks = 15; // Top 15 mazos
        this.debugMode = true;
    }

    /**
     * 🚀 Método principal: scrapear meta y listas dinámicamente
     */
    async scrapeCompleteMetaData() {
        try {
            this.log('🐟 Iniciando scraping 100% dinámico de MTGGoldfish...');
            this.log('📅 Buscando datos de los últimos 7 días...');

            // Paso 1: Scrapear meta general y obtener URLs de arquetipos
            const metaDecks = await this.scrapeMetaOverview();
            
            if (!metaDecks || metaDecks.length === 0) {
                throw new Error('No se pudieron obtener arquetipos del meta');
            }

            this.log(`📋 Encontrados ${metaDecks.length} arquetipos en el meta`);

            // Paso 2: Scrapear listas completas de cada arquetipo
            const completeDecks = await this.scrapeAllDeckLists(metaDecks);

            // Paso 3: Construir datos finales
            const finalData = {
                lastUpdated: new Date().toISOString(),
                scrapedAt: new Date().toISOString(),
                format: 'standard',
                source: 'MTGGoldfish-Dynamic-7Days',
                sourceUrl: this.baseUrl + this.metaUrl,
                deckCount: completeDecks.length,
                dataRange: 'Últimos 7 días (dinámico)',
                scrapingMethod: '100% online data extraction',
                decks: completeDecks
            };

            this.log(`✅ Scraping dinámico exitoso: ${completeDecks.length} mazos con listas reales`);
            return finalData;

        } catch (error) {
            this.logError('❌ Error en scraping dinámico:', error);
            throw error;
        }
    }

    /**
     * 📊 Paso 1: Scrapear overview del meta para obtener arquetipos y URLs
     */
    async scrapeMetaOverview() {
        try {
            this.log('📊 Scrapeando página principal del meta...');
            
            const html = await this.fetchWithCorsProxy(this.baseUrl + this.metaUrl);
            const archetyperUrls = this.extractArchetypeUrls(html);
            
            if (archetyperUrls.length === 0) {
                throw new Error('No se encontraron URLs de arquetipos');
            }

            this.log(`🔗 Encontradas ${archetyperUrls.length} URLs de arquetipos`);
            return archetyperUrls.slice(0, this.maxDecks);

        } catch (error) {
            this.logError('Error scrapeando meta overview:', error);
            throw error;
        }
    }

    /**
     * 🔗 Extraer URLs de arquetipos de la página del meta - MÉTODO ARREGLADO
     */
    extractArchetypeUrls(html) {
        try {
            this.log('🔍 Analizando HTML para extraer arquetipos...');
            this.log(`📄 Tamaño del HTML: ${html.length} caracteres`);

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const archetyperData = [];
            
            // ESTRATEGIA PRINCIPAL: Enlaces de archetype + porcentajes (basada en debug exitoso)
            this.log('🎯 Buscando enlaces de archetype con porcentajes...');
            
            const archetypeLinks = doc.querySelectorAll('a[href*="archetype"]');
            this.log(`🔗 Encontrados ${archetypeLinks.length} enlaces de archetype`);
            
            for (const link of archetypeLinks) {
                const href = link.getAttribute('href');
                const deckName = this.cleanText(link.textContent);
                
                // Filtrar enlaces válidos
                if (!deckName || deckName.length < 3 || deckName.length > 50 || !href) {
                    continue;
                }
                
                // Buscar porcentaje cerca de este enlace usando método mejorado
                const percentage = this.findPercentageInContextImproved(link);
                
                if (percentage && percentage > 0 && percentage <= 50) {
                    archetyperData.push({
                        id: this.generateDeckId(deckName),
                        name: deckName,
                        metaShare: percentage,
                        url: href,
                        extractedAt: new Date().toISOString()
                    });
                    
                    this.log(`📋 Arquetipo encontrado: ${deckName} (${percentage}%) -> ${href}`);
                }
            }
            
            // ESTRATEGIA FALLBACK: Si no encontramos suficientes mazos, usar regex
            if (archetyperData.length < 5) {
                this.log('🔄 Estrategia fallback: Regex en HTML...');
                const regexResults = this.extractWithRegexImproved(html);
                archetyperData.push(...regexResults);
            }
            
            // Eliminar duplicados por nombre
            const uniqueArchetypes = archetyperData.filter((deck, index, self) => 
                index === self.findIndex(d => d.name === deck.name)
            );
            
            // Ordenar por meta share
            uniqueArchetypes.sort((a, b) => b.metaShare - a.metaShare);
            
            // Actualizar ranks
            uniqueArchetypes.forEach((deck, index) => {
                deck.rank = index + 1;
            });
            
            this.log(`✅ Total de arquetipos únicos encontrados: ${uniqueArchetypes.length}`);
            
            if (uniqueArchetypes.length > 0) {
                uniqueArchetypes.slice(0, 5).forEach(deck => {
                    this.log(`  ${deck.rank}. ${deck.name} (${deck.metaShare}%)`);
                });
            }
            
            return uniqueArchetypes;

        } catch (error) {
            this.logError('Error extrayendo URLs de arquetipos:', error);
            throw error;
        }
    }

    /**
     * 🔄 NUEVA ESTRATEGIA 2: Extraer de todas las filas
     */
    extractFromAllRows(doc) {
        const archetyperData = [];
        
        // Buscar en todas las filas de tabla y divs que actúen como filas
        const allRows = doc.querySelectorAll('tr, div[class*="row"], div[class*="item"], li');
        this.log(`📊 Analizando ${allRows.length} elementos tipo fila...`);
        
        for (const row of allRows) {
            const rowText = row.textContent;
            
            // Buscar porcentaje en la fila
            const percentageMatch = rowText.match(/(\d+\.?\d*)\s*%/);
            if (!percentageMatch) continue;
            
            const percentage = parseFloat(percentageMatch[1]);
            if (percentage <= 0 || percentage > 50) continue;
            
            // Buscar enlaces en esta fila
            const links = row.querySelectorAll('a');
            for (const link of links) {
                const deckName = this.cleanText(link.textContent);
                const href = link.getAttribute('href') || '';
                
                // Verificar si parece un nombre de mazo válido
                if (this.looksLikeDeckName(deckName)) {
                    archetyperData.push({
                        id: this.generateDeckId(deckName),
                        name: deckName,
                        metaShare: percentage,
                        url: href,
                        extractedAt: new Date().toISOString()
                    });
                    
                    this.log(`📋 Mazo encontrado en fila: ${deckName} (${percentage}%)`);
                    break; // Solo tomar el primer enlace válido por fila
                }
            }
        }
        
        return archetyperData;
    }

    /**
     * 🔄 NUEVA ESTRATEGIA 3: Extraer con patrones de texto
     */
    extractWithTextPatterns(html) {
        const archetyperData = [];
        
        // Patrones para capturar nombres de mazos seguidos de porcentajes
        const patterns = [
            // Patrón 1: >Deck Name< seguido de porcentaje
            />([A-Z][a-zA-Z\s\-']{3,30})<[^%]*?(\d+\.?\d*)\s*%/g,
            // Patrón 2: "Deck Name" con cualquier delimitador seguido de porcentaje
            /([A-Z][a-z]+\s+[A-Z][a-z]+[a-zA-Z\s]*?)\s+(\d+\.?\d*)\s*%/g,
            // Patrón 3: href con archetype seguido de nombre y porcentaje
            /href="[^"]*archetype[^"]*"[^>]*>([^<]+)<[^%]*?(\d+\.?\d*)\s*%/gi
        ];
        
        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            this.log(`🔍 Probando patrón de texto ${i + 1}...`);
            
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const deckName = this.cleanText(match[1]);
                const metaShare = parseFloat(match[2]);
                
                if (this.looksLikeDeckName(deckName) && metaShare > 0 && metaShare <= 50) {
                    archetyperData.push({
                        id: this.generateDeckId(deckName),
                        name: deckName,
                        metaShare: metaShare,
                        url: '',
                        extractedAt: new Date().toISOString()
                    });
                    
                    this.log(`📋 Mazo encontrado con patrón: ${deckName} (${metaShare}%)`);
                }
            }
            
            if (archetyperData.length > 0) {
                this.log(`✅ Patrón ${i + 1} encontró ${archetyperData.length} mazos`);
                break; // Usar el primer patrón que funcione
            }
        }
        
        return archetyperData;
    }

    /**
     * 📊 Buscar porcentaje en contexto mejorado - MÉTODO ARREGLADO
     */
    findPercentageInContextImproved(linkElement) {
        // Método basado en el debug exitoso
        let current = linkElement;
        
        // Buscar en 8 niveles del DOM (más que antes)
        for (let level = 0; level < 8; level++) {
            if (!current) break;
            
            const text = current.textContent;
            const match = text.match(/(\d+\.?\d*)\s*%/);
            
            if (match) {
                const percentage = parseFloat(match[1]);
                if (percentage > 0 && percentage <= 50) {
                    return percentage;
                }
            }
            
            current = current.parentElement;
        }
        
        // También buscar en hermanos del elemento
        if (linkElement.parentElement) {
            const siblings = linkElement.parentElement.children;
            for (const sibling of siblings) {
                if (sibling === linkElement) continue;
                
                const text = sibling.textContent;
                const match = text.match(/(\d+\.?\d*)\s*%/);
                
                if (match) {
                    const percentage = parseFloat(match[1]);
                    if (percentage > 0 && percentage <= 50) {
                        return percentage;
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * 🔤 Estrategia regex mejorada - basada en debug exitoso
     */
    extractWithRegexImproved(html) {
        const archetyperData = [];
        
        // Patrón que funcionó en el debug: href con archetype + texto + porcentaje
        const pattern = /href="([^"]*archetype[^"]*)"[^>]*>([^<]+)<[^%]*?(\d+\.?\d*)\s*%/gi;
        let match;
        
        while ((match = pattern.exec(html)) !== null) {
            const url = match[1];
            const name = this.cleanText(match[2]);
            const percentage = parseFloat(match[3]);
            
            if (name.length > 3 && name.length < 50 && percentage > 0 && percentage <= 50) {
                archetyperData.push({
                    id: this.generateDeckId(name),
                    name: name,
                    metaShare: percentage,
                    url: url,
                    extractedAt: new Date().toISOString()
                });
                
                this.log(`📋 Mazo encontrado con regex: ${name} (${percentage}%)`);
            }
        }
        
        return archetyperData;
    }

    /**
     * 🎯 Verificar si un texto parece nombre de mazo - MÉTODO NUEVO
     */
    looksLikeDeckName(text) {
        if (!text || text.length < 3 || text.length > 50) return false;
        
        // Debe tener al menos una letra mayúscula
        if (!/[A-Z]/.test(text)) return false;
        
        // Debe tener al menos algunas letras
        if (!/[a-zA-Z]{3,}/.test(text)) return false;
        
        // Filtrar palabras comunes que NO son nombres de mazos
        const blacklist = [
            'home', 'contact', 'about', 'login', 'register', 'search', 'menu', 
            'click here', 'more', 'view all', 'next', 'previous', 'page',
            'tournament', 'event', 'date', 'player', 'deck tech', 'budget',
            'subscribe', 'follow', 'share', 'twitter', 'facebook', 'decks',
            'format', 'standard', 'modern', 'legacy', 'vintage', 'pioneer'
        ];
        
        const lowerText = text.toLowerCase();
        if (blacklist.some(word => lowerText.includes(word))) return false;
        
        // Debe tener al menos 2 palabras para ser un nombre de mazo típico
        const words = text.trim().split(/\s+/);
        if (words.length < 2) return false;
        
        return true;
    }

    // ============================================
    // RESTO DE MÉTODOS ORIGINALES (sin cambios)
    // ============================================

    /**
     * 🃏 Paso 2: Scrapear listas completas de todos los arquetipos
     */
    async scrapeAllDeckLists(archetyperData) {
        const completeDecks = [];
        
        this.log(`🃏 Scrapeando listas de ${archetyperData.length} arquetipos...`);
        
        for (let i = 0; i < archetyperData.length; i++) {
            const archetype = archetyperData[i];
            
            try {
                this.log(`📋 Procesando ${i + 1}/${archetyperData.length}: ${archetype.name}`);
                
                // Rate limiting para ser respetuosos
                if (i > 0) {
                    await this.sleep(this.rateLimitDelay);
                }
                
                const completeDeck = await this.scrapeSingleArchetype(archetype);
                completeDecks.push(completeDeck);
                
                this.log(`✅ ${archetype.name}: ${completeDeck.totalCards || 0} cartas extraídas`);

            } catch (error) {
                this.logError(`❌ Error scrapeando ${archetype.name}:`, error.message);
                
                // Añadir arquetipo básico si falla el scraping de cartas
                completeDecks.push({
                    ...archetype,
                    mainboard: [],
                    sideboard: [],
                    keyCards: [],
                    totalCards: 0,
                    scrapingError: error.message,
                    partialData: true
                });
            }
        }
        
        return completeDecks;
    }

    /**
     * 📋 Scrapear un arquetipo individual para obtener su lista de cartas
     */
    async scrapeSingleArchetype(archetype) {
        try {
            const archetypeUrl = this.baseUrl + archetype.url;
            this.log(`🔗 Scrapeando arquetipo: ${archetypeUrl}`);
            
            const html = await this.fetchWithCorsProxy(archetypeUrl);
            const deckList = this.parseArchetypePage(html);
            
            // Obtener colores reales de las cartas
            this.log(`🎨 Obteniendo colores reales para ${archetype.name}...`);
            const realColors = await this.inferColorsFromCards(deckList.mainboard || []);
            
            // Combinar datos del meta con lista de cartas
            const completeDeck = {
                ...archetype,
                ...deckList,
                totalCards: (deckList.mainboard?.length || 0) + (deckList.sideboard?.length || 0),
                listScrapedAt: new Date().toISOString(),
                // Usar colores reales obtenidos de APIs
                colors: realColors,
                archetype: this.inferArchetypeFromCards(deckList.mainboard || [])
            };
            
            return completeDeck;

        } catch (error) {
            this.logError(`Error scrapeando arquetipo ${archetype.name}:`, error);
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
                sideboard: [],
                keyCards: []
            };
            
            // Buscar tabla de cartas del deck
            const cardTables = doc.querySelectorAll('table');
            
            for (const table of cardTables) {
                const cards = this.parseCardTable(table);
                if (cards.length > 0) {
                    // Determinar si es mainboard o sideboard
                    const tableContext = this.getTableContext(table);
                    
                    if (tableContext.includes('sideboard')) {
                        deckList.sideboard.push(...cards);
                    } else {
                        deckList.mainboard.push(...cards);
                    }
                }
            }
            
            // Si no encontramos en tablas, buscar en divs/listas
            if (deckList.mainboard.length === 0) {
                this.log('📋 No se encontraron cartas en tablas, buscando en otros elementos...');
                const alternativeCards = this.parseAlternativeCardFormat(doc);
                deckList.mainboard.push(...alternativeCards);
            }
            
            // Identificar cartas clave (3+ copias, no tierras básicas)
            deckList.keyCards = this.identifyKeyCards(deckList.mainboard);
            
            this.log(`📊 Lista parseada: ${deckList.mainboard.length} main, ${deckList.sideboard.length} side, ${deckList.keyCards.length} key`);
            
            return deckList;

        } catch (error) {
            this.logError('Error parseando página de arquetipo:', error);
            throw error;
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
                // Extraer cantidad y nombre directamente de las celdas
                const quantity = parseInt(cells[0].textContent.trim());
                let cardName = this.cleanText(cells[1].textContent);
                cardName = this.cleanCardName(cardName);

                if (!cardName || isNaN(quantity) || quantity <= 0 || quantity > 4) {
                    return null;
                }

                return {
                    name: cardName,
                    quantity: quantity,
                    extractedAt: new Date().toISOString()
                };
            } else {
                // Fallback: usar el patrón original
                const rowText = row.textContent.trim();
                const cardPattern = /^(\d+)\s*x?\s+(.+)$/;
                const match = rowText.match(cardPattern);

                if (!match) return null;

                const quantity = parseInt(match[1]);
                let cardName = this.cleanText(match[2]);
                cardName = this.cleanCardName(cardName);

                if (!cardName || quantity <= 0 || quantity > 4) {
                    return null;
                }

                return {
                    name: cardName,
                    quantity: quantity,
                    extractedAt: new Date().toISOString()
                };
            }
        } catch (error) {
            return null;
        }
    }

    /**
     * 🧹 Limpiar nombre de carta (remover precios, sets, etc.)
     */
    cleanCardName(cardName) {
        if (!cardName) return '';
        
        // Remover información de precio ($X.XX)
        cardName = cardName.replace(/\$\d+\.?\d*/g, '');
        
        // Remover códigos de set entre paréntesis
        cardName = cardName.replace(/\([A-Z0-9]+\)/g, '');
        
        // Remover números de coleccionista (#XXX)
        cardName = cardName.replace(/#\d+/g, '');
        
        // Limpiar espacios extras
        cardName = cardName.replace(/\s+/g, ' ').trim();
        
        return cardName;
    }

    /**
     * 📋 Formato alternativo de cartas (si no están en tablas)
     */
    parseAlternativeCardFormat(doc) {
        const cards = [];
        
        // Buscar en elementos con clases relacionadas a cartas
        const cardElements = doc.querySelectorAll(
            '.deck-card, .card-entry, .decklist-card, [class*="card"], [class*="deck"]'
        );
        
        for (const element of cardElements) {
            const card = this.parseCardRow(element);
            if (card) {
                cards.push(card);
            }
        }
        
        return cards;
    }

    /**
     * 📊 Obtener contexto de una tabla (mainboard vs sideboard)
     */
    getTableContext(table) {
        // Buscar en elementos anteriores o padres
        let element = table.previousElementSibling;
        let context = '';
        let attempts = 0;
        
        while (element && attempts < 5) {
            context += element.textContent.toLowerCase() + ' ';
            element = element.previousElementSibling;
            attempts++;
        }
        
        // También buscar en el padre
        if (table.parentElement) {
            context += table.parentElement.textContent.toLowerCase();
        }
        
        return context;
    }

    /**
     * 🔑 Identificar cartas clave del mazo
     */
    identifyKeyCards(mainboard) {
        const keyCards = [];
        
        for (const card of mainboard) {
            // Cartas con 3+ copias y que no sean tierras básicas
            if (card.quantity >= 3 && !this.isBasicLand(card.name)) {
                keyCards.push({
                    name: card.name,
                    quantity: card.quantity,
                    weight: this.calculateCardWeight(card),
                    role: this.inferCardRole(card.name)
                });
            }
        }
        
        // Ordenar por peso (cantidad e importancia)
        keyCards.sort((a, b) => b.weight - a.weight);
        
        return keyCards.slice(0, 8); // Top 8 cartas clave
    }

    /**
     * ⚖️ Calcular peso de una carta (solo basado en cantidad y posición)
     */
    calculateCardWeight(card) {
        let weight = card.quantity * 20; // Base: cantidad * 20
        
        // Bonus por 4 copias (carta muy importante)
        if (card.quantity === 4) {
            weight += 20;
        }
        
        // Bonus por 3 copias
        if (card.quantity === 3) {
            weight += 10;
        }
        
        return Math.min(weight, 100); // Máximo 100
    }

    /**
     * 🎨 Inferir colores desde las cartas reales del mazo
     */
    async inferColorsFromCards(cards) {
        const colors = new Set();
        
        // Procesar solo las primeras 5-10 cartas para no hacer demasiadas requests
        const sampleCards = cards.slice(0, Math.min(10, cards.length));
        
        for (const card of sampleCards) {
            try {
                const cardColors = await this.detectCardColors(card.name);
                cardColors.forEach(color => colors.add(color));
                
                // Pequeño delay entre requests de cartas
                await this.sleep(200);
            } catch (error) {
                this.log(`⚠️ Error obteniendo colores para ${card.name}: ${error.message}`);
            }
        }
        
        return Array.from(colors);
    }

    /**
     * 🎨 Detectar colores de cartas usando solo datos reales online
     */
    async detectCardColors(cardName) {
        // Intentar obtener colores reales desde Scryfall
        const colors = await this.getCardColorsFromAPI(cardName);
        
        // Si no se encuentran en Scryfall, intentar desde MTGGoldfish
        if (colors.length === 0) {
            const mtgColors = await this.getCardColorsFromMTGGoldfish(cardName);
            return mtgColors;
        }
        
        return colors;
    }

    /**
     * 🎨 Obtener colores reales de una carta desde Scryfall API
     */
    async getCardColorsFromAPI(cardName) {
        try {
            this.log(`🔍 Buscando colores reales para: ${cardName}`);
            
            const response = await fetch(
                `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
            );
            
            if (response.ok) {
                const cardData = await response.json();
                const colors = cardData.colors || [];
                this.log(`✅ Colores encontrados para ${cardName}: ${colors.join(',') || 'Sin colores'}`);
                return colors;
            }
            
            this.log(`⚠️ No se encontró información para: ${cardName}`);
            return [];
            
        } catch (error) {
            this.log(`❌ Error obteniendo colores para ${cardName}: ${error.message}`);
            return [];
        }
    }

    /**
     * 🐟 Obtener colores desde MTGGoldfish (backup)
     */
    async getCardColorsFromMTGGoldfish(cardName) {
        try {
            // Construir URL de búsqueda en MTGGoldfish
            const searchUrl = `${this.baseUrl}/price/${encodeURIComponent(cardName)}#paper`;
            
            this.log(`🐟 Buscando en MTGGoldfish: ${searchUrl}`);
            
            const html = await this.fetchWithCorsProxy(searchUrl);
            const colors = this.parseCardColorsFromMTGGoldfish(html);
            
            if (colors.length > 0) {
                this.log(`✅ Colores desde MTGGoldfish para ${cardName}: ${colors.join(',')}`);
            }
            
            return colors;
            
        } catch (error) {
            this.log(`❌ Error obteniendo desde MTGGoldfish: ${error.message}`);
            return [];
        }
    }

    /**
     * 📄 Parsear colores desde página de carta en MTGGoldfish
     */
    parseCardColorsFromMTGGoldfish(html) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const colors = [];
            
            // Buscar símbolos de maná en la página
            const manaSymbols = doc.querySelectorAll('.mana-symbol, [class*="mana"], [alt*="mana"]');
            
            for (const symbol of manaSymbols) {
                const altText = symbol.getAttribute('alt') || '';
                const className = symbol.className || '';
                
                if (altText.includes('White') || className.includes('W')) colors.push('W');
                if (altText.includes('Blue') || className.includes('U')) colors.push('U');
                if (altText.includes('Black') || className.includes('B')) colors.push('B');
                if (altText.includes('Red') || className.includes('R')) colors.push('R');
                if (altText.includes('Green') || className.includes('G')) colors.push('G');
            }
            
            // También buscar en el texto del costo de maná
            const costElements = doc.querySelectorAll('[class*="cost"], [class*="mana-cost"]');
            for (const element of costElements) {
                const text = element.textContent;
                if (text.includes('{W}')) colors.push('W');
                if (text.includes('{U}')) colors.push('U');
                if (text.includes('{B}')) colors.push('B');
                if (text.includes('{R}')) colors.push('R');
                if (text.includes('{G}')) colors.push('G');
            }
            
            return [...new Set(colors)]; // Eliminar duplicados
            
        } catch (error) {
            this.log(`❌ Error parseando colores desde MTGGoldfish: ${error.message}`);
            return [];
        }
    }

    /**
     * 🏗️ Inferir arquetipo desde las cartas reales (usando solo patrones generales)
     */
    inferArchetypeFromCards(cards) {
        if (!cards || cards.length === 0) return 'unknown';
        
        // Contar distribución de tipos de cartas por cantidad
        let lowCostCards = 0;
        let highCostCards = 0;
        let totalCards = 0;
        
        for (const card of cards) {
            totalCards += card.quantity || 1;
            
            // Solo usar patrones muy obvios y generales del nombre
            const name = card.name.toLowerCase();
            if (name.includes('1') || name.includes('one') || card.quantity === 4) {
                lowCostCards += card.quantity || 1;
            }
            if (name.includes('7') || name.includes('8') || name.includes('9')) {
                highCostCards += card.quantity || 1;
            }
        }
        
        // Inferencias muy básicas basadas en distribución
        const lowCostRatio = lowCostCards / totalCards;
        const highCostRatio = highCostCards / totalCards;
        
        if (lowCostRatio > 0.4) return 'aggro';
        if (highCostRatio > 0.2) return 'control';
        
        return 'midrange'; // Default seguro
    }

    /**
     * 🌱 Inferir rol de carta (solo patrones muy básicos)
     */
    inferCardRole(cardName) {
        const name = cardName.toLowerCase();
        
        // Solo patrones absolutamente obvios
        if (name.includes('mountain') || name.includes('island') || name.includes('swamp') || 
            name.includes('forest') || name.includes('plains')) {
            return 'land';
        }
        
        // Para todo lo demás, categoría genérica
        return 'spell';
    }

    /**
     * 🌱 Verificar si es tierra básica (solo nombres exactos)
     */
    isBasicLand(cardName) {
        const exactBasics = ['Mountain', 'Island', 'Swamp', 'Forest', 'Plains'];
        return exactBasics.includes(cardName);
    }

    /**
     * 🌐 Fetch con proxy CORS mejorado
     */
    async fetchWithCorsProxy(url) {
        this.log(`📡 Fetching: ${url}`);
        
        for (let i = 0; i < this.corsProxies.length; i++) {
            const proxy = this.corsProxies[i];
            
            try {
                this.log(`🔗 Probando proxy ${i + 1}/${this.corsProxies.length}: ${proxy.substring(0, 30)}...`);
                
                const proxyUrl = proxy + encodeURIComponent(url);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    },
                    signal: controller.signal,
                    mode: 'cors'
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const html = await response.text();
                
                // Validar respuesta
                if (html.length < 1000) {
                    throw new Error('Respuesta demasiado corta');
                }
                
                if (html.includes('Access Denied') || html.includes('403') || html.includes('blocked')) {
                    throw new Error('Acceso bloqueado');
                }
                
                this.log(`✅ Proxy exitoso: ${html.length} caracteres recibidos`);
                return html;

            } catch (error) {
                this.log(`⚠️ Proxy ${i + 1} falló: ${error.message}`);
                
                if (i < this.corsProxies.length - 1) {
                    await this.sleep(500); // Pequeño delay antes del siguiente proxy
                }
            }
        }
        
        throw new Error('Todos los proxies CORS fallaron');
    }

    // Métodos auxiliares...
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
        console.log(`🐟 [DynamicScraper] ${message}`, data || '');
    }

    logError(message, error = null) {
        console.error(`❌ [DynamicScraper] ${message}`, error || '');
    }
}

export default MTGGoldfishCompleteScraper;