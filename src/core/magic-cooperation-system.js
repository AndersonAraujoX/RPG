/**
 * ============================================================================
 * Kuar-Tor — Sistema de Cooperação e Mesa Arcano
 * 
 * Módulo especializado em:
 * 1. Rituais com Papéis (Condutor, Estabilizador, Canalizador com rolagens 2d6 cooperativas).
 * 2. Mana Compartilhada (Reservatório Comum de PE da Party e Doações).
 * 3. Sala em Tempo Real (Broadcasts e Protocolos de Sincronização Mestre-Jogadores).
 * ============================================================================
 */

(function (global) {
    'use strict';

    // 1. Definição dos Papéis Canônicos em Rituais
    const RITUAL_ROLES = {
        CONDUTOR: {
            id: 'condutor',
            name: 'Condutor',
            description: 'Lidera a conjuração, guiando a geometria do círculo místico.',
            primaryBonus: 'Define a direção e adiciona seu bônus de conjuração ao teste principal.'
        },
        ESTABILIZADOR: {
            id: 'estabilizador',
            name: 'Estabilizador',
            description: 'Controla a tensão mágica e dissipa turbulências arcanas.',
            primaryBonus: 'Sucesso em 2d6 atenua a CD em 1 e previne Surtos / Instabilidade Arcana.'
        },
        CANALIZADOR: {
            id: 'canalizador',
            name: 'Canalizador',
            description: 'Bombeia mana bruta no selo rúnico para acelerar a síntese.',
            primaryBonus: 'Sucesso em 2d6 reduz o custo de PE em 1 e confere +2 de força mágica ao impacto.'
        }
    };

    /**
     * Motor de Rituais Cooperativos com Papéis Definidos
     */
    const CooperativeRolesEngine = {
        RITUAL_ROLES,

        /**
         * Valida se uma equipe possui os três papéis essenciais e cobrem os caminhos do círculo.
         * @param {Array<Object>} participants - [{ name, role: 'condutor'|'estabilizador'|'canalizador', paths: ['fogo'], bonus: 2, peAvailable: 10 }]
         * @param {Object} circleEntry - { id, name, paths: ['fogo', 'ar', 'terra'], tier: 'TERCEIRUS' }
         */
        validateRoleFormation(participants, circleEntry) {
            if (!circleEntry || typeof circleEntry !== 'object' || !Array.isArray(circleEntry.paths)) {
                throw new Error('Círculo de ritual inválido.');
            }
            if (!Array.isArray(participants) || participants.length === 0) {
                return { valid: false, reason: 'Nenhum participante no ritual.' };
            }

            const roleCounts = { condutor: 0, estabilizador: 0, canalizador: 0 };
            const coveredPaths = new Set();

            participants.forEach(p => {
                if (!p || typeof p !== 'object') return;
                const r = String(p.role || '').toLowerCase();
                if (roleCounts[r] !== undefined) {
                    roleCounts[r]++;
                }
                const pPaths = Array.isArray(p.paths) ? p.paths : [];
                pPaths.forEach(k => coveredPaths.add(String(k).toLowerCase()));
            });

            const hasCondutor = roleCounts.condutor >= 1;
            const missingPaths = circleEntry.paths.filter(k => !coveredPaths.has(String(k).toLowerCase()));

            if (!hasCondutor) {
                return {
                    valid: false,
                    reason: 'O ritual precisa de pelo menos um Condutor para liderar o selo.',
                    roleCounts,
                    missingPaths
                };
            }

            if (missingPaths.length > 0) {
                return {
                    valid: false,
                    reason: `Os magos reunidos não cobrem os caminhos necessários: [${missingPaths.join(', ')}].`,
                    roleCounts,
                    missingPaths
                };
            }

            return {
                valid: true,
                roleCounts,
                missingPaths: [],
                totalParticipants: participants.length
            };
        },

        /**
         * Executa o ritual cooperativo com rolagem independente de cada papel.
         * @param {Array<Object>} participants - Lista de participantes com seus papéis e bônus.
         * @param {Object} circleEntry - Círculo místico.
         * @param {Object} rolls - Rolagens pré-determinadas (para testes puros): { condutor: [d1, d2], estabilizador: [d1, d2], canalizador: [d1, d2] }
         */
        executeRoleRitual(participants, circleEntry, rolls = null) {
            const validation = this.validateRoleFormation(participants, circleEntry);
            if (!validation.valid) {
                return {
                    success: false,
                    reason: validation.reason,
                    validation
                };
            }

            const defaultRoll = () => [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
            const getDices = (roleKey) => {
                if (rolls && Array.isArray(rolls[roleKey]) && rolls[roleKey].length === 2) {
                    return rolls[roleKey];
                }
                return defaultRoll();
            };

            let baseCD = (circleEntry.forms && circleEntry.forms.Criar && circleEntry.forms.Criar.cd) 
                || (circleEntry.tier === 'TERCEIRUS' ? 14 : 11);
            let basePECost = (circleEntry.forms && circleEntry.forms.Criar && circleEntry.forms.Criar.pe) 
                || (circleEntry.tier === 'TERCEIRUS' ? 8 : 4);

            const roleResults = [];
            let totalRollBonus = 0;
            let cdModifier = 0;
            let peCostModifier = 0;
            let surgePrevented = false;
            let stabilizerFumble = false;

            participants.forEach(p => {
                const role = String(p.role || 'condutor').toLowerCase();
                const [d1, d2] = getDices(role);
                const diceSum = d1 + d2;
                const bonus = Number(p.bonus) || 0;
                const total = diceSum + bonus;
                const isCrit = (diceSum === 12);
                const isFumble = (diceSum === 2);

                let contributionMessage = '';

                if (role === 'condutor') {
                    totalRollBonus += bonus;
                    contributionMessage = `Canalizou foco axial (+${bonus} bônus geral).`;
                } else if (role === 'estabilizador') {
                    if (isFumble) {
                        stabilizerFumble = true;
                        contributionMessage = 'FALHA DE ESTABILIZAÇÃO! Sobrecarga arcana iminente!';
                    } else if (total >= 9 || isCrit) {
                        cdModifier -= 1;
                        surgePrevented = true;
                        contributionMessage = 'Harmonia perfeita: CD reduzida em 1 e surtos arcanos anulados.';
                    } else {
                        contributionMessage = 'Estabilização moderada mantida.';
                    }
                } else if (role === 'canalizador') {
                    if (total >= 8 || isCrit) {
                        peCostModifier -= 1;
                        totalRollBonus += 2;
                        contributionMessage = 'Injeção de Mana: Custo de PE reduzido em 1 e +2 de ímpeto místico.';
                    } else {
                        totalRollBonus += 1;
                        contributionMessage = 'Injeção contínua de mana (+1 de força).';
                    }
                }

                roleResults.push({
                    name: p.name || 'Mago Anônimo',
                    role,
                    roleName: (RITUAL_ROLES[role.toUpperCase()] || {}).name || role,
                    d1,
                    d2,
                    diceSum,
                    bonus,
                    total,
                    isCrit,
                    isFumble,
                    contribution: contributionMessage
                });
            });

            const finalCD = Math.max(1, baseCD + cdModifier);
            const finalPECost = Math.max(1, basePECost + peCostModifier);

            // A rolagem do condutor principal comanda a base do ritual
            const condutorResult = roleResults.find(r => r.role === 'condutor') || roleResults[0];
            const finalRollTotal = condutorResult.diceSum + totalRollBonus;
            const success = (condutorResult.isCrit || finalRollTotal >= finalCD) && !stabilizerFumble;

            return {
                success,
                circleId: circleEntry.id,
                circleName: circleEntry.name,
                tier: circleEntry.tier,
                baseCD,
                finalCD,
                basePECost,
                finalPECost,
                condutorDiceSum: condutorResult.diceSum,
                totalRollBonus,
                finalRollTotal,
                surgePrevented,
                stabilizerFumble,
                roleResults,
                message: success
                    ? `✦ RITUAL COMPLETO: Os ${participants.length} magos uniram seus papéis com sucesso total! (${finalRollTotal} vs CD ${finalCD})`
                    : (stabilizerFumble 
                        ? '✕ RITUAL COLAPSOU: O Estabilizador perdeu o controle dos veios arcanos!' 
                        : `✕ RITUAL INCOMPLETO: A energia dissipou-se antes de fixar o selo. (${finalRollTotal} vs CD ${finalCD})`)
            };
        }
    };

    /**
     * Reservatório de Mana Compartilhada (Party Mana Pool)
     */
    const SharedManaPool = {
        /**
         * Cria ou normaliza um reservatório de mana compartilhada.
         */
        createPool(maxCapacity = 50, currentPE = 0) {
            const max = Math.max(1, Number(maxCapacity) || 50);
            const cur = Math.min(max, Math.max(0, Number(currentPE) || 0));
            return {
                maxCapacity: max,
                currentPE: cur,
                donations: []
            };
        },

        /**
         * Doa PE de um jogador para o reservatório compartilhado.
         */
        donateToPool(pool, playerName, amount, playerCurrentPE) {
            if (!pool || typeof pool !== 'object') throw new Error('Reservatório inválido.');
            const amt = Math.max(0, Math.floor(Number(amount) || 0));
            if (amt <= 0) throw new Error('A quantidade de PE deve ser maior que zero.');
            if (Number(playerCurrentPE) < amt) {
                return { success: false, reason: 'O jogador não possui PE suficiente para doar.', pool };
            }

            const freeSpace = pool.maxCapacity - pool.currentPE;
            const actualDonated = Math.min(amt, freeSpace);
            if (actualDonated <= 0) {
                return { success: false, reason: 'O reservatório de mana já está em sua capacidade máxima.', pool };
            }

            const newPool = {
                maxCapacity: pool.maxCapacity,
                currentPE: pool.currentPE + actualDonated,
                donations: [
                    ...pool.donations,
                    { from: playerName || 'Mago', amount: actualDonated, at: Date.now() }
                ]
            };

            return {
                success: true,
                donated: actualDonated,
                playerRemainingPE: playerCurrentPE - actualDonated,
                pool: newPool
            };
        },

        /**
         * Retira PE do reservatório compartilhado para uso em conjurações ou emergências.
         */
        withdrawFromPool(pool, playerName, amount) {
            if (!pool || typeof pool !== 'object') throw new Error('Reservatório inválido.');
            const amt = Math.max(0, Math.floor(Number(amount) || 0));
            if (amt <= 0) throw new Error('A quantidade de PE deve ser maior que zero.');
            if (pool.currentPE < amt) {
                return { success: false, reason: 'O reservatório não possui PE suficiente.', pool };
            }

            const newPool = {
                maxCapacity: pool.maxCapacity,
                currentPE: pool.currentPE - amt,
                donations: [
                    ...pool.donations,
                    { to: playerName || 'Mago', amount: -amt, at: Date.now() }
                ]
            };

            return {
                success: true,
                withdrawn: amt,
                pool: newPool
            };
        },

        /**
         * Transfere PE diretamente entre dois jogadores.
         */
        transferBetweenPlayers(fromPlayer, toPlayer, amount, fromPlayerPE, toPlayerMaxPE = Infinity) {
            const amt = Math.max(0, Math.floor(Number(amount) || 0));
            if (amt <= 0) throw new Error('Quantidade inválida para transferência.');
            if (Number(fromPlayerPE) < amt) {
                return { success: false, reason: 'Jogador de origem não possui PE suficiente.' };
            }

            return {
                success: true,
                transferred: amt,
                from: fromPlayer,
                to: toPlayer,
                fromNewPE: fromPlayerPE - amt,
                message: `✨ ${fromPlayer} canalizou ${amt} PE para ${toPlayer}!`
            };
        }
    };

    /**
     * Protocolo de Sincronização de Mesa em Tempo Real (Tabletop Sync Engine)
     */
    const TabletopSyncEngine = {
        /**
         * Constrói o payload para o Mestre liberar um puzzle na mesa virtual.
         */
        createPuzzleBroadcast(puzzle, roomCode = 'main') {
            if (!puzzle || typeof puzzle !== 'object') throw new Error('Puzzle inválido.');
            return {
                type: 'PUZZLE_RELEASED',
                roomCode,
                timestamp: Date.now(),
                puzzle: {
                    id: puzzle.id,
                    title: puzzle.title,
                    doorDescription: puzzle.doorDescription,
                    circleId: puzzle.circleId,
                    circleName: puzzle.circleName,
                    tier: puzzle.tier,
                    activePaths: puzzle.activePaths || [],
                    missingPaths: puzzle.missingPaths || [],
                    hints: puzzle.hints || [],
                    isSolved: false
                }
            };
        },

        /**
         * Constrói o payload para uma ação de conjuração conjunta de jogador.
         */
        createConjureActionBroadcast(playerName, circleId, role, rollResult) {
            return {
                type: 'COOPERATIVE_CONJURE_ACTION',
                timestamp: Date.now(),
                action: {
                    playerName: playerName || 'Mago',
                    circleId,
                    role: role || 'condutor',
                    rollResult: rollResult || 0
                }
            };
        },

        /**
         * Constrói o payload para o Mestre disparar um Evento Arcano Global (ex: Tempestade de Mana).
         */
        createArcaneEventBroadcast(eventKey, eventName, description, modifiers = {}) {
            return {
                type: 'ARCANE_GLOBAL_EVENT',
                timestamp: Date.now(),
                event: {
                    key: eventKey,
                    name: eventName,
                    description,
                    modifiers
                }
            };
        }
    };

    const MagicCooperationSystem = {
        RITUAL_ROLES,
        CooperativeRolesEngine,
        SharedManaPool,
        TabletopSyncEngine
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MagicCooperationSystem;
    } else {
        global.MagicCooperationSystem = MagicCooperationSystem;
    }
})(typeof window !== 'undefined' ? window : global);
