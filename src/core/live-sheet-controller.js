/**
 * ============================================================================
 * Kuar-Tor — LiveSheetController (Pilar 3: Modo Ficha de Jogo & Pilar 4: Ecossistema)
 * Controlador desacoplado e puro para gerenciamento de fichas de RPG em tempo
 * real durante as sessões de jogo (+2d6 v2.3 Newton Rocha).
 *
 * Responsabilidades (SOLID):
 * 1. Controle Rápido de Vida (PV) e Energia (PE), descansos curto/longo e clamping.
 * 2. Rastreador de Condições Temporárias (Sangrando, Atordoado, Em Guarda, Inconsciente, etc.).
 * 3. Resolução de Rolagens Diretas em 1 Clique (+2d6) integrando modificadores e críticos.
 * 4. Geração de Cartões de Ataques e Magias pré-calculados.
 * 5. Integração com Ecossistema Kuar-Tor:
 *    - Payload e sincronia com a Mesa Virtual (VTT 2D).
 *    - Sincronia bidirecional com o Grimório da Árvore de Magia.
 *    - Duplicação e clonagem segura de fichas.
 *    - Exportação/importação em JSON e dados para PDF.
 * ============================================================================
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./character-sheet', './dice-roller'], factory);
    } else if (typeof module === 'object' && module.exports) {
        const charSheet = require('./character-sheet');
        const diceRoller = require('./dice-roller');
        module.exports = factory(charSheet, diceRoller);
    } else {
        root.LiveSheetController = factory(root.CharacterSheetRules, root.DiceRoller);
    }
}(typeof self !== 'undefined' ? self : this, function (CharacterSheetRules, DiceRoller) {
    'use strict';

    // Condições Oficiais do Cenário Kuar-Tor (+2d6)
    const CONDITIONS = {
        SANGRANDO: {
            id: 'sangrando',
            name: 'Sangrando',
            icon: '🩸',
            desc: 'Perde 1d6 PV por rodada se não for estancado.',
            attackMod: 0,
            defenseMod: 0
        },
        ATORDOADO: {
            id: 'atordoado',
            name: 'Atordoado',
            icon: '⚡',
            desc: '-2 em todos os testes e rolagens ativas.',
            attackMod: -2,
            defenseMod: -2
        },
        EM_GUARDA: {
            id: 'em_guarda',
            name: 'Em Guarda',
            icon: '🛡️',
            desc: '+2 na Defesa Passiva e testes de Esquiva.',
            attackMod: 0,
            defenseMod: 2
        },
        INCONSCIENTE: {
            id: 'inconsciente',
            name: 'Inconsciente',
            icon: '💀',
            desc: 'PV zerado. Incapacitado de realizar ações.',
            attackMod: -99,
            defenseMod: -5
        },
        CEGO: {
            id: 'cego',
            name: 'Cego',
            icon: '👁️',
            desc: '-4 em testes visuais, pontaria e ataques à distância.',
            attackMod: -4,
            defenseMod: -2
        },
        IMOBILIZADO: {
            id: 'imobilizado',
            name: 'Imobilizado',
            icon: '🕸️',
            desc: 'Deslocamento 0 e penalidade de -3 na Defesa/Esquiva.',
            attackMod: -2,
            defenseMod: -3
        }
    };

    const LiveSheetController = {
        CONDITIONS,

        // =====================================================================
        // 1. CONTROLE RÁPIDO DE PV E PE (FLUXO VITAL & DESCANSOS)
        // =====================================================================

        /**
         * Modifica os Pontos de Vida atuais garantindo limites (clamping entre 0 e maxHP).
         * Automaticamente sinaliza ou ativa inconsciência se HP chegar a 0.
         */
        modifyHP(currentHP, maxHP, delta) {
            const max = Math.max(1, parseInt(maxHP) || 1);
            const cur = typeof currentHP === 'number' ? currentHP : (parseInt(currentHP) || 0);
            const d = parseInt(delta) || 0;

            const newHP = Math.min(max, Math.max(0, cur + d));
            const isUnconscious = (newHP === 0);

            return {
                currentHP: newHP,
                maxHP: max,
                delta: d,
                percentage: Math.round((newHP / max) * 100),
                isUnconscious
            };
        },

        /**
         * Modifica os Pontos de Energia atuais garantindo limites (clamping entre 0 e maxPE).
         */
        modifyPE(currentPE, maxPE, delta) {
            const max = Math.max(0, parseInt(maxPE) || 0);
            const cur = typeof currentPE === 'number' ? currentPE : (parseInt(currentPE) || 0);
            const d = parseInt(delta) || 0;

            const newPE = Math.min(max, Math.max(0, cur + d));

            return {
                currentPE: newPE,
                maxPE: max,
                delta: d,
                percentage: max > 0 ? Math.round((newPE / max) * 100) : 0
            };
        },

        /**
         * Aplica Descanso Curto: Recupera metade do PE Máximo (arredondado para cima) ou quantia customizada.
         */
        applyShortRest(currentPE, maxPE, customAmount = null) {
            const max = Math.max(0, parseInt(maxPE) || 0);
            const cur = Math.max(0, parseInt(currentPE) || 0);
            const recovery = customAmount !== null ? Math.max(0, parseInt(customAmount) || 0) : Math.ceil(max / 2);

            const newPE = Math.min(max, cur + recovery);
            return {
                currentPE: newPE,
                recoveredPE: newPE - cur,
                maxPE: max
            };
        },

        /**
         * Aplica Descanso Longo: Restaura 100% de PV e PE e limpa condições temporárias comuns.
         */
        applyLongRest(maxHP, maxPE, currentConditions = []) {
            const maxH = Math.max(1, parseInt(maxHP) || 1);
            const maxP = Math.max(0, parseInt(maxPE) || 0);

            // Remove condições normais como sangrando, atordoado e inconsciente
            const clearedConditions = (Array.isArray(currentConditions) ? currentConditions : [])
                .filter(c => ['sangrando', 'atordoado', 'inconsciente', 'em_guarda'].includes(c));

            const remainingConditions = (Array.isArray(currentConditions) ? currentConditions : [])
                .filter(c => !clearedConditions.includes(c));

            return {
                currentHP: maxH,
                currentPE: maxP,
                maxHP: maxH,
                maxPE: maxP,
                clearedConditions,
                conditions: remainingConditions
            };
        },

        // =====================================================================
        // 2. RASTREADOR DE CONDIÇÕES TEMPORÁRIAS
        // =====================================================================

        /**
         * Alterna (toggle) o estado de uma condição na lista ativa.
         */
        toggleCondition(activeConditions, conditionId) {
            const list = Array.isArray(activeConditions) ? [...activeConditions] : [];
            const key = String(conditionId || '').toLowerCase().trim();

            if (!key) return list;

            const idx = list.indexOf(key);
            if (idx >= 0) {
                list.splice(idx, 1);
            } else {
                list.push(key);
            }
            return list;
        },

        /**
         * Calcula modificadores cumulativos decorrentes das condições ativas.
         */
        getConditionModifiers(activeConditions) {
            const list = Array.isArray(activeConditions) ? activeConditions : [];
            let attackMod = 0;
            let defenseMod = 0;
            let isUnconscious = false;

            list.forEach(cId => {
                const norm = String(cId).toLowerCase();
                const cond = Object.values(CONDITIONS).find(c => c.id === norm);
                if (cond) {
                    attackMod += cond.attackMod || 0;
                    defenseMod += cond.defenseMod || 0;
                    if (cond.id === 'inconsciente') isUnconscious = true;
                }
            });

            return {
                attackMod,
                defenseMod,
                isUnconscious
            };
        },

        /**
         * Calcula a Defesa Passiva Efetiva: 7 + DES + Perícia de Esquiva + Modificadores de Condição.
         */
        getEffectiveDefense(desValue, esquivaSkill = 0, activeConditions = []) {
            const des = parseInt(desValue) || 0;
            const esq = parseInt(esquivaSkill) || 0;
            const baseDefense = 7 + des + esq;
            const mods = this.getConditionModifiers(activeConditions);

            return Math.max(1, baseDefense + mods.defenseMod);
        },

        // =====================================================================
        // 3. ROLAGENS DIRETAS EM 1 CLIQUE (+2d6)
        // =====================================================================

        /**
         * Executa ou calcula um teste de perícia/atributo em 1 clique (+2d6) com dados forçados opcionais.
         */
        rollSkill(options = {}) {
            const {
                skillName = 'Teste Geral',
                skillBonus = 0,
                attrValue = 2,
                attrName = 'GERAL',
                cd = 10,
                activeConditions = [],
                forcedD1 = null,
                forcedD2 = null
            } = options;

            const d1 = forcedD1 !== null ? forcedD1 : (Math.floor(Math.random() * 6) + 1);
            const d2 = forcedD2 !== null ? forcedD2 : (Math.floor(Math.random() * 6) + 1);
            const diceSum = d1 + d2;

            const condMods = this.getConditionModifiers(activeConditions);
            const conditionPenalty = condMods.attackMod; // Afeta rolagens ativas

            const attrVal = parseInt(attrValue) || 0;
            const skillVal = parseInt(skillBonus) || 0;
            const superhumanBonus = (attrVal > 10 ? 12 : (attrVal >= 6 ? 6 : 0));

            const total = diceSum + attrVal + skillVal + superhumanBonus + conditionPenalty;
            const isCriticalSuccess = (diceSum === 12);
            const isCriticalFailure = (diceSum === 2);

            let success = false;
            let outcome = '';

            if (isCriticalSuccess) {
                success = true;
                outcome = '⭐ Acerto Crítico (12 nos dados)! Sucesso Máximo!';
            } else if (isCriticalFailure) {
                success = false;
                outcome = '💀 Falha Crítica (2 nos dados)! Complicação Séria!';
            } else {
                success = (total >= cd);
                const margin = total - cd;
                outcome = success ? `✅ Sucesso (Margem: +${margin})` : `❌ Fracasso (Margem: ${margin})`;
            }

            let formula = `2d6 [${d1}+${d2}] + ${attrName} (${attrVal})`;
            if (skillVal > 0) formula += ` + Perícia (+${skillVal})`;
            if (superhumanBonus > 0) formula += ` + Sobre-Humano (+${superhumanBonus})`;
            if (conditionPenalty !== 0) formula += ` + Condições (${conditionPenalty})`;
            formula += ` = ${total} (vs CD ${cd})`;

            return {
                skillName,
                d1,
                d2,
                diceSum,
                attrName,
                attrValue: attrVal,
                skillBonus: skillVal,
                superhumanBonus,
                conditionPenalty,
                total,
                cd,
                success,
                isCriticalSuccess,
                isCriticalFailure,
                outcome,
                formula
            };
        },

        // =====================================================================
        // 4. CARTÕES DE ATAQUES E MAGIAS FORMATADOS
        // =====================================================================

        /**
         * Extrai e formata a lista de ataques físicos/armas do personagem com bônus pré-calculados.
         */
        extractAttackCards(sheetData = {}, activeConditions = []) {
            const attacks = [];
            const forVal = parseInt(sheetData.for || sheetData.FOR) || 2;
            const desVal = parseInt(sheetData.des || sheetData.DES) || 2;

            // Busca perícias de Luta e Pontaria
            let lutaBonus = 0;
            let pontariaBonus = 0;
            let esquivaBonus = 0;

            const pericias = Array.isArray(sheetData.pericias) ? sheetData.pericias : [];
            pericias.forEach(p => {
                const name = String(p.name || p.nome || '').toLowerCase();
                const val = parseInt(p.value || p.nivel || p.valor) || 0;
                if (name.includes('luta') || name.includes('briga') || name.includes('corpo')) {
                    lutaBonus = Math.max(lutaBonus, val);
                } else if (name.includes('pontaria') || name.includes('disparo') || name.includes('tiro') || name.includes('arco')) {
                    pontariaBonus = Math.max(pontariaBonus, val);
                } else if (name.includes('esquiva')) {
                    esquivaBonus = Math.max(esquivaBonus, val);
                }
            });

            const condMods = this.getConditionModifiers(activeConditions);
            const attackMod = condMods.attackMod;

            // 1. Ataque Básico Desarmado
            attacks.push({
                id: 'unarmed',
                name: 'Golpe Desarmado',
                type: 'Corpo a Corpo',
                attrType: 'FOR',
                attackBonus: forVal + lutaBonus + attackMod,
                damageFormula: `1d6 - 2 + ${Math.max(0, forVal - 2)}`,
                damageDesc: 'Contusão básica baseada em FOR.',
                reach: '1m (Adjacente)'
            });

            // 2. Extrair armas descritas em equipment (linha por linha ou separadas por vírgula)
            const equipmentText = String(sheetData.equipment || sheetData.equipamento || '');
            const lines = equipmentText.split(/[\n,]/);
            let parsedCount = 0;

            lines.forEach(line => {
                const match = line.match(/([A-Za-zÀ-ÖØ-öø-ÿ\t\f\v ]+)\s*\((?:dano:?\s*)?(\d+d6[+-]?\d*)\)/i);
                if (match) {
                    const weaponName = match[1].replace(/^[-*•]\s*/, '').trim();
                    const rawDamage = match[2].trim();
                    const isRanged = /arco|besta|pistola|rifle|disparo|adaga arremesso/i.test(weaponName);
                    const attrType = isRanged ? 'DES' : 'FOR';
                    const baseAttr = isRanged ? desVal : forVal;
                    const skillBonus = isRanged ? pontariaBonus : lutaBonus;

                    attacks.push({
                        id: `weapon_${parsedCount++}`,
                        name: weaponName,
                        type: isRanged ? 'À Distância' : 'Corpo a Corpo',
                        attrType,
                        attackBonus: baseAttr + skillBonus + attackMod,
                        damageFormula: rawDamage,
                        damageDesc: `Arma equipada (${attrType}).`,
                        reach: isRanged ? '15m - 30m' : '1.5m'
                    });
                }
            });

            // Se nenhuma arma específica foi parseada mas o equipamento tem armas gerais
            if (attacks.length === 1 && /espada|machado|lança|adaga|martelo/i.test(equipmentText)) {
                attacks.push({
                    id: 'melee_generic',
                    name: 'Arma Branca Equipada',
                    type: 'Corpo a Corpo',
                    attrType: 'FOR',
                    attackBonus: forVal + lutaBonus + attackMod,
                    damageFormula: `1d6 + ${Math.max(1, forVal)}`,
                    damageDesc: 'Dano cortante/perfurante com bônus de Força.',
                    reach: '1.5m'
                });
            }

            return attacks;
        },

        /**
         * Extrai e formata a lista de magias e habilidades do personagem integrando a Árvore de Magia.
         */
        extractSpellCards(sheetData = {}, magicTreeState = null) {
            const spells = [];
            const podVal = parseInt(sheetData.pod || sheetData.POD) || 2;
            const intVal = parseInt(sheetData.int || sheetData.INT) || 2;

            // 1. Magias registradas na ficha (caminhosMagia)
            const caminhos = Array.isArray(sheetData.caminhosMagia) ? sheetData.caminhosMagia : [];
            caminhos.forEach((c, idx) => {
                const nome = c.customName || c.nome;
                const nivel = parseInt(c.nivel) || 0;
                if (!nome || nivel <= 0) return;

                spells.push({
                    id: `sheet_path_${idx}`,
                    name: `Magia (${nome})`,
                    category: 'Caminho Elemental/Arcano',
                    forma: 'Criar / Controlar / Entender',
                    nivel,
                    cd: 10 + nivel,
                    peCost: Math.max(1, Math.min(5, nivel + 1)),
                    bonus: Math.max(podVal, intVal) + nivel,
                    desc: `Manipulação do caminho místico ${nome} no nível ${nivel}.`
                });
            });

            // 2. Magias do Grimório da Árvore de Magia (rpg_kuartor_magic_tree_state)
            if (magicTreeState && Array.isArray(magicTreeState.learnedAbilities)) {
                magicTreeState.learnedAbilities.forEach(ab => {
                    // Evita duplicatas se o ID já existir
                    if (!spells.some(s => s.id === ab.id || s.name === ab.spell)) {
                        spells.push({
                            id: ab.id || `tree_${ab.spell}`,
                            name: ab.spell || 'Feitiço de Fusão',
                            category: ab.categoryName || 'Fusão Mística',
                            forma: ab.forma || 'Criar',
                            nivel: ab.bonus || 1,
                            cd: ab.cd || 11,
                            peCost: ab.pe || 3,
                            bonus: (parseInt(ab.bonus) || 0) + Math.max(podVal, intVal),
                            desc: ab.desc || 'Síntese arcana gerada na Biblioteca Arcana.'
                        });
                    }
                });
            }

            return spells;
        },

        // =====================================================================
        // 5. INTEGRAÇÃO COM ECOSSISTEMA DO PORTAL KUAR-TOR
        // =====================================================================

        /**
         * Prepara o payload formatado especificamente para gerar ou atualizar um Token na Mesa Virtual (VTT).
         */
        prepareVttTokenPayload(sheetData = {}, liveState = {}) {
            const name = sheetData.charName || sheetData.name || 'Operativo Sem Nome';
            const forVal = parseInt(sheetData.for || sheetData.FOR) || 2;
            const desVal = parseInt(sheetData.des || sheetData.DES) || 2;
            const conVal = parseInt(sheetData.con || sheetData.CON) || 2;

            // Pontos de Vida e Energia
            const maxHP = liveState.maxHP || (sheetData.pontosVida ? parseInt(sheetData.pontosVida) : (conVal * 2 + 10));
            const currentHP = liveState.currentHP !== undefined ? liveState.currentHP : maxHP;

            const maxPE = liveState.maxPE || (sheetData.pontosEnergia ? parseInt(sheetData.pontosEnergia) : 10);
            const currentPE = liveState.currentPE !== undefined ? liveState.currentPE : maxPE;

            const conditions = Array.isArray(liveState.conditions) ? liveState.conditions : [];
            const defense = this.getEffectiveDefense(desVal, 0, conditions);

            const avatar = sheetData.avatarUrl || sheetData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
            const attacks = this.extractAttackCards(sheetData, conditions);

            return {
                id: sheetData.id || `hero_${Date.now()}`,
                name,
                team: 'heroes',
                color: '#66FCF1',
                size: 1,
                hp: currentHP,
                maxHp: maxHP,
                pe: currentPE,
                maxPe: maxPE,
                defense,
                des: desVal,
                forVal,
                avatar,
                conditions,
                attacks,
                lastUpdated: new Date().toISOString()
            };
        },

        /**
         * Realiza sincronização bidirecional com o estado da Árvore de Magia.
         */
        syncMagicTree(sheetData = {}, magicTreeState = {}) {
            const updatedSheet = { ...sheetData };
            const treeState = { ...magicTreeState };

            if (!Array.isArray(updatedSheet.caminhosMagia)) {
                updatedSheet.caminhosMagia = [];
            }

            // Se a árvore tiver habilidades aprendidas, injeta na ficha
            if (Array.isArray(treeState.learnedAbilities)) {
                updatedSheet.learnedAbilities = [...treeState.learnedAbilities];
            }

            // Sincroniza caminhos de magia com skills da árvore
            if (treeState.skills && typeof treeState.skills === 'object') {
                Object.keys(treeState.skills).forEach(pathKey => {
                    const lvl = treeState.skills[pathKey];
                    if (lvl > 0) {
                        const existing = updatedSheet.caminhosMagia.find(c => (c.nome || '').toLowerCase() === pathKey.toLowerCase());
                        if (existing) {
                            existing.nivel = lvl;
                        } else {
                            updatedSheet.caminhosMagia.push({
                                nome: pathKey.charAt(0).toUpperCase() + pathKey.slice(1),
                                nivel: lvl,
                                customName: ''
                            });
                        }
                    }
                });
            }

            return {
                updatedSheet,
                learnedAbilitiesCount: (updatedSheet.learnedAbilities || []).length
            };
        },

        /**
         * Duplica e clona uma ficha com novo ID único e sufixo de cópia / evolução.
         */
        duplicateSheet(sheetData = {}, customNewName = null) {
            if (!sheetData || typeof sheetData !== 'object') {
                throw new Error('Ficha inválida para duplicação.');
            }

            const cloned = JSON.parse(JSON.stringify(sheetData));
            const newId = `sheet_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            const oldName = cloned.charName || cloned.name || 'Sem Nome';

            cloned.id = newId;
            cloned.charName = customNewName || `${oldName} (Cópia)`;
            cloned.name = cloned.charName;
            cloned.duplicatedAt = new Date().toISOString();

            return cloned;
        },

        /**
         * Gera exportação limpa e estruturada em formato JSON para download.
         */
        exportJson(sheetData = {}, liveState = {}) {
            const payload = {
                version: '2.3-kuartor',
                exportedAt: new Date().toISOString(),
                character: {
                    ...sheetData,
                    liveState: {
                        currentHP: liveState.currentHP,
                        currentPE: liveState.currentPE,
                        conditions: liveState.conditions || []
                    }
                }
            };
            return JSON.stringify(payload, null, 2);
        },

        /**
         * Valida e importa arquivo JSON de ficha previamente exportado.
         */
        importJson(jsonString) {
            if (!jsonString || typeof jsonString !== 'string') {
                return { success: false, error: 'Arquivo JSON vazio ou inválido.' };
            }
            try {
                const parsed = JSON.parse(jsonString);
                const charData = parsed.character || parsed.sheetData || parsed;
                if (!charData || typeof charData !== 'object') {
                    return { success: false, error: 'Estrutura de personagem não reconhecida no JSON.' };
                }
                return {
                    success: true,
                    data: charData,
                    version: parsed.version || 'unknown'
                };
            } catch (err) {
                return { success: false, error: `Falha no parsing JSON: ${err.message}` };
            }
        }
    };

    return LiveSheetController;
}));
