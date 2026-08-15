/**
 * @file dice-roller.js
 * @description Motor puro de rolagens 2d6, testes de atributos, margens de sucesso e formatação
 * de mensagens para o Sistema +2d6 v2.3 (Newton Rocha).
 * @module DiceRoller
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.DiceRoller = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * @typedef {Object} RollOptions
     * @property {string} [skillName='Teste de Habilidade'] - Nome da perícia ou teste
     * @property {number} [skillBonus=0] - Bônus numérico da perícia
     * @property {string} [attrName='FOR'] - Nome do atributo relacionado
     * @property {number} [attrValue=2] - Nível do atributo (1 a 10+)
     * @property {number} [modOccasion=0] - Modificadores de ocasião ou situação
     * @property {number} [cd=10] - Classe de Dificuldade da tarefa
     * @property {boolean} [vsHuman=true] - Se o teste é contra o nível humano (ativa bônus sobre-humano)
     * @property {number} [forcedD1] - Dado 1 forçado opcional para testes
     * @property {number} [forcedD2] - Dado 2 forçado opcional para testes
     */

    const DiceRoller = {

        /**
         * Calcula o bônus adicional sobre-humano (+6) ou divino (+12) de um atributo.
         * @param {number} attrValue - Nível do atributo.
         * @param {boolean} [vsHuman=true] - Se a disputa é contra nível humano normal.
         * @returns {number} Bônus adicional (0, 6 ou 12).
         */
        getSuperhumanBonus(attrValue, vsHuman = true) {
            const val = parseInt(attrValue) || 0;
            if (!vsHuman) return 0;
            if (val > 10) return 12;
            if (val >= 6) return 6;
            return 0;
        },

        /**
         * Executa a rolagem oficial de um teste de perícia ou atributo no Sistema +2d6.
         * @param {RollOptions} options - Parâmetros do teste.
         * @returns {Object} Detalhes completos da rolagem, dados, modificadores e desfecho.
         */
        roll(options = {}) {
            const {
                skillName = 'Teste Geral',
                skillBonus = 0,
                attrName = 'GERAL',
                attrValue = 2,
                modOccasion = 0,
                cd = 10,
                vsHuman = true,
                forcedD1,
                forcedD2
            } = options;

            const d1 = forcedD1 ?? (Math.floor(Math.random() * 6) + 1);
            const d2 = forcedD2 ?? (Math.floor(Math.random() * 6) + 1);
            const diceSum = d1 + d2;

            const superhumanBonus = this.getSuperhumanBonus(attrValue, vsHuman);
            const total = diceSum + attrValue + skillBonus + superhumanBonus + modOccasion;

            const isCriticalSuccess = (diceSum === 12);
            const isCriticalFailure = (diceSum === 2);

            let success = false;
            let outcome = '';

            if (isCriticalSuccess) {
                success = true;
                outcome = '⭐ Acerto Crítico (6+6 nos dados)!';
            } else if (isCriticalFailure) {
                success = false;
                outcome = '💀 Falha Crítica (1+1 nos dados)!';
            } else {
                success = (total >= cd);
                const margin = total - cd;
                outcome = success
                    ? `✅ Sucesso (Margem: +${margin})`
                    : `❌ Fracasso (Margem: ${margin})`;
            }

            let formulaString = `2d6 [${d1}+${d2}] + ${attrName} (${attrValue})`;
            if (skillBonus > 0) formulaString += ` + Perícia (+${skillBonus})`;
            if (superhumanBonus > 0) formulaString += ` + Sobre-Humano (+${superhumanBonus})`;
            if (modOccasion !== 0) formulaString += ` + Mod (${modOccasion >= 0 ? '+' : ''}${modOccasion})`;
            formulaString += ` = ${total} (CD ${cd})`;

            return {
                d1,
                d2,
                diceSum,
                attrName,
                attrValue,
                skillBonus,
                superhumanBonus,
                modOccasion,
                cd,
                total,
                success,
                isCriticalSuccess,
                isCriticalFailure,
                outcome,
                formulaString,
                skillName
            };
        },

        /**
         * Formata uma rolagem de dados em HTML compacto para o histórico de chat da mesa.
         * @param {Object} rollResult - Objeto retornado por DiceRoller.roll().
         * @param {string} [author='Operativo'] - Nome do jogador/personagem.
         * @returns {string} String HTML formatada para o log.
         */
        formatForChat(rollResult, author = 'Operativo') {
            return `
                <div class="roll-chat-entry">
                    <span class="font-bold text-cyan-300 font-cinzel">${author}</span>
                    <span>rolou <strong>${rollResult.skillName}</strong>:</span>
                    <div class="text-xs text-gray-300 mt-0.5">${rollResult.formulaString}</div>
                    <div class="text-xs font-bold ${rollResult.success ? 'text-emerald-400' : 'text-red-400'} mt-0.5">${rollResult.outcome}</div>
                </div>
            `.trim();
        }
    };

    return DiceRoller;
}));
