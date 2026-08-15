/**
 * ============================================================================
 * Kuar-Tor — Módulo de Ficha de Personagem & Regras (+2d6 v2.3 Newton Rocha)
 * Implementa cálculos de atributos sobre-humanos, status derivados, dano de força,
 * iniciativa e rolagens diretas a partir de perícias.
 * ============================================================================
 */

(function (global) {
    'use strict';

    /**
     * Tabela Oficial de Dano de Força (+2d6 v2.3)
     */
    const FORCE_DAMAGE_TABLE = {
        0: '1d6-5',
        1: '1d6-4',
        2: '1d6-2',
        3: '1d6',
        4: '1d6+1',
        5: '1d6+2',
        6: '3d6',
        7: '4d6',
        8: '5d6',
        9: '6d6',
        10: '7d6'
    };

    /**
     * Objeto de Regras Puras (+2d6)
     */
    const CharacterSheetRules = {
        /**
         * 1. Bônus de Atributos Sobre-Humanos
         * - 1 a 5: Humano (+0 extra)
         * - 6 a 10: Sobre-Humano (+6 extra vs nível humano)
         * - > 10: Nível Divino (+12 extra vs nível humano)
         */
        calcSuperhumanBonus(attributeValue) {
            const val = parseInt(attributeValue) || 0;
            if (val > 10) {
                return { tier: 'divine', bonus: 12, label: 'Divino (+12)' };
            } else if (val >= 6) {
                return { tier: 'superhuman', bonus: 6, label: 'Sobre-Humano (+6)' };
            }
            return { tier: 'human', bonus: 0, label: 'Humano (+0)' };
        },

        /**
         * 2. Status Derivados
         * - PV Máximo = 10 + CON + FOR + (se CON >= 3 ganha +5 PVs extras)
         */
        calcMaxPV(con, forStat) {
            const c = parseInt(con) || 0;
            const f = parseInt(forStat) || 0;
            const conBonus = c >= 3 ? 5 : 0;
            return 10 + c + f + conBonus;
        },

        /**
         * - PE Máximo = POD + 10
         */
        calcMaxPE(pod) {
            const p = parseInt(pod) || 0;
            return p + 10;
        },

        /**
         * - Dano de Força conforme a tabela oficial:
         *   FOR 1 (1d6-4), FOR 2 (1d6-2), FOR 3 (1d6), FOR 4 (1d6+1), FOR 5 (1d6+2),
         *   FOR 6 (3d6), FOR 7 (4d6), FOR 8 (5d6), FOR 9 (6d6), FOR 10 (7d6).
         */
        calcForceDamage(forStat) {
            const f = parseInt(forStat) || 0;
            if (f <= 0) return '1d6-5';
            if (f <= 10) return FORCE_DAMAGE_TABLE[f] || '1d6';
            const extraDice = 7 + (f - 10);
            return `${extraDice}d6`;
        },

        /**
         * - Bônus de Iniciativa: Se DES >= 3, Bônus = DES - 2.
         */
        calcInitiativeBonus(des) {
            const d = parseInt(des) || 0;
            if (d >= 3) {
                return d - 2;
            }
            return 0;
        },

        /**
         * Rolagem Completa de Iniciativa (+2d6): 2d6 + DES + Bônus de Iniciativa
         */
        calcCombatInitiative(des, diceOverride = null) {
            const d = parseInt(des) || 0;
            const initBonus = this.calcInitiativeBonus(d);
            const d1 = diceOverride ? diceOverride[0] : Math.floor(Math.random() * 6) + 1;
            const d2 = diceOverride ? diceOverride[1] : Math.floor(Math.random() * 6) + 1;
            const diceSum = d1 + d2;
            const total = diceSum + d + initBonus;

            return {
                d1,
                d2,
                diceSum,
                des: d,
                initBonus,
                total,
                formulaString: `2d6 [${d1}+${d2}] + DES (${d}) + Bônus (${initBonus}) = ${total}`
            };
        },

        /**
         * 3. Redução Automática de Condições no início do turno
         */
        processTurnConditions(conditions = []) {
            const remaining = [];
            const expired = [];
            const messages = [];

            (conditions || []).forEach(cond => {
                const currentDuration = parseInt(cond.duration) || 1;
                const newDuration = currentDuration - 1;

                if (newDuration <= 0) {
                    expired.push({ ...cond, duration: 0 });
                    messages.push(`✨ Condição "${cond.name}" expirou!`);
                } else {
                    remaining.push({ ...cond, duration: newDuration });
                    messages.push(`⏳ "${cond.name}" dura mais ${newDuration} rodada(s).`);
                }
            });

            return {
                conditions: remaining,
                expired,
                messages
            };
        },

        /**
         * 4. Resolução em 1 Clique: Ataque, Defesa Oposta, Dano e Redução de Dano (RD)
         */
        resolveAttackAndDamage({
            attacker = { name: 'Atacante', attrVal: 3, skillBonus: 2, forVal: 3 },
            defender = { name: 'Alvo', des: 2, defenseSkill: 1, rd: 2, pv: 20, maxPv: 20, con: 2, forStat: 2 },
            weapon = { name: 'Espada Longa', baseDice: 1, baseMod: 2 },
            diceOverrideAttack = null,
            diceOverrideDefense = null,
            diceOverrideDamage = null
        }) {
            // A) Teste de Ataque
            const aD1 = diceOverrideAttack ? diceOverrideAttack[0] : Math.floor(Math.random() * 6) + 1;
            const aD2 = diceOverrideAttack ? diceOverrideAttack[1] : Math.floor(Math.random() * 6) + 1;
            const aDiceSum = aD1 + aD2;
            const attackTotal = aDiceSum + (attacker.attrVal || 0) + (attacker.skillBonus || 0);

            // B) Teste de Defesa Oposta
            const dD1 = diceOverrideDefense ? diceOverrideDefense[0] : Math.floor(Math.random() * 6) + 1;
            const dD2 = diceOverrideDefense ? diceOverrideDefense[1] : Math.floor(Math.random() * 6) + 1;
            const dDiceSum = dD1 + dD2;
            const defenseTotal = dDiceSum + (defender.des || 0) + (defender.defenseSkill || 0);

            // Críticos
            const isCrit = (aDiceSum === 12);
            const isFumble = (aDiceSum === 2);
            const isHit = isCrit || (!isFumble && attackTotal >= defenseTotal);

            let rawDamage = 0;
            let finalDamage = 0;
            let forceMod = 0;
            let dmgDiceRolls = [];

            if (isHit) {
                // Cálculo de Dano: Arma + Bônus de Força
                const numDice = weapon.baseDice || 1;
                for (let i = 0; i < numDice; i++) {
                    const dRoll = diceOverrideDamage ? diceOverrideDamage[i] || 4 : Math.floor(Math.random() * 6) + 1;
                    dmgDiceRolls.push(dRoll);
                    rawDamage += dRoll;
                }
                rawDamage += (weapon.baseMod || 0);

                // Dano de Força Oficial (+2d6)
                const fVal = attacker.forVal || 2;
                if (fVal === 1) forceMod = -4;
                else if (fVal === 2) forceMod = -2;
                else if (fVal === 3) forceMod = 0;
                else if (fVal === 4) forceMod = 1;
                else if (fVal === 5) forceMod = 2;
                else if (fVal >= 6) forceMod = 4; // FOR 6+ aplica dano massivo

                rawDamage = Math.max(1, rawDamage + forceMod);

                // Crítico = Dano Dobrado
                if (isCrit) {
                    rawDamage *= 2;
                }

                // Subtração de RD (Redução de Dano)
                const rd = defender.rd || 0;
                finalDamage = Math.max(0, rawDamage - rd);
            }

            const currentPv = defender.pv !== undefined ? defender.pv : 20;
            const newPv = isHit ? currentPv - finalDamage : currentPv;

            // Status de Inconsciência / Morte
            const isDying = newPv <= 0;
            const maxNegativePv = -((defender.con || 2) + (defender.forStat || 2) + 10);
            const isInstantDead = newPv <= maxNegativePv;

            let description = '';
            if (isFumble) {
                description = `💥 ${attacker.name} teve uma FALHA CRÍTICA no ataque contra ${defender.name}! (Dados: [1+1]=2)`;
            } else if (isCrit) {
                description = `✨ ACERTO CRÍTICO! ${attacker.name} atingiu ${defender.name} (Ataque ${attackTotal} vs Defesa ${defenseTotal}). Dano Dobrado: ${rawDamage} - RD ${defender.rd || 0} = ${finalDamage} PVs aplicados!`;
            } else if (isHit) {
                description = `⚔️ ${attacker.name} acertou ${defender.name}: Ataque ${attackTotal} vs Defesa ${defenseTotal} [SUCESSO]. Dano: ${rawDamage} - RD ${defender.rd || 0} = ${finalDamage} PVs aplicados!`;
            } else {
                description = `🛡️ ${defender.name} defendeu o ataque de ${attacker.name}! (Ataque ${attackTotal} vs Defesa ${defenseTotal})`;
            }

            return {
                isHit,
                isCrit,
                isFumble,
                attackTotal,
                defenseTotal,
                aD1, aD2, aDiceSum,
                dD1, dD2, dDiceSum,
                rawDamage,
                rd: defender.rd || 0,
                finalDamage,
                previousPv: currentPv,
                newPv,
                isDying,
                isInstantDead,
                description
            };
        },

        /**
         * 5. Teste de Morte Automático (+2d6 v2.3)
         * - Resultado >= 6: Sucesso (permanece vivo)
         * - Resultado < 6: Fracasso (+1 failure)
         * - Resultado == 12: Estabilização Automática!
         * - 3 Fracassos: MORTO
         */
        resolveDeathSave({ combatant = { name: 'Herói', deathFailures: 0 }, diceOverride = null }) {
            const d1 = diceOverride ? diceOverride[0] : Math.floor(Math.random() * 6) + 1;
            const d2 = diceOverride ? diceOverride[1] : Math.floor(Math.random() * 6) + 1;
            const sum = d1 + d2;

            let currentFailures = combatant.deathFailures || 0;
            let isStabilized = false;
            let isDead = false;
            let outcome = '';

            if (sum === 12) {
                isStabilized = true;
                currentFailures = 0;
                outcome = `✨ Estabilização Automática! (Rolou 12). Perigo de morte imediata removido.`;
            } else if (sum >= 6) {
                outcome = `🛡️ Sucesso no Teste de Morte (Rolou ${sum}). Permanece vivo e resistindo.`;
            } else {
                currentFailures += 1;
                outcome = `💀 Fracasso no Teste de Morte (Rolou ${sum}). Marcador de Fracasso: ${currentFailures}/3.`;
                if (currentFailures >= 3) {
                    isDead = true;
                    outcome += ` ☠️ MORTE DEFINITIVA! O combatente sucumbiu aos ferimentos.`;
                }
            }

            return {
                d1,
                d2,
                sum,
                deathFailures: currentFailures,
                isStabilized,
                isDead,
                isSuccess: sum >= 6,
                outcome,
                logString: `[Teste de Morte] ${combatant.name} rolou 2d6 [${d1}+${d2}] = ${sum}: ${outcome}`
            };
        },

        /**
         * Recuperação e Estabilização de Combatente
         */
        healOrStabilizeCombatant({ combatant = { pv: 0, maxPv: 20 }, healAmount = 5 }) {
            const heal = parseInt(healAmount) || 1;
            const prevPv = combatant.pv || 0;
            const newPv = Math.min(combatant.maxPv || 20, Math.max(1, prevPv + heal));

            return {
                previousPv: prevPv,
                newPv,
                deathFailures: 0,
                isStabilized: true,
                isDying: false,
                isDead: false,
                message: `💚 ${combatant.name} recebeu primeiros socorros/cura (+${heal} PVs) e foi ESTABILIZADO!`
            };
        },

        /**
         * Bônus Efetivo Total de um Atributo em teste contra humano
         */
        calcEffectiveAttributeBonus(attrValue, vsHuman = true) {
            const base = parseInt(attrValue) || 0;
            const extra = vsHuman ? this.calcSuperhumanBonus(base).bonus : 0;
            return base + extra;
        },

        /**
         * 3. Rolagem Direta a partir das Perícias (+2d6)
         */
        rollSkillTest({
            skillName = 'Perícia',
            skillBonus = 0,
            attrName = 'DES',
            attrValue = 0,
            modOccasion = 0,
            cd = 10,
            vsHuman = true,
            diceOverride = null // Usado em testes unitários para simulação determinística
        }) {
            const d1 = diceOverride ? diceOverride[0] : Math.floor(Math.random() * 6) + 1;
            const d2 = diceOverride ? diceOverride[1] : Math.floor(Math.random() * 6) + 1;
            const diceSum = d1 + d2;

            const baseAttr = parseInt(attrValue) || 0;
            const shBonus = vsHuman ? this.calcSuperhumanBonus(baseAttr).bonus : 0;
            const effectiveAttr = baseAttr + shBonus;
            const skill = parseInt(skillBonus) || 0;
            const mod = parseInt(modOccasion) || 0;

            const total = diceSum + skill + effectiveAttr + mod;
            const margin = total - cd;

            let outcome = '';
            let isCrit = false;
            let isFumble = false;

            if (diceSum === 12) {
                outcome = '✨ Acerto Crítico!';
                isCrit = true;
            } else if (diceSum === 2) {
                outcome = '💥 Falha Crítica!';
                isFumble = true;
            } else if (total >= cd) {
                outcome = `✓ Sucesso (Margem +${margin})`;
            } else {
                outcome = `✗ Falha (Margem ${margin})`;
            }

            return {
                skillName,
                skillBonus: skill,
                attrName,
                attrValue: baseAttr,
                superhumanBonus: shBonus,
                effectiveAttr,
                modOccasion: mod,
                d1,
                d2,
                diceSum,
                total,
                cd,
                margin,
                outcome,
                isCrit,
                isFumble,
                isSuccess: diceSum === 12 || (diceSum !== 2 && total >= cd),
                formulaString: `2d6 [${d1}+${d2}] + Perícia (${skill}) + ${attrName} (${baseAttr}${shBonus ? `+${shBonus} Sobre-Humano` : ''}) + Mod (${mod}) = ${total} vs CD ${cd}`
            };
        }
    };

    /**
     * Controlador de Interface da Ficha de Personagem (DOM Manager)
     */
    class CharacterSheetController {
        constructor(config = {}) {
            this.config = Object.assign({
                sheetContainerId: 'character-sheet',
                onRollCallback: null
            }, config);

            this.data = {
                charName: 'Operativo',
                concept: 'Guerreiro de Kuar-Tor',
                attributes: {
                    FOR: 2,
                    DES: 2,
                    CON: 2,
                    INT: 2,
                    SAB: 2,
                    CAR: 2,
                    POD: 2
                },
                skills: [
                    { name: 'Luta Armada', bonus: 2, attr: 'FOR' },
                    { name: 'Pontaria / Armas de Fogo', bonus: 2, attr: 'DES' },
                    { name: 'Atletismo / Esquiva', bonus: 1, attr: 'DES' },
                    { name: 'Percepção', bonus: 1, attr: 'SAB' },
                    { name: 'Medicina de Campo', bonus: 1, attr: 'INT' },
                    { name: 'Sobrevivência', bonus: 2, attr: 'SAB' }
                ],
                advantages: ['Visão Noturna', 'Reflexos Rápidos'],
                disadvantages: ['Inimigo Mortal (Cultistas)'],
                inventory: ['Espada Longa', 'Colete Kevlar', 'Kit Médico', 'Tocha']
            };

            if (typeof document !== 'undefined') {
                this.initDOM();
            }
        }

        initDOM() {
            this.bindAttributeEvents();
            this.recalculateAllStats();
            this.renderSkillsList();
        }

        /**
         * Vincula eventos onchange/input aos campos de atributos
         */
        bindAttributeEvents() {
            const attrKeys = ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR', 'POD'];

            attrKeys.forEach(attr => {
                // Suporte para múltiplos IDs comuns no projeto: #for, #attr-for, #FOR, etc.
                const inputs = [
                    document.getElementById(attr.toLowerCase()),
                    document.getElementById(`attr-${attr.toLowerCase()}`),
                    document.getElementById(attr),
                    document.getElementById(`input-${attr.toLowerCase()}`)
                ].filter(Boolean);

                inputs.forEach(input => {
                    input.onchange = (e) => this.handleAttributeChange(attr, e.target.value);
                    input.oninput = (e) => this.handleAttributeChange(attr, e.target.value);
                });
            });
        }

        handleAttributeChange(attr, value) {
            const intVal = parseInt(value) || 0;
            this.data.attributes[attr] = intVal;
            this.recalculateAllStats();
            this.renderSkillsList();
        }

        /**
         * Recalcula todos os status derivados e atualiza o DOM
         */
        recalculateAllStats() {
            const attrs = this.data.attributes;

            // 1. Cálculos de Regras
            const maxPV = CharacterSheetRules.calcMaxPV(attrs.CON, attrs.FOR);
            const maxPE = CharacterSheetRules.calcMaxPE(attrs.POD);
            const forceDamage = CharacterSheetRules.calcForceDamage(attrs.FOR);
            const initiativeBonus = CharacterSheetRules.calcInitiativeBonus(attrs.DES);

            // 2. Atualização dos Elementos no DOM
            this.updateFieldText(['#display-pv-max', '#pontosVida', '#pv-max', '#char-pv'], maxPV);
            this.updateFieldText(['#display-pe-max', '#pontosEnergia', '#pe-max', '#char-pe'], maxPE);
            this.updateFieldText(['#display-dano-forca', '#dano-forca', '#danoForca', '#char-dmg'], forceDamage);
            this.updateFieldText(['#display-iniciativa', '#iniciativa-bonus', '#iniciativaBonus', '#char-init'], `+${initiativeBonus}`);

            // 3. Atualizar Badges de Atributos Sobre-Humanos / Divinos
            Object.keys(attrs).forEach(attr => {
                const bonusInfo = CharacterSheetRules.calcSuperhumanBonus(attrs[attr]);
                const badgeEl = document.getElementById(`badge-sh-${attr.toLowerCase()}`);
                if (badgeEl) {
                    if (bonusInfo.bonus > 0) {
                        badgeEl.innerText = bonusInfo.label;
                        badgeEl.className = bonusInfo.tier === 'divine'
                            ? 'text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-500 px-1.5 py-0.5 rounded shadow'
                            : 'text-[10px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-400 px-1.5 py-0.5 rounded shadow';
                        badgeEl.style.display = 'inline-block';
                    } else {
                        badgeEl.style.display = 'none';
                    }
                }
            });
        }

        updateFieldText(selectors, value) {
            selectors.forEach(sel => {
                const el = document.querySelector(sel);
                if (el) {
                    if (el.tagName === 'INPUT') {
                        el.value = value;
                    } else {
                        el.innerText = value;
                    }
                }
            });
        }

        /**
         * Renderiza a Lista de Perícias com Botões de Rolagem Direta
         */
        renderSkillsList() {
            const container = document.getElementById('displaySkills') || document.getElementById('skills-list-container');
            if (!container) return;

            if (!this.data.skills || this.data.skills.length === 0) {
                container.innerHTML = '<div class="text-xs text-gray-500 italic p-2">Nenhuma perícia treinada.</div>';
                return;
            }

            container.innerHTML = this.data.skills.map((skill, index) => {
                const attrVal = this.data.attributes[skill.attr] || 0;
                const shBonus = CharacterSheetRules.calcSuperhumanBonus(attrVal).bonus;
                const totalMod = skill.bonus + attrVal + shBonus;

                return `
                    <div class="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 hover:border-cyan-500/40 transition mb-1.5 text-xs">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-slate-200">${skill.name}</span>
                            <span class="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                                +${skill.bonus} (${skill.attr})
                            </span>
                            ${shBonus > 0 ? `<span class="text-[9px] text-amber-300 font-bold bg-amber-950/60 px-1 rounded border border-amber-600">+${shBonus} SH</span>` : ''}
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="font-mono text-gray-400 text-[11px]">Total: <strong class="text-emerald-400">+${totalMod}</strong></span>
                            <button type="button" onclick="CharacterSheet.rollSkillDirectly(${index})" class="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-cinzel font-bold text-[11px] rounded transition shadow flex items-center gap-1">
                                <i class="fa-solid fa-dice"></i> Rolar
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        /**
         * Executa rolagem direta de uma perícia e atualiza o rolador/chat
         */
        rollSkillDirectly(skillIndexOrName) {
            let skill = null;
            if (typeof skillIndexOrName === 'number') {
                skill = this.data.skills[skillIndexOrName];
            } else {
                skill = this.data.skills.find(s => s.name.toLowerCase() === skillIndexOrName.toLowerCase());
            }

            if (!skill) {
                console.error('Perícia não encontrada para rolagem:', skillIndexOrName);
                return;
            }

            const attrVal = this.data.attributes[skill.attr] || 0;
            const rollResult = CharacterSheetRules.rollSkillTest({
                skillName: skill.name,
                skillBonus: skill.bonus,
                attrName: skill.attr,
                attrValue: attrVal,
                modOccasion: 0,
                cd: 10,
                vsHuman: true
            });

            // 1. Notifica o Rolador Global ou Chat se disponível
            if (typeof this.config.onRollCallback === 'function') {
                this.config.onRollCallback(rollResult);
            } else if (typeof window !== 'undefined' && typeof window.appendChatMessage === 'function') {
                window.appendChatMessage(`Perícia: ${skill.name}`, rollResult.formulaString + ' &middot; <strong>' + rollResult.outcome + '</strong>', rollResult.isCrit ? 'crit' : (rollResult.isFumble ? 'fumble' : 'normal'));
            } else if (typeof alert === 'function') {
                alert(`🎲 ${rollResult.formulaString}\nResultado: ${rollResult.outcome}`);
            }

            return rollResult;
        }

        addSkill(name, bonus, attr = 'DES') {
            this.data.skills.push({ name, bonus: parseInt(bonus) || 1, attr: attr.toUpperCase() });
            this.renderSkillsList();
        }

        removeSkill(index) {
            this.data.skills.splice(index, 1);
            this.renderSkillsList();
        }
    }

    // Instância global única para binding direto nos eventos onclick
    const globalController = new CharacterSheetController();

    // Exportação
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            CharacterSheetRules,
            CharacterSheetController,
            FORCE_DAMAGE_TABLE
        };
    } else {
        global.CharacterSheetRules = CharacterSheetRules;
        global.CharacterSheetController = CharacterSheetController;
        global.CharacterSheet = globalController;
    }

})(typeof window !== 'undefined' ? window : global);
