/**
 * @file combat-controller.js
 * @description Controlador de interface e fluxo de combate no VTT.
 * Orquestra turnos, renderização de combatentes, modais de ataque e integração com CombatEngine.
 * @module CombatController
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['CombatEngine'], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../core/combat-engine.js'));
    } else {
        root.CombatController = factory(root.CombatEngine);
    }
}(typeof self !== 'undefined' ? self : this, function (CombatEngine) {
    'use strict';

    const CombatController = {
        localCombatState: {
            combatants: [],
            combatRound: 1
        },

        /**
         * Inicializa ou atualiza a lista de combatentes no estado local.
         * @param {Array} combatants - Lista de combatentes
         * @param {number} [round=1] - Rodada atual
         */
        setCombatants(combatants, round = 1) {
            this.localCombatState.combatants = Array.isArray(combatants) ? combatants : [];
            this.localCombatState.combatRound = round;
        },

        /**
         * Retorna a lista atual de combatentes.
         * @returns {Array} Lista de combatentes
         */
        getCombatants() {
            return this.localCombatState.combatants;
        },

        /**
         * Rola iniciativa para todos os combatentes e os ordena.
         * @param {Array} combatants - Lista de combatentes
         * @returns {Array} Combatentes com iniciativa rolada e ordenados
         */
        rollInitiativeForAll(combatants) {
            if (!Array.isArray(combatants)) return [];

            const rolled = combatants.map(c => {
                const initRes = CombatEngine ? CombatEngine.calcInitiative(c.des || 2) : { total: 10 };
                return {
                    ...c,
                    init: initRes.total,
                    active: false
                };
            });

            const sorted = CombatEngine ? CombatEngine.sortCombatants(rolled) : rolled;
            if (sorted.length > 0) {
                sorted[0].active = true;
            }

            this.localCombatState.combatants = sorted;
            this.localCombatState.combatRound = 1;
            return sorted;
        },

        /**
         * Avança o turno para o próximo combatente vivo e processa condições/testes de morte.
         * @param {Array} combatants - Lista de combatentes
         * @param {number} currentRound - Rodada atual
         * @returns {{ combatants: Array, round: number, nextCombatant: Object, logs: Array }}
         */
        advanceTurn(combatants, currentRound = 1) {
            if (!Array.isArray(combatants) || combatants.length === 0) {
                return { combatants: [], round: currentRound, nextCombatant: null, logs: [] };
            }

            const logs = [];
            const updated = combatants.map(c => ({ ...c }));
            let activeIdx = updated.findIndex(c => c.active);
            if (activeIdx === -1) activeIdx = 0;

            updated[activeIdx].active = false;

            let nextIdx = (activeIdx + 1) % updated.length;
            let round = currentRound;

            let attempts = 0;
            while (updated[nextIdx].isDead && attempts < updated.length) {
                nextIdx = (nextIdx + 1) % updated.length;
                attempts++;
            }

            if (nextIdx === 0) {
                round++;
                logs.push(`⏳ Início da Rodada ${round}!`);
            }

            const nextCombatant = updated[nextIdx];
            nextCombatant.active = true;

            // Redução de Condições
            if (nextCombatant.conditions && nextCombatant.conditions.length > 0 && CombatEngine) {
                const processRes = CombatEngine.processConditions(nextCombatant.conditions);
                nextCombatant.conditions = processRes.conditions;
                processRes.expired.forEach(exp => {
                    logs.push(`✨ A condição ${exp.name} de ${nextCombatant.name} expirou!`);
                });
            }

            // Teste de Morte Automático se PV <= 0
            if (nextCombatant.pv <= 0 && !nextCombatant.isDead && !nextCombatant.isStabilized && CombatEngine) {
                const deathRes = CombatEngine.resolveDeathSave(nextCombatant);
                nextCombatant.deathFailures = deathRes.deathFailures;
                nextCombatant.isStabilized = deathRes.isStabilized;
                nextCombatant.isDead = deathRes.isDead;
                logs.push(deathRes.logString);

                if (deathRes.isDead) {
                    nextCombatant.active = false;
                }
            }

            this.localCombatState.combatants = updated;
            this.localCombatState.combatRound = round;

            return {
                combatants: updated,
                round,
                nextCombatant,
                logs
            };
        }
    };

    return CombatController;
}));
