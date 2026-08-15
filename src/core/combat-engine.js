/**
 * @file combat-engine.js
 * @description Motor puro de resolução de combate, iniciativa, testes opostos, acertos críticos,
 * redução de dano (RD), redução de duração de condições e testes de morte para o Sistema +2d6 v2.3.
 * @module CombatEngine
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CombatEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * @typedef {Object} Condition
     * @property {string} name - Nome da condição (ex: "Em Chamas", "Pasmar")
     * @property {number} duration - Duração restante em rodadas
     */

    /**
     * @typedef {Object} Combatant
     * @property {string} id - Identificador único do combatente
     * @property {string} name - Nome do combatente
     * @property {number} des - Atributo Destreza
     * @property {number} forVal - Atributo Força
     * @property {number} [pv=15] - Pontos de Vida atuais
     * @property {number} [maxPv=15] - Pontos de Vida máximos
     * @property {number} [rd=0] - Redução de Dano da armadura
     * @property {number} [init=0] - Valor de iniciativa rolado
     * @property {boolean} [active=false] - Se é o turno ativo deste combatente
     * @property {boolean} [isDead=false] - Se o combatente sofreu morte definitiva
     * @property {boolean} [isStabilized=false] - Se o combatente está inconsciente mas estabilizado
     * @property {number} [deathFailures=0] - Contador de fracassos em testes de morte (máx 3)
     * @property {Condition[]} [conditions=[]] - Lista de condições ativas
     */

    /**
     * @typedef {Object} Weapon
     * @property {string} name - Nome da arma
     * @property {number} dice - Quantidade de dados d6
     * @property {number} mod - Modificador numérico fixo de dano
     * @property {string} [attrType='FOR'] - Atributo base ('FOR' ou 'DES')
     * @property {number} [skillBonus=0] - Bônus de perícia do atacante com esta arma
     */

    const CombatEngine = {

        /**
         * Calcula a iniciativa oficial de um combatente: 2d6 + DES + Bônus (se DES >= 3, DES - 2).
         * @param {number} desVal - Valor da Destreza do combatente.
         * @param {number} [forcedRoll] - Rolagem fixa opcional para testes previsíveis.
         * @returns {{ d1: number, d2: number, diceTotal: number, des: number, bonus: number, total: number }}
         */
        calcInitiative(desVal, forcedRoll = null) {
            const des = parseInt(desVal) || 0;
            const bonus = des >= 3 ? (des - 2) : 0;
            let d1, d2, diceTotal;

            if (forcedRoll !== null && typeof forcedRoll === 'number') {
                d1 = Math.floor(forcedRoll / 2);
                d2 = forcedRoll - d1;
                diceTotal = forcedRoll;
            } else {
                d1 = Math.floor(Math.random() * 6) + 1;
                d2 = Math.floor(Math.random() * 6) + 1;
                diceTotal = d1 + d2;
            }

            return {
                d1,
                d2,
                diceTotal,
                des,
                bonus,
                total: diceTotal + des + bonus
            };
        },

        /**
         * Ordena a lista de combatentes do maior valor de iniciativa para o menor.
         * @param {Combatant[]} combatants - Lista de combatentes.
         * @returns {Combatant[]} Nova lista ordenada decrescentemente.
         */
        sortCombatants(combatants) {
            if (!Array.isArray(combatants)) return [];
            return [...combatants].sort((a, b) => (b.init || 0) - (a.init || 0));
        },

        /**
         * Reduz em -1 a duração das condições de um combatente no início do seu turno.
         * @param {Condition[]} conditions - Lista de condições do combatente.
         * @returns {{ conditions: Condition[], expired: Condition[] }}
         */
        processConditions(conditions) {
            if (!Array.isArray(conditions)) return { conditions: [], expired: [] };

            const updated = [];
            const expired = [];

            conditions.forEach(cond => {
                const newDuration = (cond.duration || 1) - 1;
                if (newDuration <= 0) {
                    expired.push({ ...cond, duration: 0 });
                } else {
                    updated.push({ ...cond, duration: newDuration });
                }
            });

            return { conditions: updated, expired };
        },

        /**
         * Executa a resolução completa de Ataque vs Defesa Oposta em 1 Clique.
         * @param {Object} params
         * @param {Combatant} params.attacker - Combatente que desfere o ataque.
         * @param {Combatant} params.defender - Combatente alvo.
         * @param {Weapon} params.weapon - Arma utilizada.
         * @param {Object} [params.forcedRolls] - Rolagens forçadas opcionais para testes unitários.
         * @returns {Object} Resultado detalhado do ataque, dano, RD e novo PV do alvo.
         */
        resolveAttack(params) {
            const { attacker, defender, weapon, forcedRolls } = params;

            const attAttrVal = weapon.attrType === 'DES' ? (attacker.des || 2) : (attacker.forVal || 2);
            const attSkill = weapon.skillBonus || 0;
            const defSkill = defender.defenseSkill || 0;
            const defAttrVal = defender.des || 2;

            // Rolagens de Ataque
            const attD1 = forcedRolls?.attD1 ?? (Math.floor(Math.random() * 6) + 1);
            const attD2 = forcedRolls?.attD2 ?? (Math.floor(Math.random() * 6) + 1);
            const attDiceSum = attD1 + attD2;
            const attTotal = attDiceSum + attAttrVal + attSkill;

            const isCriticalHit = (attDiceSum === 12);
            const isCriticalFail = (attDiceSum === 2);

            // Rolagens de Defesa
            const defD1 = forcedRolls?.defD1 ?? (Math.floor(Math.random() * 6) + 1);
            const defD2 = forcedRolls?.defD2 ?? (Math.floor(Math.random() * 6) + 1);
            const defDiceSum = defD1 + defD2;
            const defTotal = defDiceSum + defAttrVal + defSkill;

            const hit = !isCriticalFail && (isCriticalHit || attTotal >= defTotal);

            let rawDamage = 0;
            let finalDamage = 0;
            let targetNewPv = defender.pv;

            if (hit) {
                let weaponDiceRoll = 0;
                const numDice = isCriticalHit ? (weapon.dice * 2) : weapon.dice;

                if (forcedRolls?.damageRoll !== undefined) {
                    weaponDiceRoll = forcedRolls.damageRoll;
                } else {
                    for (let i = 0; i < numDice; i++) {
                        weaponDiceRoll += Math.floor(Math.random() * 6) + 1;
                    }
                }

                const attrDamageBonus = weapon.attrType === 'DES' ? 0 : Math.max(0, (attacker.forVal || 2) - 2);
                rawDamage = Math.max(1, weaponDiceRoll + (weapon.mod || 0) + attrDamageBonus);
                const rd = defender.rd || 0;
                finalDamage = Math.max(0, rawDamage - rd);
                targetNewPv = Math.max(-20, defender.pv - finalDamage);
            }

            return {
                hit,
                isCriticalHit,
                isCriticalFail,
                attacker: {
                    name: attacker.name,
                    d1: attD1,
                    d2: attD2,
                    diceSum: attDiceSum,
                    total: attTotal
                },
                defender: {
                    name: defender.name,
                    d1: defD1,
                    d2: defD2,
                    diceSum: defDiceSum,
                    total: defTotal,
                    rd: defender.rd || 0,
                    oldPv: defender.pv,
                    newPv: targetNewPv
                },
                weaponName: weapon.name,
                rawDamage,
                finalDamage,
                summaryText: hit
                    ? `${attacker.name} ACERTOU ${defender.name} causando ${finalDamage} de dano (${rawDamage} - RD ${defender.rd || 0})!`
                    : `${attacker.name} ERROU o ataque contra ${defender.name}!`
            };
        },

        /**
         * Executa o Teste de Morte automático para um combatente com PV <= 0.
         * @param {Combatant} combatant - Combatente com PV <= 0.
         * @param {number} [forcedRoll] - Rolagem fixa de 2d6 opcional para testes.
         * @returns {Object} Resultado do teste de morte, novo número de falhas e status.
         */
        resolveDeathSave(combatant, forcedRoll = null) {
            let d1, d2, sum;
            if (forcedRoll !== null) {
                d1 = Math.floor(forcedRoll / 2);
                d2 = forcedRoll - d1;
                sum = forcedRoll;
            } else {
                d1 = Math.floor(Math.random() * 6) + 1;
                d2 = Math.floor(Math.random() * 6) + 1;
                sum = d1 + d2;
            }

            let deathFailures = combatant.deathFailures || 0;
            let isStabilized = combatant.isStabilized || false;
            let isDead = combatant.isDead || false;
            let outcome = '';

            if (sum >= 11) {
                isStabilized = true;
                outcome = `✨ Rolou ${sum} (2d6 [${d1}+${d2}]) — ESTABILIZOU automaticamente!`;
            } else if (sum >= 6) {
                outcome = `🛡️ Rolou ${sum} (2d6 [${d1}+${d2}]) — Resistiu à morte nesta rodada.`;
            } else {
                deathFailures++;
                if (deathFailures >= 3) {
                    isDead = true;
                    outcome = `☠️ Rolou ${sum} (2d6 [${d1}+${d2}]) — 3º Fracasso! O combatente MORREU.`;
                } else {
                    outcome = `💀 Rolou ${sum} (2d6 [${d1}+${d2}]) — Fracasso no Teste de Morte (${deathFailures}/3 falhas).`;
                }
            }

            return {
                d1,
                d2,
                sum,
                deathFailures,
                isStabilized,
                isDead,
                logString: `[Teste de Morte] ${combatant.name}: ${outcome}`
            };
        },

        /**
         * Cura ou estabiliza um combatente (Primeiros Socorros / Magia).
         * @param {Combatant} combatant - Combatente a receber socorro.
         * @param {number} [healAmount=1] - Quantidade de PV a curar.
         * @returns {Combatant} Objeto combatente atualizado.
         */
        healOrStabilize(combatant, healAmount = 1) {
            const currentPv = combatant.pv || 0;
            const maxPv = combatant.maxPv || 15;
            const newPv = Math.min(maxPv, currentPv + healAmount);

            return {
                ...combatant,
                pv: newPv,
                isStabilized: newPv > 0,
                isDead: false,
                deathFailures: newPv > 0 ? 0 : combatant.deathFailures
            };
        }
    };

    return CombatEngine;
}));
