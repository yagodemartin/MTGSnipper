// src/core/usecases/DeckPredictionEngine.js
// 🎯 Motor de predicción inteligente con datos actualizados del meta

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
            gameNumber: 1 // Para sideboard detection
        };

        // Configuración del algoritmo
        this.config = {
            confirmationThreshold: 0.95,    // 95% para auto-confirmar
            minCardsForPrediction: 2,       // Mínimo 2 cartas para predecir
            maxPredictions: 5,              // Top 5 predicciones
            decayFactor: 0.9,               // Decay para cartas antiguas
            bonusMultipliers: {
                signature: 2.0,             // Signature cards x2
                meta_popular: 1.5,          // Mazos populares x1.5
                color_match: 1.3,           // Match exacto de colores x1.3
                turn_timing: 1.2            // Timing correcto x1.2
            }
        };

        this.debugMode = true;
    }

    /**
     * 🎯 Método principal: añadir carta del oponente y actualizar predicciones
     */
    async addOpponentCard(cardData) {
        try {
            this.log(`🃏 Nueva carta del oponente: ${cardData.name}`);

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
            
            // Generar nuevas predicciones
            const predictions = await this.generatePredictions();
            
            // Verificar auto-confirmación
            const autoConfirmed = this.checkAutoConfirmation(predictions);
            
            if (autoConfirmed) {
                this.log(`🎯 Mazo AUTO-CONFIRMADO: ${autoConfirmed.deck.name}`);
                this.confirmedDeck = autoConfirmed;
                return { confirmed: true, deck: autoConfirmed };
            }
            
            this.predictions = predictions;
            return { confirmed: false, predictions };

        } catch (error) {
            this.logError('Error añadiendo carta del oponente:', error);
            return { confirmed: false, predictions: this.predictions };
        }
    }

    /**
     * 🧠 Generar predicciones basadas en cartas jugadas
     */
    async generatePredictions() {
        try {
            if (this.opponentCards.length < this.config.minCardsForPrediction) {
                return [];
            }

            // Obtener datos del meta actualizados
            const metaData = await this.db.getMetaData();
            
            if (!metaData?.decks) {
                this.log('⚠️ No hay datos del meta disponibles');
                return [];
            }

            this.log(`🔍 Analizando ${this.opponentCards.length} cartas contra ${metaData.decks.length} mazos...`);

            // Calcular scores para cada mazo
            const deckScores = metaData.decks.map(deck => {
                const score = this.calculateDeckScore(deck);
                return {
                    deck,
                    score: score.total,
                    breakdown: score.breakdown,
                    probability: this.calculateProbability(score.total, deck),
                    confidence: this.calculateConfidence(score.total, deck),
                    matchedCards: score.matchedCards,
                    reasoning: score.reasoning
                };
            });

            // Filtrar y ordenar predicciones
            const validPredictions = deckScores
                .filter(prediction => prediction.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, this.config.maxPredictions);

            // Normalizar probabilidades
            this.normalizeProbabilities(validPredictions);

            this.log(`📊 Generadas ${validPredictions.length} predicciones válidas`);
            return validPredictions;

        } catch (error) {
            this.logError('Error generando predicciones:', error);
            return [];
        }
    }

    /**
     * 🧮 Calcular score de un mazo específico
     */
    calculateDeckScore(deck) {
        let totalScore = 0;
        const breakdown = {};
        const matchedCards = [];
        const reasoning = [];

        // 1. Score por cartas signature (confirman el mazo)
        const signatureScore = this.calculateSignatureScore(deck);
        totalScore += signatureScore.score;
        breakdown.signature = signatureScore.score;
        matchedCards.push(...signatureScore.matches);
        reasoning.push(...signatureScore.reasoning);

        // 2. Score por cartas clave
        const keyCardScore = this.calculateKeyCardScore(deck);
        totalScore += keyCardScore.score;
        breakdown.keyCards = keyCardScore.score;
        matchedCards.push(...keyCardScore.matches);
        reasoning.push(...keyCardScore.reasoning);

        // 3. Score por compatibilidad de colores
        const colorScore = this.calculateColorScore(deck);
        totalScore += colorScore.score;
        breakdown.colors = colorScore.score;
        reasoning.push(...colorScore.reasoning);

        // 4. Score por timing/curva
        const timingScore = this.calculateTimingScore(deck);
        totalScore += timingScore.score;
        breakdown.timing = timingScore.score;
        reasoning.push(...timingScore.reasoning);

        // 5. Bonus por popularidad en el meta
        const metaBonus = this.calculateMetaBonus(deck);
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
     * 🎯 Score por cartas signature (peso máximo)
     */
    calculateSignatureScore(deck) {
        let score = 0;
        const matches = [];
        const reasoning = [];

        (deck.signatureCards || []).forEach(signatureCard => {
            const playedCard = this.findPlayedCard(signatureCard.name);
            
            if (playedCard) {
                const cardScore = signatureCard.weight * this.config.bonusMultipliers.signature;
                score += cardScore;
                
                matches.push({
                    card: signatureCard.name,
                    type: 'signature',
                    score: cardScore,
                    turn: playedCard.turn
                });
                
                reasoning.push(`SIGNATURE: ${signatureCard.name} (+${cardScore.toFixed(0)})`);
            }
        });

        return { score, matches, reasoning };
    }

    /**
     * 🔑 Score por cartas clave
     */
    calculateKeyCardScore(deck) {
        let score = 0;
        const matches = [];
        const reasoning = [];

        (deck.keyCards || []).forEach(keyCard => {
            const playedCard = this.findPlayedCard(keyCard.name);
            
            if (playedCard) {
                let cardScore = keyCard.weight || 50;
                
                // Bonus por timing correcto
                if (this.isCorrectTiming(playedCard, keyCard)) {
                    cardScore *= this.config.bonusMultipliers.turn_timing;
                    reasoning.push(`TIMING: ${keyCard.name} jugada en turno correcto`);
                }
                
                score += cardScore;
                
                matches.push({
                    card: keyCard.name,
                    type: 'key',
                    score: cardScore,
                    role: keyCard.role,
                    turn: playedCard.turn
                });
                
                reasoning.push(`KEY: ${keyCard.name} (+${cardScore.toFixed(0)})`);
            }
        });

        return { score, matches, reasoning };
    }

    /**
     * 🎨 Score por compatibilidad de colores
     */
    calculateColorScore(deck) {
        let score = 0;
        const reasoning = [];

        const detectedColors = Array.from(this.gameContext.colorsDetected);
        const deckColors = deck.colors || [];

        if (detectedColors.length === 0) {
            return { score: 0, reasoning: ['Sin colores detectados aún'] };
        }

        // Verificar incompatibilidad
        const incompatibleColors = detectedColors.filter(color => 
            !deckColors.includes(color)
        );

        if (incompatibleColors.length > 0) {
            score = -50; // Penalty por colores incompatibles
            reasoning.push(`INCOMPATIBLE: Colores ${incompatibleColors.join(', ')} no están en el mazo`);
            return { score, reasoning };
        }

        // Bonus por match exacto
        if (detectedColors.length === deckColors.length && 
            detectedColors.every(color => deckColors.includes(color))) {
            
            score = 25 * this.config.bonusMultipliers.color_match;
            reasoning.push(`COLOR MATCH: Colores exactos ${detectedColors.join('')}`);
        } else {
            // Bonus parcial por colores compatibles
            score = 15;
            reasoning.push(`COLOR OK: Colores compatibles ${detectedColors.join('')}`);
        }

        return { score, reasoning };
    }

    /**
     * ⏰ Score por timing de jugadas
     */
    calculateTimingScore(deck) {
        let score = 0;
        const reasoning = [];

        // Analizar si las cartas se juegan en turnos típicos del arquetipo
        const expectedCurve = deck.expectedCurve || {};
        let correctTimingCount = 0;

        this.opponentCards.forEach(playedCard => {
            const turn = playedCard.turn;
            const expectedForTurn = expectedCurve[`turn${turn}`] || [];
            
            if (expectedForTurn.some(expected => 
                playedCard.name.toLowerCase().includes(expected.toLowerCase()) ||
                expected.toLowerCase().includes(playedCard.name.toLowerCase())
            )) {
                correctTimingCount++;
                score += 10;
            }
        });

        if (correctTimingCount > 0) {
            reasoning.push(`TIMING: ${correctTimingCount} cartas en timing correcto (+${score})`);
        }

        return { score, reasoning };
    }

    /**
     * 📈 Bonus por popularidad en el meta
     */
    calculateMetaBonus(deck) {
        let score = 0;
        const reasoning = [];

        const metaShare = deck.metaShare || 0;
        
        if (metaShare > 15) {
            score = 20 * this.config.bonusMultipliers.meta_popular;
            reasoning.push(`META: Mazo muy popular ${metaShare.toFixed(1)}% (+${score.toFixed(0)})`);
        } else if (metaShare > 10) {
            score = 10;
            reasoning.push(`META: Mazo popular ${metaShare.toFixed(1)}% (+${score})`);
        } else if (metaShare > 5) {
            score = 5;
            reasoning.push(`META: Mazo jugado ${metaShare.toFixed(1)}% (+${score})`);
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

        // Modificadores basados en patrón de juego observado
        switch (archetype) {
            case 'aggro':
                if (cardsPlayed >= 2 && avgTurn <= 3) {
                    multiplier = 1.2;
                    reasoning.push('AGGRO: Patrón rápido detectado (+20%)');
                }
                break;
                
            case 'control':
                if (avgTurn >= 3 && this.hasControlPattern()) {
                    multiplier = 1.15;
                    reasoning.push('CONTROL: Patrón defensivo detectado (+15%)');
                }
                break;
                
            case 'ramp':
                if (this.hasRampPattern()) {
                    multiplier = 1.25;
                    reasoning.push('RAMP: Patrón de aceleración detectado (+25%)');
                }
                break;
        }

        return { multiplier, reasoning };
    }

    /**
     * 📊 Calcular probabilidad normalizada
     */
    calculateProbability(score, deck) {
        // Probabilidad base del score
        const baseProb = Math.min(score / 200, 0.9); // Max 90% del score
        
        // Ajuste por meta share
        const metaAdjustment = (deck.metaShare || 0) / 100 * 0.1; // Max 10% del meta
        
        return Math.min(baseProb + metaAdjustment, 0.99);
    }

    /**
     * 🎯 Calcular nivel de confianza
     */
    calculateConfidence(score, deck) {
        const cardsCount = this.opponentCards.length;
        
        if (score >= 150 && cardsCount >= 4) return 'very-high';
        if (score >= 100 && cardsCount >= 3) return 'high';
        if (score >= 50 && cardsCount >= 2) return 'medium';
        if (score >= 25) return 'low';
        
        return 'very-low';
    }

    /**
     * ✅ Verificar auto-confirmación
     */
    checkAutoConfirmation(predictions) {
        if (predictions.length === 0) return null;
        
        const topPrediction = predictions[0];
        
        // Auto-confirmar si:
        // 1. Probabilidad >= threshold
        // 2. Confianza alta
        // 3. Al menos 3 cartas analizadas
        
        if (topPrediction.probability >= this.config.confirmationThreshold &&
            topPrediction.confidence === 'very-high' &&
            this.opponentCards.length >= 3) {
            
            return topPrediction;
        }
        
        return null;
    }

    /**
     * 🔄 Normalizar probabilidades para que sumen coherentemente
     */
    normalizeProbabilities(predictions) {
        if (predictions.length === 0) return;
        
        const totalScore = predictions.reduce((sum, p) => sum + p.score, 0);
        
        predictions.forEach(prediction => {
            // Probabilidad relativa basada en score
            const relativeProb = prediction.score / totalScore;
            
            // Mezclar con probabilidad absoluta
            prediction.probability = (prediction.probability * 0.7) + (relativeProb * 0.3);
            
            // Asegurar que la top predicción sea la más alta
            if (prediction === predictions[0]) {
                prediction.probability = Math.max(prediction.probability, 0.4);
            }
        });
        
        // Asegurar orden por probabilidad
        predictions.sort((a, b) => b.probability - a.probability);
    }

    /**
     * 🃏 Enriquecer datos de carta
     */
    enrichCardData(cardData) {
        return {
            ...cardData,
            turn: this.gameContext.turn,
            timestamp: Date.now(),
            colors: this.detectCardColors(cardData),
            normalizedName: this.normalizeCardName(cardData.name)
        };
    }

    /**
     * 🎮 Actualizar contexto del juego
     */
    updateGameContext(card) {
        // Detectar colores
        const colors = this.detectCardColors(card);
        colors.forEach(color => this.gameContext.colorsDetected.add(color));
        
        // Añadir a patrón de juego
        this.gameContext.playPattern.push({
            turn: this.gameContext.turn,
            card: card.name,
            type: card.type,
            colors: colors
        });
        
        // Mantener solo últimas 10 jugadas
        if (this.gameContext.playPattern.length > 10) {
            this.gameContext.playPattern.shift();
        }
    }

    /**
     * 🔍 Buscar carta jugada
     */
    findPlayedCard(cardName) {
        const normalized = this.normalizeCardName(cardName);
        return this.opponentCards.find(card => 
            card.normalizedName === normalized ||
            card.name.toLowerCase().includes(cardName.toLowerCase()) ||
            cardName.toLowerCase().includes(card.name.toLowerCase())
        );
    }

    /**
     * ⏰ Verificar timing correcto
     */
    isCorrectTiming(playedCard, keyCard) {
        // Heurística simple para timing
        const turn = playedCard.turn;
        const cardName = keyCard.name.toLowerCase();
        
        // Cartas de 1 mana en turnos 1-2
        if (turn <= 2 && (cardName.includes('bolt') || cardName.includes('guide'))) {
            return true;
        }
        
        // Planeswalkers en turnos 3+
        if (turn >= 3 && cardName.includes('teferi')) {
            return true;
        }
        
        // Cartas caras en turnos tardíos
        if (turn >= 5 && cardName.includes('atraxa')) {
            return true;
        }
        
        return false;
    }

    /**
     * 🛡️ Detectar patrón de control
     */
    hasControlPattern() {
        const recentCards = this.opponentCards.slice(-3);
        const controlWords = ['counterspell', 'removal', 'draw', 'wrath', 'teferi'];
        
        return recentCards.some(card => 
            controlWords.some(word => 
                card.name.toLowerCase().includes(word)
            )
        );
    }

    /**
     * 🌱 Detectar patrón de ramp
     */
    hasRampPattern() {
        const rampWords = ['explore', 'rampant', 'growth', 'land', 'mana'];
        
        return this.opponentCards.some(card =>
            rampWords.some(word =>
                card.name.toLowerCase().includes(word)
            )
        );
    }

    /**
     * 📊 Calcular turno promedio
     */
    calculateAverageTurn() {
        if (this.opponentCards.length === 0) return 0;
        
        const totalTurns = this.opponentCards.reduce((sum, card) => sum + card.turn, 0);
        return totalTurns / this.opponentCards.length;
    }

    /**
     * 🎨 Detectar colores de carta
     */
    detectCardColors(card) {
        const colors = [];
        const name = card.name.toLowerCase();
        const manaCost = card.manaCost || '';
        
        // Por costo de maná
        if (manaCost.includes('W')) colors.push('W');
        if (manaCost.includes('U')) colors.push('U');
        if (manaCost.includes('B')) colors.push('B');
        if (manaCost.includes('R')) colors.push('R');
        if (manaCost.includes('G')) colors.push('G');
        
        // Por nombres conocidos
        if (name.includes('mountain')) colors.push('R');
        if (name.includes('island')) colors.push('U');
        if (name.includes('swamp')) colors.push('B');
        if (name.includes('forest')) colors.push('G');
        if (name.includes('plains')) colors.push('W');
        
        // Por cartas específicas conocidas
        const colorMap = {
            'lightning bolt': ['R'],
            'counterspell': ['U'],
            'thoughtseize': ['B'],
            'llanowar elves': ['G'],
            'swords to plowshares': ['W']
        };
        
        Object.entries(colorMap).forEach(([cardName, cardColors]) => {
            if (name.includes(cardName)) {
                colors.push(...cardColors);
            }
        });
        
        return [...new Set(colors)]; // Remove duplicates
    }

    /**
     * 🔧 Normalizar nombre de carta
     */
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
     * 📊 Actualizar tracking del mazo confirmado
     */
    updateConfirmedDeckTracking(newCard) {
        if (!this.confirmedDeck) return null;
        
        // Verificar si la nueva carta encaja con el mazo confirmado
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
                turn: newCard.turn
            }
        };
    }

    /**
     * 🔍 Verificar si carta es esperada en el mazo
     */
    isCardExpectedInDeck(card, deck) {
        const cardName = card.name.toLowerCase();
        
        // Verificar en signature cards
        if (deck.signatureCards?.some(sig => 
            cardName.includes(sig.name.toLowerCase()) ||
            sig.name.toLowerCase().includes(cardName)
        )) {
            return true;
        }
        
        // Verificar en key cards
        if (deck.keyCards?.some(key => 
            cardName.includes(key.name.toLowerCase()) ||
            key.name.toLowerCase().includes(cardName)
        )) {
            return true;
        }
        
        // Verificar en mainboard
        if (deck.mainboard?.some(mb => 
            cardName.includes(mb.name.toLowerCase()) ||
            mb.name.toLowerCase().includes(cardName)
        )) {
            return true;
        }
        
        return false;
    }

    /**
     * 🔄 Reiniciar predictor para nueva partida
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
        
        this.log('🔄 Predictor reiniciado para nueva partida');
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
            gameNumber: this.gameContext.gameNumber
        };
    }

    /**
     * 🔧 Obtener predicciones actuales
     */
    getCurrentPredictions() {
        return this.predictions;
    }

    /**
     * 🎯 Obtener mazo confirmado
     */
    getConfirmedDeck() {
        return this.confirmedDeck;
    }

    /**
     * ⚙️ Configurar parámetros
     */
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.log('⚙️ Configuración actualizada', this.config);
    }

    log(message, data = null) {
        if (!this.debugMode) return;
        console.log(`🎯 [PredictionEngine] ${message}`, data || '');
    }

    logError(message, error = null) {
        console.error(`❌ [PredictionEngine] ${message}`, error || '');
    }
}

export default DeckPredictionEngine;