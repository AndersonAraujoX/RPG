/**
 * ============================================================================
 * Kuar-Tor — Sistema de Imersão e Qualidade de Vida Arcana
 * 
 * Módulo especializado em:
 * 1. Sistema de Conquistas (Achievements Arcanos com rastreamento de progresso).
 * 2. Modo Mestre & Eventos Arcanos Globais (Tempestade de Mana, Modificadores de Campanha).
 * 3. Grimório Exportável (Impressão e Exportação de Ficha de Círculos Mágicos).
 * 4. Rolador 2d6 Animado & Síntese de Som de Runas (Web Audio API sem dependências externas).
 * ============================================================================
 */

(function (global) {
    'use strict';

    // 1. Catálogo Canônico de Conquistas Arcanas
    const ACHIEVEMENTS_CATALOG = [
        {
            id: 'primeiro_cataclismo',
            title: 'Arauto do Cataclismo',
            description: 'Conjurou com sucesso o Círculo Terceirus T005 (Cataclismo).',
            icon: 'fa-solid fa-volcano',
            tier: 'OURO',
            condition: (state, event) => event && event.type === 'SPELL_CAST' && event.circleId === 't005' && event.success
        },
        {
            id: 'doze_caminhos',
            title: 'Mestre da Mandala Arcana',
            description: 'Investiu pelo menos 1 ponto em todos os 12 Caminhos Primários.',
            icon: 'fa-solid fa-dharmachakra',
            tier: 'PLATINA',
            condition: (state) => {
                const skills = (state && state.skills) || {};
                const paths = ['fogo', 'agua', 'ar', 'terra', 'luz', 'trevas', 'animais', 'humanos', 'plantas', 'spiritum', 'arkanum', 'metamagia'];
                return paths.every(p => (Number(skills[p]) || 0) >= 1);
            }
        },
        {
            id: 'mestre_forjador',
            title: 'Ferreiro do Nexo',
            description: 'Forjou um item mágico com Obra-Prima Lendária (12 no dado).',
            icon: 'fa-solid fa-hammer',
            tier: 'OURO',
            condition: (state, event) => event && event.type === 'ITEM_CRAFTED' && event.isMasterwork
        },
        {
            id: 'sintonia_runica',
            title: 'Harmonia Elemental',
            description: 'Ativou a Ressonância de Caminhos (+1 no 2d6) em um Círculo Secundus.',
            icon: 'fa-solid fa-wave-pulse',
            tier: 'PRATA',
            condition: (state, event) => event && event.type === 'RESONANCE_ACTIVATED'
        },
        {
            id: 'desbravador_arcano',
            title: 'Chave dos Mistérios',
            description: 'Resolveu um enigma de porta selada ou puzzle de masmorra.',
            icon: 'fa-solid fa-dungeon',
            tier: 'PRATA',
            condition: (state, event) => event && event.type === 'PUZZLE_SOLVED'
        },
        {
            id: 'especialista_supremo',
            title: 'Aspecto Desperto',
            description: 'Atingiu o nível 5 em um caminho e escolheu um aspecto de especialização.',
            icon: 'fa-solid fa-star',
            tier: 'PRATA',
            condition: (state, event) => event && event.type === 'SPECIALIZATION_CHOSEN'
        },
        {
            id: 'ritual_triplice',
            title: 'Trindade de Magos',
            description: 'Executou um Ritual Cooperativo com Condutor, Estabilizador e Canalizador.',
            icon: 'fa-solid fa-users-rays',
            tier: 'OURO',
            condition: (state, event) => event && event.type === 'ROLE_RITUAL_COMPLETED' && event.success
        },
        {
            id: 'doador_de_mana',
            title: 'Fonte da Comunhão',
            description: 'Doou pontos de energia (PE) para o reservatório compartilhado da party.',
            icon: 'fa-solid fa-hand-holding-magic',
            tier: 'BRONZE',
            condition: (state, event) => event && event.type === 'MANA_DONATED' && event.amount > 0
        }
    ];

    /**
     * Motor de Gerenciamento de Conquistas
     */
    const AchievementsEngine = {
        ACHIEVEMENTS_CATALOG,

        /**
         * Inicializa ou normaliza o estado de conquistas.
         */
        createAchievementsState(rawState = null) {
            const raw = (rawState && typeof rawState === 'object') ? rawState : {};
            return {
                unlocked: Object.assign({}, raw.unlocked),
                unlockedHistory: Array.isArray(raw.unlockedHistory) ? [...raw.unlockedHistory] : []
            };
        },

        /**
         * Avalia se alguma conquista foi desbloqueada a partir do estado atual e de um evento disparado.
         * @param {Object} achState - Estado de conquistas.
         * @param {Object} characterState - Estado do personagem.
         * @param {Object} event - Evento ocorrido: { type, ... }
         * @returns {Object} { achState, newlyUnlocked: Array }
         */
        evaluateAchievements(achState, characterState, event = null) {
            if (!achState || typeof achState !== 'object') {
                achState = this.createAchievementsState();
            }

            const newlyUnlocked = [];
            ACHIEVEMENTS_CATALOG.forEach(ach => {
                if (achState.unlocked[ach.id]) return; // Já desbloqueada

                try {
                    const earned = ach.condition(characterState, event);
                    if (earned) {
                        achState.unlocked[ach.id] = true;
                        const record = {
                            id: ach.id,
                            title: ach.title,
                            tier: ach.tier,
                            icon: ach.icon,
                            unlockedAt: Date.now()
                        };
                        achState.unlockedHistory.push(record);
                        newlyUnlocked.push(record);
                    }
                } catch (err) {
                    // Proteção contra exceções em avaliações de condições
                }
            });

            return {
                achState,
                newlyUnlocked
            };
        }
    };

    /**
     * Catálogo e Motor de Eventos Arcanos Globais (Modo Mestre)
     */
    const ARCANE_GLOBAL_EVENTS = {
        tempestade_mana: {
            id: 'tempestade_mana',
            name: 'Tempestade de Mana Celestial',
            description: 'Ventos etéreos e chamas astrais amplificam toda a magia de Fogo e Ar.',
            affectedPaths: ['fogo', 'ar'],
            rollBonus: 1,
            cdModifier: -1,
            peModifier: 0,
            icon: 'fa-solid fa-cloud-bolt'
        },
        mare_gravitacional: {
            id: 'mare_gravitacional',
            name: 'Maré Gravitacional das Profundezas',
            description: 'As correntes telúricas e aquíferas fortalecem a magia de Água e Terra.',
            affectedPaths: ['agua', 'terra'],
            rollBonus: 1,
            cdModifier: -1,
            peModifier: 0,
            icon: 'fa-solid fa-water'
        },
        eclipse_abissal: {
            id: 'eclipse_abissal',
            name: 'Eclipse do Sol Negro',
            description: 'Sombras cobrem a terra. Trevas e Spiritum recebem +2 no 2d6; a Luz sofre -1.',
            affectedPaths: ['trevas', 'spiritum'],
            rollBonus: 2,
            cdModifier: 0,
            peModifier: 0,
            penaltyPaths: ['luz'],
            penaltyRollBonus: -1,
            icon: 'fa-solid fa-moon'
        },
        aurora_sagrada: {
            id: 'aurora_sagrada',
            name: 'Aurora Sagrada de Kuar-Tor',
            description: 'Fascínio celeste que acelera a regeneração de PE e dá +1 em Luz e Plantas.',
            affectedPaths: ['luz', 'plantas'],
            rollBonus: 1,
            cdModifier: 0,
            peModifier: -1,
            icon: 'fa-solid fa-sun'
        },
        convergencia_planar: {
            id: 'convergencia_planar',
            name: 'Convergência dos Planos Exteriores',
            description: 'As membranas entre dimensões se enfraquecem: Metamagia e Arkanum ganham +2.',
            affectedPaths: ['metamagia', 'arkanum'],
            rollBonus: 2,
            cdModifier: -1,
            peModifier: 0,
            icon: 'fa-solid fa-infinity'
        }
    };

    const MasterModeEngine = {
        ARCANE_GLOBAL_EVENTS,

        /**
         * Aplica modificadores de eventos arcanos globais a uma conjuração de magia.
         */
        calculateEventModifiers(activeEventKey, circlePaths = []) {
            if (!activeEventKey || !ARCANE_GLOBAL_EVENTS[activeEventKey]) {
                return { rollBonus: 0, cdModifier: 0, peModifier: 0, isAffected: false };
            }

            const evt = ARCANE_GLOBAL_EVENTS[activeEventKey];
            const cleanPaths = circlePaths.map(p => String(p).toLowerCase());

            const hasAffectedPath = evt.affectedPaths.some(p => cleanPaths.includes(p));
            const hasPenaltyPath = Array.isArray(evt.penaltyPaths) && evt.penaltyPaths.some(p => cleanPaths.includes(p));

            let rollBonus = 0;
            let cdModifier = 0;
            let peModifier = 0;

            if (hasAffectedPath) {
                rollBonus += evt.rollBonus || 0;
                cdModifier += evt.cdModifier || 0;
                peModifier += evt.peModifier || 0;
            }

            if (hasPenaltyPath) {
                rollBonus += evt.penaltyRollBonus || 0;
            }

            return {
                eventName: evt.name,
                rollBonus,
                cdModifier,
                peModifier,
                isAffected: hasAffectedPath || hasPenaltyPath
            };
        }
    };

    /**
     * Exportador de Grimório em HTML / PDF Imprimível
     */
    const GrimoireExporter = {
        /**
         * Gera um documento HTML completo pronto para impressão e exportação com design Dark Fantasy.
         */
        generateGrimoireHTML(characterState, masteredCircles = [], options = {}) {
            const charName = options.characterName || (characterState && characterState.name) || 'Mago de Kuar-Tor';
            const skills = (characterState && characterState.skills) || {};
            const specializations = (characterState && characterState.specializations) || {};

            const pathsRows = Object.keys(skills).map(k => {
                const lvl = skills[k];
                const spec = specializations[k] ? `(Aspecto: ${specializations[k]})` : '';
                return `<tr><td style="padding:6px 12px; border-bottom:1px solid #334155; text-transform:capitalize;">${k} ${spec}</td><td style="padding:6px 12px; border-bottom:1px solid #334155; font-weight:bold; color:#fbbf24;">Nível ${lvl}</td></tr>`;
            }).join('');

            const circlesList = masteredCircles.map(c => `
                <div style="border:1px solid rgba(102,252,241,0.3); background:#0f172a; border-radius:8px; padding:10px; margin-bottom:8px;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold; color:#67e8f9;">
                        <span>${c.name || c.id}</span>
                        <span style="font-size:11px; color:#fbbf24;">${c.tier || 'CÍRCULO'}</span>
                    </div>
                    <div style="font-size:11px; color:#cbd5e1; margin-top:4px;">Caminhos: ${(c.paths || []).join(' + ')}</div>
                    <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${c.desc || ''}</div>
                </div>
            `).join('') || '<div style="color:#64748b; font-style:italic;">Nenhum círculo registrado no compêndio pessoal.</div>';

            return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Grimório Arcano — ${charName}</title>
    <style>
        body { font-family: 'Cinzel', serif, system-ui; background: #030712; color: #f8fafc; padding: 24px; margin: 0; }
        .header { text-align: center; border-bottom: 2px solid #06b6d4; padding-bottom: 16px; margin-bottom: 24px; }
        .section-title { color: #fbbf24; border-bottom: 1px solid #1e293b; padding-bottom: 6px; margin-top: 20px; font-size: 16px; }
        @media print {
            body { background: #ffffff !important; color: #000000 !important; }
            .section-title { color: #000000 !important; border-color: #cccccc !important; }
            .header { border-color: #000000 !important; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin:0; font-size:24px; letter-spacing:1px;">GRIMÓRIO DE CÍRCULOS MÁGICOS</h1>
        <div style="font-size:13px; color:#94a3b8; margin-top:6px;">Campanha de Kuar-Tor &bull; Conjurador: <strong>${charName}</strong></div>
    </div>
    <div class="section-title">CAMINHOS PRIMÁRIOS DOMINADOS</div>
    <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:8px;">
        <tbody>${pathsRows}</tbody>
    </table>
    <div class="section-title">CÍRCULOS DE MAGIA E SELOS RÚNICOS</div>
    <div style="margin-top:12px;">${circlesList}</div>
</body>
</html>`;
        }
    };

    /**
     * 4. Sintetizador de Som de Runas e Dados com Web Audio API
     */
    const RuneSoundSynthesizer = {
        /**
         * Toca um acorde etéreo rúnico harmônico usando Web Audio API.
         */
        playRuneHum(audioContext = null) {
            try {
                const ctx = audioContext || (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null);
                if (!ctx) return false;

                const now = ctx.currentTime;
                const freqs = [432, 540, 648]; // Proporção áurea harmônica
                freqs.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now);

                    gain.gain.setValueAtTime(0, now);
                    gain.gain.linearRampToValueAtTime(0.08 / (idx + 1), now + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(now);
                    osc.stop(now + 0.85);
                });
                return true;
            } catch (e) {
                return false;
            }
        },

        /**
         * Toca o som de dados rolando (impactos leves em sequência).
         */
        playDiceRollSound(audioContext = null) {
            try {
                const ctx = audioContext || (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null);
                if (!ctx) return false;

                const now = ctx.currentTime;
                [0, 0.08, 0.16].forEach((delay, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(160 + (i * 40), now + delay);

                    gain.gain.setValueAtTime(0.1, now + delay);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(now + delay);
                    osc.stop(now + delay + 0.07);
                });
                return true;
            } catch (e) {
                return false;
            }
        }
    };

    const MagicImmersionSystem = {
        ACHIEVEMENTS_CATALOG,
        AchievementsEngine,
        ARCANE_GLOBAL_EVENTS,
        MasterModeEngine,
        GrimoireExporter,
        RuneSoundSynthesizer
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MagicImmersionSystem;
    } else {
        global.MagicImmersionSystem = MagicImmersionSystem;
    }
})(typeof window !== 'undefined' ? window : global);
