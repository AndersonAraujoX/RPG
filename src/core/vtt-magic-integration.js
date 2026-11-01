/**
 * @file src/core/vtt-magic-integration.js
 * @description Integração do Sistema de Magia (+2d6) com a Mesa Virtual (VTT).
 * Permite que tokens no tabuleiro conjurem magias e círculos místicos, deduzindo
 * PE/PV em tempo real, aplicando modificadores do Mestre e gerando textos flutuantes.
 * @module VttMagicIntegration
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.VttMagicIntegration = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const VttMagicIntegration = {

        /**
         * Executa a conjuração de uma magia a partir de um token no tabuleiro.
         * @param {Object} token - Token do conjurador { id, name, hp, maxHp, pe, maxPe, x, y }.
         * @param {Object} spell - Magia a ser conjurada { id, spell, cd, pe, forma, paths, damage, heal }.
         * @param {Object} [options={}] - Opções injetadas (dado pré-determinado, eventos do mestre, alvo).
         * @returns {Object} Resultado detalhado da conjuração e efeitos no tabuleiro.
         */
        castSpellFromToken(token, spell, options = {}) {
            if (!token || typeof token !== 'object') {
                throw new Error('Token do conjurador é obrigatório.');
            }
            if (!spell || typeof spell !== 'object') {
                throw new Error('Dados da magia são obrigatórios.');
            }

            const spellName = spell.spell || spell.name || 'Feitiço Desconhecido';
            const basePECost = Number.isFinite(spell.pe) ? spell.pe : (Number.isFinite(spell.cost) ? spell.cost : 2);
            let targetCD = Number.isFinite(spell.cd) ? spell.cd : 10;
            let diceBonus = Number.isFinite(spell.bonus) ? spell.bonus : 0;
            const spellPaths = Array.isArray(spell.paths) ? spell.paths : (spell.path1 ? [spell.path1, spell.path2, spell.path3].filter(Boolean) : []);

            // 1. Modificadores do Modo Mestre (Clima / Evento Global Arcano)
            let masterEventNote = '';
            let peCostModifier = 0;
            if (options.activeMasterEvent && options.masterModeEngine && typeof options.masterModeEngine.calculateEventModifiers === 'function') {
                const evMod = options.masterModeEngine.calculateEventModifiers(options.activeMasterEvent, spellPaths);
                if (evMod.diceBonus !== 0) {
                    diceBonus += evMod.diceBonus;
                    masterEventNote = `Bônus de Evento do Mestre: ${evMod.diceBonus > 0 ? '+' : ''}${evMod.diceBonus}`;
                }
                if (evMod.cdModifier !== 0) {
                    targetCD += evMod.cdModifier;
                }
                if (evMod.peCostModifier !== 0) {
                    peCostModifier += evMod.peCostModifier;
                }
            }

            const effectivePECost = Math.max(0, basePECost + peCostModifier);

            // 2. Validação de PE disponível
            const currentPE = Number.isFinite(token.pe) ? token.pe : 0;
            if (currentPE < effectivePECost) {
                return {
                    success: false,
                    reason: `PE insuficiente (${currentPE} disponível, necessário ${effectivePECost} PE).`,
                    spellName,
                    peCost: effectivePECost,
                    token
                };
            }

            // 3. Dedução de PE do token conjurador
            token.pe = Math.max(0, currentPE - effectivePECost);

            // 4. Rolagem dos Dados 2d6
            let d1, d2;
            if (Array.isArray(options.predeterminedRoll) && options.predeterminedRoll.length === 2) {
                d1 = options.predeterminedRoll[0];
                d2 = options.predeterminedRoll[1];
            } else {
                d1 = Math.floor(Math.random() * 6) + 1;
                d2 = Math.floor(Math.random() * 6) + 1;
            }

            const diceTotal = d1 + d2;
            const totalRoll = diceTotal + diceBonus;
            const isCrit = (diceTotal === 12);
            const isFumble = (diceTotal === 2);
            const isSuccess = isCrit || (!isFumble && totalRoll >= targetCD);

            // 5. Síntese de Som se injetado
            if (options.soundSynthesizer && typeof options.soundSynthesizer.playDiceRollSound === 'function') {
                try {
                    options.soundSynthesizer.playDiceRollSound();
                } catch (e) {}
            }

            // 6. Textos de Combate Flutuantes gerados
            const floatingTexts = [
                {
                    tokenId: token.id,
                    x: token.x,
                    y: token.y,
                    text: `-${effectivePECost} PE`,
                    type: 'mana'
                }
            ];

            if (isCrit) {
                floatingTexts.push({
                    tokenId: token.id,
                    x: token.x,
                    y: token.y - 20,
                    text: 'CRÍTICO!',
                    type: 'crit'
                });
            } else if (isFumble) {
                floatingTexts.push({
                    tokenId: token.id,
                    x: token.x,
                    y: token.y - 20,
                    text: 'FALHA CRÍTICA!',
                    type: 'fumble'
                });
            }

            // 7. Efeitos em Alvo (se houver token alvo)
            const targetToken = options.targetToken || null;
            let targetEffect = null;

            if (targetToken && isSuccess) {
                const isDamageType = (Number.isFinite(spell.damage) && spell.damage > 0) || spell.type === 'damage';
                const isHealType = (Number.isFinite(spell.heal) && spell.heal > 0) || spell.type === 'heal';

                // Efeito de Dano
                if (isDamageType) {
                    const baseDamage = Number.isFinite(spell.damage) && spell.damage > 0
                        ? spell.damage
                        : (diceTotal + diceBonus);
                    const finalDamage = isCrit ? Math.round(baseDamage * 1.5) : baseDamage;
                    const prevHp = targetToken.hp;
                    targetToken.hp = Math.max(0, targetToken.hp - finalDamage);
                    targetEffect = { type: 'damage', amount: finalDamage, prevHp, newHp: targetToken.hp };

                    floatingTexts.push({
                        tokenId: targetToken.id,
                        x: targetToken.x,
                        y: targetToken.y,
                        text: `-${finalDamage} PV`,
                        type: 'damage'
                    });
                }
                // Efeito de Cura
                else if (isHealType) {
                    const baseHeal = Number.isFinite(spell.heal) && spell.heal > 0
                        ? spell.heal
                        : (diceTotal + diceBonus);
                    const finalHeal = isCrit ? Math.round(baseHeal * 1.5) : baseHeal;
                    const prevHp = targetToken.hp;
                    targetToken.hp = Math.min(targetToken.maxHp || targetToken.hp, targetToken.hp + finalHeal);
                    targetEffect = { type: 'heal', amount: finalHeal, prevHp, newHp: targetToken.hp };

                    floatingTexts.push({
                        tokenId: targetToken.id,
                        x: targetToken.x,
                        y: targetToken.y,
                        text: `+${finalHeal} PV`,
                        type: 'heal'
                    });
                }
            }

            return {
                success: isSuccess,
                isCrit,
                isCritical: isCrit,
                isFumble,
                spellName,
                peCost: effectivePECost,
                spellCost: effectivePECost,
                bonus: diceBonus,
                effectAmount: targetEffect ? targetEffect.amount : 0,
                d1,
                d2,
                diceTotal,
                diceBonus,
                totalRoll,
                targetCD,
                masterEventNote,
                tokenState: { id: token.id, pe: token.pe },
                targetEffect,
                floatingTexts
            };
        },

        /**
         * Executa a conjuração de uma magia especificando diretamente o alvo.
         * @param {Object} caster - Token do conjurador.
         * @param {Object} target - Token do alvo.
         * @param {Object} spell - Magia/Círculo.
         * @param {Object} [options={}] - Opções injetadas.
         */
        executeSpellCast(caster, target, spell, options = {}) {
            const result = this.castSpellFromToken(caster, spell, { targetToken: target, ...options });
            if (!result.success && result.reason) {
                if (options.throwOnError === false) {
                    return result;
                }
                throw new Error(result.reason);
            }
            return result;
        },

        /**
         * Gera a estrutura de estilo CSS e dados para elemento de texto flutuante no DOM.
         * @param {Object} item - { x, y, text, type }
         * @returns {Object} { className, style, innerText }
         */
        createFloatingTextDescriptor(item) {
            const type = item.type || 'normal';
            const colors = {
                damage: '#ef4444',
                heal: '#10b981',
                mana: '#38bdf8',
                crit: '#fbbf24',
                fumble: '#dc2626',
                normal: '#ffffff'
            };

            const color = colors[type] || colors.normal;

            return {
                text: item.text,
                type,
                color,
                x: item.x || 0,
                y: item.y || 0,
                animationDurationMs: 1200
            };
        }
    };

    return VttMagicIntegration;
}));
