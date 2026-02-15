// src/core/usecases/DeckPredictionEngine.js
// 🎯 Motor de predicción con cartas REALES y threshold 85%

class DeckPredictionEngine {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.predictions = [];
        this.confirmedDeck = null;
        this.opponentCards = [];
        this.gameContext = {
            turn: 0,
            colorsDetected: new Set(),
            playPattern: [],
            gameNumber: 1
        };

        // Configuración actualizada para cartas reales
        this.config = {
            confirmationThreshold: 0.85,    // 85% para auto-confirmar
            minCardsForPrediction: 2,       // Solo 2 cartas mínimo
            maxPredictions: 6,              // Top 6 predicciones
            decayFactor: 0.9,
            bonusMultipliers: {
                signature: 3.0,             // Signature cards x3 (muy importantes)
                exact_match: 2.5,           // Match exacto x2.5
                key_card: 2.0,              // Key cards x2
                color_match: 1.5,           // Colores correctos x1.5
                archetype_bonus: 1.3        // Bonus por arquetipo x1.3
            }
        };

        this.debugMode = true;
    }

    /**
     * 🎯 Añadir carta del oponente con cartas REALES
     */
    async addOpponentCard(cardData) {
        try {
            this.log(`🃏 Nueva carta: ${cardData.name}`);

            // Enriquecer datos de la carta
            const enrichedCard = this.enrichCardData(cardData);
            
            // Añadir a historia
            this.opponentCards.push(enrichedCard);
            
            // Actualizar contexto del juego
            this.updateGameContext(enrichedCard);
            
            // Si ya hay mazo confirmado, solo tracking
            if (this.confirmedDeck) {
                return this.updateConfirmedDeckTracking(enrichedCard);
            }
            
            // Generar predicciones con cartas reales
            const predictions = await this.generateRealCardPredictions();
            
            // Verificar auto-confirmación al 85%
            const autoConfirmed = this.checkAutoConfirmation(predictions);
            
            if (autoConfirmed) {
                this.log(`🎯 MAZO AUTO-CONFIRMADO al ${(autoConfirmed.probability * 100).toFixed(1)}%: ${autoConfirmed.deck.name}`);
                this.confirmedDeck = autoConfirmed;
                return { confirmed: true, deck: autoConfirmed };
            }
            
            this.predictions = predictions;
            return { 
                confirmed: false, 
                predictions,
                cardsAnalyzed: this.opponentCards.length
            };

       // CAMBIAR EL CATCH POR:
} catch (error) {
    this.logError('Error añadiendo carta del oponente:', error);
    return null; // Retornar null si no se puede procesar
}
    }

    /**
     * 🧠 Generar predicciones basadas en cartas REALES
     */
    async generateRealCardPredictions() {
        try {
            if (this.opponentCards.length < this.config.minCardsForPrediction) {
                this.log(`⏳ Solo ${this.opponentCards.length} cartas, necesito ${this.config.minCardsForPrediction} mínimo`);
                return [];
            }

            // Obtener datos del meta con cartas reales
            const metaData = await this.db.getMetaData();
            
   // CAMBIAR LA CONDICIÓN POR:
if (!metaData?.decks || metaData.decks.length === 0) {
    this.log('⚠️ No hay datos del meta disponibles');
    return [];
}

            this.log(`🔍 Analizando ${this.opponentCards.length} cartas contra ${metaData.decks.length} mazos REALES...`);

            // Calcular scores usando cartas reales
            const deckScores = metaData.decks.map(deck => {
                const score = this.calculateRealCardScore(deck);
                return {
                    deck,
                    score: score.total,
                    breakdown: score.breakdown,
                    probability: this.calculateProbability(score.total, deck),
                    confidence: this.calculateConfidence(score.total, deck),
                    matchedCards: score.matchedCards,
                    reasoning: score.reasoning,
                    visualData: this.extractVisualData(deck, score.matchedCards)
                };
            });

            // Filtrar y ordenar
            const validPredictions = deckScores
                .filter(prediction => prediction.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, this.config.maxPredictions);

            // Normalizar probabilidades
            this.normalizeProbabilities(validPredictions);

            this.log(`📊 ${validPredictions.length} predicciones generadas con cartas reales`);
            
            // Log de top prediction para debug
            if (validPredictions.length > 0) {
                const top = validPredictions[0];
                this.log(`🥇 Top: ${top.deck.name} (${(top.probability * 100).toFixed(1)}%) - ${top.matchedCards.length} matches`);
            }

            return validPredictions;

        } catch (error) {
            this.logError('Error generando predicciones:', error);
            return [];
        }
    }

    /**
     * 🧮 Calcular score usando cartas REALES del mazo
     */
    calculateRealCardScore(deck) {
        let totalScore = 0;
        const breakdown = {};
        const matchedCards = [];
        const reasoning = [];

        // 1. Score por cartas signature REALES (peso máximo)
        const signatureScore = this.calculateRealSignatureScore(deck);
        totalScore += signatureScore.score;
        breakdown.signature = signatureScore.score;
        matchedCards.push(...signatureScore.matches);
        reasoning.push(...signatureScore.reasoning);

        // 2. Score por cartas clave REALES
        const keyCardScore = this.calculateRealKeyCardScore(deck);
        totalScore += keyCardScore.score;
        breakdown.keyCards = keyCardScore.score;
        matchedCards.push(...keyCardScore.matches);
        reasoning.push(...keyCardScore.reasoning);

        // 3. Score por match exacto en mainboard
        const exactMatchScore = this.calculateExactMatchScore(deck);
        totalScore += exactMatchScore.score;
        breakdown.exactMatch = exactMatchScore.score;
        matchedCards.push(...exactMatchScore.matches);
        reasoning.push(...exactMatchScore.reasoning);

        // 4. Score por compatibilidad de colores
        const colorScore = this.calculateColorCompatibilityScore(deck);
        totalScore += colorScore.score;
        breakdown.colors = colorScore.score;
        reasoning.push(...colorScore.reasoning);

        // 5. Bonus por popularidad en el meta
        const metaBonus = this.calculateMetaPopularityBonus(deck);
        totalScore += metaBonus.score;
        breakdown.metaBonus = metaBonus.score;
        reasoning.push(...metaBonus.reasoning);

        // 6. Bonus/penalty por arquetipo
        const archetypeModifier = this.calculateArchetypeModifier(deck);
        totalScore *= archetypeModifier.multiplier;
        breakdown.archetypeMultiplier = archetypeModifier.multiplier;
        reasoning.push(...archetypeModifier.reasoning);

        return {
            total: Math.max(0, totalScore),
            breakdown,
            matchedCards: matchedCards.filter(Boolean),
            reasoning: reasoning.filter(Boolean)
        };
    }

    /**
     * 🎯 Score por cartas signature REALES
     */
    calculateRealSignatureScore(deck) {
        let score = 0;
        const matches = [];
        const reasoning = [];

        if (!deck.signatureCards || deck.signatureCards.length === 0) {
            return { score: 0, matches: [], reasoning: [] };
        }

        deck.signatureCards.forEach(signatureCard => {
            const playedCard = this.findPlayedCard(signatureCard.name);
            
            if (playedCard) {
                const cardScore = signatureCard.weight * this.config.bonusMultipliers.signature;
                score += cardScore;
                
                matches.push({
                    card: signatureCard.name,
                    type: 'signature',
                    score: cardScore,
                    turn: playedCard.turn,
                    imageUrl: signatureCard.imageUrl,
                    quantity: signatureCard.quantity
                });
                
                reasoning.push(`🎯 SIGNATURE: ${signatureCard.name} (+${cardScore.toFixed(0)})`);
                this.log(`🎯 SIGNATURE HIT: ${signatureCard.name} = +${cardScore.toFixed(0)} points`);
            }
        });

        return { score, matches, reasoning };
    }

    /**
     * 🔑 Score por cartas clave REALES
     */
    calculateRealKeyCardScore(deck) {
        let score = 0;
        const matches = [];
        const reasoning = [];

        if (!deck.keyCards || deck.keyCards.length === 0) {
            return { score: 0, matches: [], reasoning: [] };
        }

        deck.keyCards.forEach(keyCard => {
            const playedCard = this.findPlayedCard(keyCard.name);
            
            if (playedCard) {
                let cardScore = keyCard.weight * this.config.bonusMultipliers.key_card;
                
                // Bonus por timing correcto
                if (this.isCorrectTiming(playedCard, keyCard)) {
                    cardScore *= 1.2;
                    reasoning.push(`⏰ TIMING: ${keyCard.name} en turno correcto`);
                }
                
                score += cardScore;
                
                matches.push({
                    card: keyCard.name,
                    type: 'key',
                    score: cardScore,
                    role: keyCard.role,
                    turn: playedCard.turn,
                    imageUrl: keyCard.imageUrl,
                    quantity: keyCard.quantity
                });
                
                reasoning.push(`🔑 KEY: ${keyCard.name} (+${cardScore.toFixed(0)})`);
                this.log(`🔑 KEY CARD HIT: ${keyCard.name} = +${cardScore.toFixed(0)} points`);
            }
        });

        return { score, matches, reasoning };
    }

    /**
     * 🎯 Score por match exacto en mainboard
     */
    calculateExactMatchScore(deck) {
        let score = 0;
        const matches = [];
        const reasoning = [];

        if (!deck.mainboard || deck.mainboard.length === 0) {
            return { score: 0, matches: [], reasoning: [] };
        }

        this.opponentCards.forEach(playedCard => {
            const deckCard = deck.mainboard.find(card => 
                this.normalizeCardName(card.name) === this.normalizeCardName(playedCard.name)
            );
            
            if (deckCard) {
                const cardScore = 30 * this.config.bonusMultipliers.exact_match;
                score += cardScore;
                
                matches.push({
                    card: deckCard.name,
                    type: 'exact',
                    score: cardScore,
                    turn: playedCard.turn,
                    imageUrl: deckCard.imageUrl,
                    quantity: deckCard.quantity
                });
                
                reasoning.push(`✅ EXACT: ${deckCard.name} (+${cardScore.toFixed(0)})`);
                this.log(`✅ EXACT MATCH: ${deckCard.name} = +${cardScore.toFixed(0)} points`);
            }
        });

        return { score, matches, reasoning };
    }

    /**
     * 🎨 Score por compatibilidad de colores
     */
    calculateColorCompatibilityScore(deck) {
        let score = 0;
        const reasoning = [];

        const detectedColors = Array.from(this.gameContext.colorsDetected);
        const deckColors = deck.colors || [];

        if (detectedColors.length === 0) {
            return { score: 0, reasoning: ['Sin colores detectados aún'] };
        }

        // Verificar incompatibilidad total
        const incompatibleColors = detectedColors.filter(color => 
            !deckColors.includes(color)
        );

        if (incompatibleColors.length > 0) {
            score = -100; // Penalty severo por colores incompatibles
            reasoning.push(`❌ INCOMPATIBLE: ${incompatibleColors.join(', ')} no están en el mazo`);
            return { score, reasoning };
        }

        // Bonus por match de colores
        if (detectedColors.length === deckColors.length && 
            detectedColors.every(color => deckColors.includes(color))) {
            
            score = 40 * this.config.bonusMultipliers.color_match;
            reasoning.push(`🎨 COLOR PERFECT: ${detectedColors.join('')} match exacto (+${score.toFixed(0)})`);
        } else {
            score = 20;
            reasoning.push(`🎨 COLOR OK: ${detectedColors.join('')} compatible (+${score})`);
        }

        return { score, reasoning };
    }

    /**
     * 📈 Bonus por popularidad en el meta
     */
    calculateMetaPopularityBonus(deck) {
        let score = 0;
        const reasoning = [];

        const metaShare = deck.metaShare || 0;
        
        if (metaShare > 15) {
            score = 25;
            reasoning.push(`📈 META TOP: ${metaShare.toFixed(1)}% del meta (+${score})`);
        } else if (metaShare > 10) {
            score = 15;
            reasoning.push(`📈 META HIGH: ${metaShare.toFixed(1)}% del meta (+${score})`);
        } else if (metaShare > 5) {
            score = 8;
            reasoning.push(`📈 META MID: ${metaShare.toFixed(1)}% del meta (+${score})`);
        }

        return { score, reasoning };
    }

    /**
     * 🏗️ Modificador por arquetipo
     */
    calculateArchetypeModifier(deck) {
        let multiplier = 1.0;
        const reasoning = [];

        const archetype = deck.archetype;
        const cardsPlayed = this.opponentCards.length;
        const avgTurn = this.calculateAverageTurn();

        switch (archetype) {
            case 'aggro':
                if (cardsPlayed >= 2 && avgTurn <= 3) {
                    multiplier = this.config.bonusMultipliers.archetype_bonus;
                    reasoning.push(`⚡ AGGRO: Patrón rápido detectado (+${((multiplier - 1) * 100).toFixed(0)}%)`);
                }
                break;
                
            case 'control':
                if (avgTurn >= 3 && this.hasControlPattern()) {
                    multiplier = this.config.bonusMultipliers.archetype_bonus;
                    reasoning.push(`🛡️ CONTROL: Patrón defensivo (+${((multiplier - 1) * 100).toFixed(0)}%)`);
                }
                break;
                
            case 'ramp':
                if (this.hasRampPattern()) {
                    multiplier = this.config.bonusMultipliers.archetype_bonus;
                    reasoning.push(`🌱 RAMP: Patrón de aceleración (+${((multiplier - 1) * 100).toFixed(0)}%)`);
                }
                break;
        }

        return { multiplier, reasoning };
    }

    /**
     * 🎨 Extraer datos visuales para la UI
     */
    extractVisualData(deck, matchedCards) {
        return {
            deckImage: deck.deckImage,
            deckName: deck.name,
            deckColors: deck.colors,
            metaShare: deck.metaShare,
            cardImages: matchedCards
                .filter(card => card.imageUrl)
                .slice(0, 4) // Top 4 cartas con imagen
                .map(card => ({
                    name: card.card,
                    imageUrl: card.imageUrl,
                    quantity: card.quantity
                })),
            totalCardsInDeck: (deck.mainboard?.length || 0) + (deck.sideboard?.length || 0)
        };
    }

    /**
     * 📊 Calcular probabilidad mejorada
     */
    calculateProbability(score, deck) {
        // Probabilidad base del score (más agresiva para llegar a 85%)
        let baseProb = Math.min(score / 150, 0.92); // Reducido threshold
        
        // Ajuste por meta share
        const metaAdjustment = (deck.metaShare || 0) / 100 * 0.15; // Más peso al meta
        
        // Bonus por número de cartas analizadas
        const cardCountBonus = Math.min(this.opponentCards.length / 10, 0.1);
        
        return Math.min(baseProb + metaAdjustment + cardCountBonus, 0.98);
    }

    /**
     * 🎯 Calcular nivel de confianza
     */
    calculateConfidence(score, deck) {
        const cardsCount = this.opponentCards.length;
        
        if (score >= 200 && cardsCount >= 3) return 'very-high';
        if (score >= 120 && cardsCount >= 2) return 'high';
        if (score >= 60 && cardsCount >= 2) return 'medium';
        if (score >= 30) return 'low';
        
        return 'very-low';
    }

    /**
     * ✅ Verificar auto-confirmación al 85%
     */
    checkAutoConfirmation(predictions) {
        if (predictions.length === 0) return null;
        
        const topPrediction = predictions[0];
        
        // Auto-confirmar si:
        // 1. Probabilidad >= 85%
        // 2. Confianza al menos 'high'
        // 3. Al menos 2 cartas analizadas
        
        if (topPrediction.probability >= this.config.confirmationThreshold &&
            ['high', 'very-high'].includes(topPrediction.confidence) &&
            this.opponentCards.length >= this.config.minCardsForPrediction) {
            
            this.log(`🎯 AUTO-CONFIRMACIÓN: ${topPrediction.deck.name} - ${(topPrediction.probability * 100).toFixed(1)}%`);
            return topPrediction;
        }
        
        return null;
    }

    /**
     * 🔍 Buscar carta jugada (normalizado)
     */
    findPlayedCard(cardName) {
        const normalized = this.normalizeCardName(cardName);
        return this.opponentCards.find(card => 
            card.normalizedName === normalized ||
            this.normalizeCardName(card.name) === normalized
        );
    }

    /**
     * 📊 Actualizar tracking del mazo confirmado
     */
    updateConfirmedDeckTracking(newCard) {
        if (!this.confirmedDeck) return null;
        
        const deck = this.confirmedDeck.deck;
        const isExpectedCard = this.isCardExpectedInDeck(newCard, deck);
        
        if (isExpectedCard) {
            this.log(`✅ Carta esperada en ${deck.name}: ${newCard.name}`);
        } else {
            this.log(`⚠️ Carta inesperada en ${deck.name}: ${newCard.name}`);
        }
        
        return {
            confirmed: true,
            deck: this.confirmedDeck,
            newCard: {
                name: newCard.name,
                expected: isExpectedCard,
                turn: newCard.turn,
                imageUrl: this.getCardImageFromDeck(newCard.name, deck)
            }
        };
    }

    /**
     * 🖼️ Obtener imagen de carta desde el mazo
     */
    getCardImageFromDeck(cardName, deck) {
        const allCards = [...(deck.mainboard || []), ...(deck.sideboard || [])];
        const card = allCards.find(c => 
            this.normalizeCardName(c.name) === this.normalizeCardName(cardName)
        );
        return card?.imageUrl || null;
    }

    /**
     * 🔍 Verificar si carta es esperada en el mazo
     */
    isCardExpectedInDeck(card, deck) {
        const cardName = this.normalizeCardName(card.name);
        
        // Verificar en signature cards
        if (deck.signatureCards?.some(sig => 
            this.normalizeCardName(sig.name) === cardName
        )) {
            return true;
        }
        
        // Verificar en key cards
        if (deck.keyCards?.some(key => 
            this.normalizeCardName(key.name) === cardName
        )) {
            return true;
        }
        
        // Verificar en mainboard completo
        if (deck.mainboard?.some(mb => 
            this.normalizeCardName(mb.name) === cardName
        )) {
            return true;
        }
        
        return false;
    }

    // Métodos auxiliares...
    
    enrichCardData(cardData) {
        return {
            ...cardData,
            turn: this.gameContext.turn,
            timestamp: Date.now(),
            colors: this.detectCardColors(cardData),
            normalizedName: this.normalizeCardName(cardData.name)
        };
    }

    updateGameContext(card) {
        // Detectar colores
        const colors = this.detectCardColors(card);
        colors.forEach(color => this.gameContext.colorsDetected.add(color));
        
        // Añadir a patrón de juego
        this.gameContext.playPattern.push({
            turn: this.gameContext.turn,
            card: card.name,
            colors: colors
        });
        
        // Mantener solo últimas 10 jugadas
        if (this.gameContext.playPattern.length > 10) {
            this.gameContext.playPattern.shift();
        }
    }

    detectCardColors(card) {
        const colors = [];
        const name = card.name.toLowerCase();
        
        // Tierras básicas
        if (name.includes('mountain')) colors.push('R');
        if (name.includes('island')) colors.push('U');
        if (name.includes('swamp')) colors.push('B');
        if (name.includes('forest')) colors.push('G');
        if (name.includes('plains')) colors.push('W');
        
        return [...new Set(colors)];
    }

    isCorrectTiming(playedCard, keyCard) {
        const turn = playedCard.turn;
        const cardName = keyCard.name.toLowerCase();
        
        // Heurísticas básicas de timing
        if (turn <= 2 && (cardName.includes('bolt') || cardName.includes('guide'))) return true;
        if (turn >= 3 && cardName.includes('teferi')) return true;
        if (turn >= 5 && cardName.includes('atraxa')) return true;
        
        return false;
    }

    hasControlPattern() {
        const recentCards = this.opponentCards.slice(-3);
        const controlWords = ['counter', 'verdict', 'teferi', 'control'];
        
        return recentCards.some(card => 
            controlWords.some(word => 
                card.name.toLowerCase().includes(word)
            )
        );
    }

    hasRampPattern() {
        const rampWords = ['leyline', 'beanstalk', 'ramp', 'domain'];
        
        return this.opponentCards.some(card =>
            rampWords.some(word =>
                card.name.toLowerCase().includes(word)
            )
        );
    }

    calculateAverageTurn() {
        if (this.opponentCards.length === 0) return 0;
        
        const totalTurns = this.opponentCards.reduce((sum, card) => sum + card.turn, 0);
        return totalTurns / this.opponentCards.length;
    }

    normalizeProbabilities(predictions) {
        if (predictions.length === 0) return;
        
        // Asegurar que la top prediction tenga al menos probabilidad razonable
        if (predictions[0]) {
            predictions[0].probability = Math.max(predictions[0].probability, 0.3);
        }
        
        // Ordenar por probabilidad final
        predictions.sort((a, b) => b.probability - a.probability);
    }

    normalizeCardName(name) {
        return name.toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ');
    }

    /**
     * 🎯 Confirmar mazo manualmente
     */
    confirmDeck(deckId) {
        const prediction = this.predictions.find(p => p.deck.id === deckId);
        
        if (prediction) {
            this.confirmedDeck = prediction;
            this.log(`🎯 Mazo CONFIRMADO manualmente: ${prediction.deck.name}`);
            return prediction;
        }
        
        return null;
    }

    /**
     * 🔄 Reiniciar para nueva partida
     */
    reset() {
        this.predictions = [];
        this.confirmedDeck = null;
        this.opponentCards = [];
        this.gameContext = {
            turn: 0,
            colorsDetected: new Set(),
            playPattern: [],
            gameNumber: this.gameContext.gameNumber + 1
        };
        
        this.log('🔄 PredictionEngine reiniciado para nueva partida');
    }

    /**
     * 🎮 Actualizar turno
     */
    setTurn(turnNumber) {
        this.gameContext.turn = turnNumber;
        this.log(`🎯 Turno actualizado: ${turnNumber}`);
    }

    /**
     * 📊 Obtener estadísticas
     */
    getStats() {
        return {
            cardsAnalyzed: this.opponentCards.length,
            currentTurn: this.gameContext.turn,
            colorsDetected: Array.from(this.gameContext.colorsDetected),
            predictionsCount: this.predictions.length,
            isConfirmed: !!this.confirmedDeck,
            confirmedDeck: this.confirmedDeck?.deck?.name || null,
            gameNumber: this.gameContext.gameNumber,
            topPrediction: this.predictions.length > 0 ? {
                name: this.predictions[0].deck.name,
                probability: this.predictions[0].probability,
                confidence: this.predictions[0].confidence
            } : null
        };
    }

    getCurrentPredictions() {
        return this.predictions;
    }

    getConfirmedDeck() {
        return this.confirmedDeck;
    }

    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.log('⚙️ Configuración actualizada', this.config);
    }

    log(message, data = null) {
        if (!this.debugMode) return;
        console.log(`🎯 [PredictionEngine-Real] ${message}`, data || '');
    }

    logError(message, error = null) {
        console.error(`❌ [PredictionEngine-Real] ${message}`, error || '');
    }
}

export default DeckPredictionEngine;