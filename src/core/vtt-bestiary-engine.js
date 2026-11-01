/**
 * @file src/core/vtt-bestiary-engine.js
 * @description Bestiário Oficial do Cenário Kuar-Tor (+2d6 v2.3) e Motor de Gerenciamento
 * de Turnos e Iniciativa Tática para a Mesa Virtual (VTT).
 * @module VttBestiaryEngine
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./character-sheet', './dice-roller'], factory);
    } else if (typeof module === 'object' && module.exports) {
        const charSheet = require('./character-sheet');
        const diceRoller = require('./dice-roller');
        module.exports = factory(charSheet, diceRoller);
    } else {
        root.VttBestiaryEngine = factory(root.CharacterSheetRules, root.DiceRoller);
    }
}(typeof self !== 'undefined' ? self : this, function (CharacterSheetRules, DiceRoller) {
    'use strict';

    // Catálogo Oficial de Criaturas e Inimigos de Kuar-Tor (+2d6)
    const BESTIARY = [
        {
            id: 'goblin_catacumbas',
            name: 'Salteador das Catacumbas',
            category: 'Humanoides',
            tier: 'Fraco',
            hp: 10,
            pe: 4,
            forVal: 1,
            desVal: 3,
            conVal: 1,
            intVal: 1,
            podVal: 1,
            defense: 8,
            initiative: 3,
            avatar: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80',
            desc: 'Criatura miúda e desesperada que espreita nas sombras dos esgotos e catacumbas.',
            attacks: [
                { name: 'Adaga Enferrujada', type: 'Corpo a Corpo', hitModifier: 3, damageFormula: '1d6 - 1', reach: '1m' },
                { name: 'Pedrada', type: 'À Distância', hitModifier: 3, damageFormula: '1d6 - 2', reach: '10m' }
            ],
            traits: ['Visão no Escuro', 'Fuga Desesperada']
        },
        {
            id: 'cultista_sombrio',
            name: 'Cultista do Vazio',
            category: 'Conjuradores',
            tier: 'Médio',
            hp: 14,
            pe: 12,
            forVal: 2,
            desVal: 2,
            conVal: 2,
            intVal: 3,
            podVal: 3,
            defense: 8,
            initiative: 2,
            avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=150&auto=format&fit=crop&q=80',
            desc: 'Fanático encapuzado devotado aos ecos antigos do Vazio de Kuar-Tor.',
            attacks: [
                { name: 'Adaga Cerimonial', type: 'Corpo a Corpo', hitModifier: 2, damageFormula: '1d6', reach: '1m' },
                { name: 'Dardo Sombrio (Magia)', type: 'À Distância', hitModifier: 4, damageFormula: '1d6 + 2', reach: '15m', costPE: 2 }
            ],
            traits: ['Fanatismo (+1 em Vontade)', 'Murmúrios Dementes']
        },
        {
            id: 'lobo_abissal',
            name: 'Lobo Corrompido',
            category: 'Feras',
            tier: 'Médio',
            hp: 16,
            pe: 6,
            forVal: 3,
            desVal: 3,
            conVal: 3,
            intVal: 1,
            podVal: 1,
            defense: 9,
            initiative: 4,
            avatar: 'https://images.unsplash.com/photo-1564865878688-9a244444042a?w=150&auto=format&fit=crop&q=80',
            desc: 'Predador selvagem infundido pela miasma púrpura da ilha.',
            attacks: [
                { name: 'Mordida Voraz', type: 'Corpo a Corpo', hitModifier: 4, damageFormula: '1d6 + 2', reach: '1m', appliesCondition: 'sangrando' }
            ],
            traits: ['Faro Aguçado', 'Ataque em Matilha (+1 no acerto se aliado adjacente)']
        },
        {
            id: 'soldado_renegado',
            name: 'Soldado Renegado',
            category: 'Guerreiros',
            tier: 'Médio',
            hp: 20,
            pe: 8,
            forVal: 3,
            desVal: 2,
            conVal: 3,
            intVal: 2,
            podVal: 1,
            defense: 10,
            initiative: 2,
            avatar: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80',
            desc: 'Veterano desertor da última expedição, armado com cota de malha e escudo.',
            attacks: [
                { name: 'Espada Longa', type: 'Corpo a Corpo', hitModifier: 4, damageFormula: '1d6 + 3', reach: '1.5m' },
                { name: 'Golpe de Escudo', type: 'Corpo a Corpo', hitModifier: 3, damageFormula: '1d6', reach: '1m', appliesCondition: 'atordoado' }
            ],
            traits: ['Em Guarda (+2 Defesa com Escudo)', 'Disciplina Militar']
        },
        {
            id: 'arqueiro_sombrio',
            name: 'Atirador Renegado',
            category: 'Guerreiros',
            tier: 'Médio',
            hp: 16,
            pe: 8,
            forVal: 2,
            desVal: 4,
            conVal: 2,
            intVal: 2,
            podVal: 1,
            defense: 10,
            initiative: 4,
            avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
            desc: 'Batedor implacável que ataca à distância nos desfiladeiros escuros.',
            attacks: [
                { name: 'Arco Composto', type: 'À Distância', hitModifier: 5, damageFormula: '1d6 + 2', reach: '25m' },
                { name: 'Faca de Trincheira', type: 'Corpo a Corpo', hitModifier: 3, damageFormula: '1d6', reach: '1m' }
            ],
            traits: ['Tiro Certeiro', 'Esquiva Rápida']
        },
        {
            id: 'automato_runico',
            name: 'Guardião Rúnico Antigo',
            category: 'Construtos',
            tier: 'Forte',
            hp: 28,
            pe: 4,
            forVal: 4,
            desVal: 1,
            conVal: 4,
            intVal: 1,
            podVal: 2,
            defense: 11,
            initiative: 1,
            avatar: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80',
            desc: 'Armadura mecânica ancestral forjada em latão e sustentada por núcleos de éter.',
            attacks: [
                { name: 'Punho Hidráulico', type: 'Corpo a Corpo', hitModifier: 4, damageFormula: '2d6 + 1', reach: '1.5m' }
            ],
            traits: ['Couraça Implacável (Armadura 2)', 'Imune a Sangramento e Inconsciência']
        },
        {
            id: 'espectro_eco',
            name: 'Eco Perdido (Espectro)',
            category: 'Espíritos',
            tier: 'Forte',
            hp: 14,
            pe: 18,
            forVal: 1,
            desVal: 3,
            conVal: 2,
            intVal: 3,
            podVal: 4,
            defense: 10,
            initiative: 3,
            avatar: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=150&auto=format&fit=crop&q=80',
            desc: 'Resquício etéreo de um expedicionário consumido pela loucura rúnica.',
            attacks: [
                { name: 'Toque Drenador de Éter', type: 'Corpo a Corpo', hitModifier: 4, damageFormula: '1d6 + 2 (Dreno de PE)', reach: '1m', costPE: 1 }
            ],
            traits: ['Incorpóreo (Reduz metade do dano físico não-mágico)', 'Vôo Levitação']
        },
        {
            id: 'aberracao_abissal',
            name: 'Arauto do Abismo de Kuar-Tor',
            category: 'Chefes',
            tier: 'Chefe',
            hp: 44,
            pe: 24,
            forVal: 5,
            desVal: 3,
            conVal: 5,
            intVal: 3,
            podVal: 5,
            defense: 12,
            initiative: 3,
            avatar: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150&auto=format&fit=crop&q=80',
            desc: 'Monstruosidade titânica de tentáculos e olhos múltiplos gerada nas profundezas da ilha.',
            attacks: [
                { name: 'Tentáculo Esmagador', type: 'Corpo a Corpo', hitModifier: 6, damageFormula: '2d6 + 4', reach: '3m', appliesCondition: 'imobilizado' },
                { name: 'Onda Mental de Vazio', type: 'Área', hitModifier: 5, damageFormula: '1d6 + 3', reach: 'Raio 6m', costPE: 4, appliesCondition: 'atordoado' }
            ],
            traits: ['Ações Lendárias (Pode agir 2x por rodada)', 'Terror Abissal (CD 12 para não ficar Atordoado)']
        }
    ];

    const VttBestiaryEngine = {
        BESTIARY,

        /**
         * Retorna a lista completa de criaturas catalogadas.
         * @returns {Array<Object>}
         */
        getAllCreatures() {
            return JSON.parse(JSON.stringify(BESTIARY));
        },

        /**
         * Busca uma criatura por seu identificador único.
         * @param {string} id - ID da criatura.
         * @returns {Object|null}
         */
        getCreatureById(id) {
            if (!id || typeof id !== 'string') return null;
            const item = BESTIARY.find(c => c.id.toLowerCase() === id.toLowerCase().trim());
            return item ? JSON.parse(JSON.stringify(item)) : null;
        },

        /**
         * Filtra criaturas por termo de busca, categoria e tier.
         * @param {Object} options - Critérios de filtro.
         * @returns {Array<Object>}
         */
        filterCreatures(options = {}) {
            let search = '';
            let category = '';
            let tier = '';
            if (typeof options === 'string') {
                search = options;
                category = arguments[1] || '';
                tier = arguments[2] || '';
            } else if (options && typeof options === 'object') {
                search = options.search || '';
                category = options.category || '';
                tier = options.tier || '';
            }
            if (category === 'ALL' || category === 'all') category = '';
            const term = String(search || '').toLowerCase().trim();
            const cat = String(category || '').toLowerCase().trim();
            const t = String(tier || '').toLowerCase().trim();

            return BESTIARY.filter(c => {
                if (cat && c.category.toLowerCase() !== cat) return false;
                if (t && c.tier.toLowerCase() !== t) return false;
                if (term) {
                    const matchName = c.name.toLowerCase().includes(term);
                    const matchDesc = c.desc.toLowerCase().includes(term);
                    const matchAtk = c.attacks.some(a => a.name.toLowerCase().includes(term));
                    if (!matchName && !matchDesc && !matchAtk) return false;
                }
                return true;
            });
        },

        /**
         * Converte uma criatura em um Token pronto para o tabuleiro da Mesa Virtual (VTT).
         * @param {string|Object} creatureOrId - ID ou objeto da criatura.
         * @param {Object} [overrides={}] - Posição (x, y), nome customizado, etc.
         * @returns {Object} Payload formatado do token.
         */
        createEnemyToken(creatureOrId, overrides = {}) {
            let creature = null;
            if (typeof creatureOrId === 'string') {
                creature = this.getCreatureById(creatureOrId);
            } else if (creatureOrId && typeof creatureOrId === 'object') {
                creature = creatureOrId;
            }

            if (!creature) {
                throw new Error('Criatura inválida para geração de Token.');
            }

            const uniqueSuffix = Math.random().toString(36).substr(2, 5);
            const tokenName = overrides.name || creature.name;
            const tokenId = overrides.id || `enemy_${creature.id || 'creature'}_${Date.now()}_${uniqueSuffix}`;

            return {
                id: tokenId,
                name: tokenName,
                team: 'enemies',
                color: '#ef4444',
                size: creature.tier === 'Chefe' ? 2 : 1,
                hp: creature.hp,
                maxHp: creature.hp,
                pe: creature.pe || 0,
                maxPe: creature.pe || 0,
                defense: creature.defense || 8,
                des: creature.desVal || 2,
                forVal: creature.forVal || 2,
                initiative: creature.initiative || creature.desVal || 2,
                avatar: creature.avatar || '',
                conditions: overrides.conditions || [],
                attacks: creature.attacks || [],
                traits: creature.traits || [],
                x: typeof overrides.x === 'number' ? overrides.x : 200,
                y: typeof overrides.y === 'number' ? overrides.y : 200,
                lastUpdated: new Date().toISOString()
            };
        },

        // =====================================================================
        // RASTREADOR DE TURNOS E INICIATIVA TÁTICA (TURN TRACKER)
        // =====================================================================

        /**
         * Inicializa o estado do rastreador de combate ordenando tokens por iniciativa.
         * @param {Array<Object>} tokens - Lista de tokens ativos no grid.
         * @returns {Object} Estado inicial do combate.
         */
        initCombatTracker(tokens = []) {
            const list = Array.isArray(tokens) ? [...tokens] : [];

            // Ordena decrescente por iniciativa; desempate por DES e depois por equipe (heróis primeiro)
            const sorted = list.sort((a, b) => {
                const initA = parseInt(a.initiative !== undefined ? a.initiative : (a.des || 2)) || 0;
                const initB = parseInt(b.initiative !== undefined ? b.initiative : (b.des || 2)) || 0;
                if (initB !== initA) return initB - initA;
                const desA = parseInt(a.des || 2) || 0;
                const desB = parseInt(b.des || 2) || 0;
                if (desB !== desA) return desB - desA;
                return (a.team === 'heroes' ? -1 : 1);
            });

            return {
                isActive: sorted.length > 0,
                round: 1,
                currentTurnIndex: 0,
                order: sorted.map(t => ({
                    id: t.id,
                    name: t.name,
                    team: t.team || 'heroes',
                    hp: t.hp,
                    maxHp: t.maxHp,
                    initiative: t.initiative !== undefined ? t.initiative : (t.des || 2),
                    avatar: t.avatar || ''
                })),
                log: sorted.length > 0 ? [`Combate iniciado! Rodada 1. Vez de ${sorted[0].name}.`] : ['Nenhum combatente no tabuleiro.']
            };
        },

        /**
         * Avança para o próximo turno do combate, incrementando rodadas e processando condições ativas.
         * @param {Object} trackerState - Estado atual do tracker.
         * @param {Array<Object>} tokens - Lista atualizada dos tokens no grid.
         * @returns {Object} Objeto com novo trackerState, tokens atualizados e mensagens de log.
         */
        advanceTurn(trackerState, tokens = []) {
            if (!trackerState || !Array.isArray(trackerState.order) || trackerState.order.length === 0) {
                return {
                    trackerState: { isActive: false, round: 1, currentTurnIndex: 0, order: [], log: ['Nenhum combatente ativo.'] },
                    tokens,
                    log: ['Combate inativo.']
                };
            }

            const state = JSON.parse(JSON.stringify(trackerState));
            const updatedTokens = JSON.parse(JSON.stringify(tokens || []));
            const logs = [];

            let nextIndex = state.currentTurnIndex + 1;
            let nextRound = state.round;

            // Se atingiu o final da fila de iniciativa, avança a rodada
            if (nextIndex >= state.order.length) {
                nextIndex = 0;
                nextRound += 1;
                logs.push(`--- Início da Rodada ${nextRound} ---`);
            }

            state.currentTurnIndex = nextIndex;
            state.round = nextRound;

            const currentActorSummary = state.order[nextIndex];
            const currentToken = updatedTokens.find(t => t.id === currentActorSummary.id);

            if (currentToken) {
                logs.push(`É a vez de ${currentToken.name} (${currentToken.team === 'heroes' ? 'Herói' : 'Inimigo'}).`);

                // Processar Condições Ativas do Token no início de seu turno
                if (Array.isArray(currentToken.conditions)) {
                    // 1. Condição: Sangrando -> Perde 1d6 de dano contínuo (mínimo 1)
                    if (currentToken.conditions.includes('sangrando')) {
                        const bleedRoll = Math.floor(Math.random() * 6) + 1;
                        currentToken.hp = Math.max(0, currentToken.hp - bleedRoll);
                        logs.push(`🩸 ${currentToken.name} sangra e perde ${bleedRoll} PV! (Restante: ${currentToken.hp} PV)`);

                        // Se PV zerou pelo sangramento
                        if (currentToken.hp === 0 && !currentToken.conditions.includes('inconsciente')) {
                            currentToken.conditions.push('inconsciente');
                            logs.push(`💀 ${currentToken.name} caiu inconsciente devido ao sangramento!`);
                        }
                    }

                    // 2. Condição: Atordoado -> Alerta no log
                    if (currentToken.conditions.includes('atordoado')) {
                        logs.push(`⚡ ${currentToken.name} está Atordoado (-2 em ações e testes).`);
                    }

                    // 3. Condição: Inconsciente -> Pula ou alerta
                    if (currentToken.conditions.includes('inconsciente')) {
                        logs.push(`💀 ${currentToken.name} está Inconsciente e não pode agir.`);
                    }
                }

                // Sincroniza o HP de resumo no order
                currentActorSummary.hp = currentToken.hp;
            }

            state.log.push(...logs);

            return {
                trackerState: state,
                tokens: updatedTokens,
                log: logs
            };
        },

        /**
         * Adiciona um novo combatente à ordem de iniciativa em tempo de execução.
         * @param {Object} trackerState - Estado atual.
         * @param {Object} token - Novo token adicionado.
         * @returns {Object} Novo trackerState.
         */
        addTokenToTracker(trackerState, token) {
            if (!trackerState || !token) return trackerState;
            const state = JSON.parse(JSON.stringify(trackerState));
            const existingIdx = state.order.findIndex(t => t.id === token.id);
            const entry = {
                id: token.id,
                name: token.name,
                team: token.team || 'enemies',
                hp: token.hp,
                maxHp: token.maxHp,
                initiative: token.initiative !== undefined ? token.initiative : (token.des || 2),
                avatar: token.avatar || ''
            };

            if (existingIdx >= 0) {
                state.order[existingIdx] = entry;
            } else {
                state.order.push(entry);
                // Reordena
                state.order.sort((a, b) => b.initiative - a.initiative);
                state.log.push(`${token.name} entrou na batalha com Iniciativa ${entry.initiative}.`);
            }
            state.isActive = state.order.length > 0;
            return state;
        },

        /**
         * Remove um combatente derrotado ou retirado do grid.
         * @param {Object} trackerState - Estado atual.
         * @param {string} tokenId - ID do token.
         * @returns {Object} Novo trackerState.
         */
        removeTokenFromTracker(trackerState, tokenId) {
            if (!trackerState || !tokenId) return trackerState;
            const state = JSON.parse(JSON.stringify(trackerState));
            const removedToken = state.order.find(t => t.id === tokenId);
            state.order = state.order.filter(t => t.id !== tokenId);
            if (removedToken) {
                state.log.push(`${removedToken.name} foi removido do combate.`);
            }
            if (state.currentTurnIndex >= state.order.length) {
                state.currentTurnIndex = 0;
            }
            state.isActive = state.order.length > 0;
            return state;
        }
    };

    return VttBestiaryEngine;
}));
