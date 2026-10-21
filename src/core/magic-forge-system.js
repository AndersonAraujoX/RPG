/**
 * ============================================================================
 * Kuar-Tor — Sistema de Forja Arcana, Rituais Cooperativos & Puzzles (+2d6)
 * 
 * Módulo especializado em:
 * 1. Forja e Encantamento de Itens Mágicos (Crafting canônico com Círculos Mágicos).
 * 2. Rituais Cooperativos de Magos (Divisão de PE e Bônus de Ressonância).
 * 3. Puzzles & Masmorras Arcanas (Portas e Selos Arcanos Incompletos).
 * ============================================================================
 */

(function (global) {
    'use strict';

    // 1. Essências Canônicas dos 12 Caminhos Místicos
    const PATH_ESSENCES = {
        fogo: {
            id: "essencia_fogo",
            name: "Essência Ígnea",
            color: "#f97316",
            icon: "fa-solid fa-fire",
            element: "Fogo",
            forgeBonus: "+2d6 dano de fogo contínuo e queima de armaduras."
        },
        agua: {
            id: "essencia_agua",
            name: "Lágrima dos Mares Profundos",
            color: "#06b6d4",
            icon: "fa-solid fa-water",
            element: "Água",
            forgeBonus: "Fluidez nos golpes, regeneração de 1 PE por descanso ou congelamento."
        },
        ar: {
            id: "essencia_ar",
            name: "Sopro das Alturas",
            color: "#38bdf8",
            icon: "fa-solid fa-wind",
            element: "Ar",
            forgeBonus: "Arma mais leve (+1 Iniciativa) e descargas elétricas."
        },
        terra: {
            id: "essencia_terra",
            name: "Núcleo Telúrico de Adamante",
            color: "#10b981",
            icon: "fa-solid fa-mountain",
            element: "Terra",
            forgeBonus: "Dureza extrema (+1 RD ou impacto esmagador de ossos)."
        },
        luz: {
            id: "essencia_luz",
            name: "Cristal Solar Imaculado",
            color: "#fbbf24",
            icon: "fa-solid fa-sun",
            element: "Luz",
            forgeBonus: "Brilho sagrado, dano dobrado contra mortos-vivos e revelação de invisíveis."
        },
        trevas: {
            id: "essencia_trevas",
            name: "Fragmento Abissal Noturno",
            color: "#6366f1",
            icon: "fa-solid fa-moon",
            element: "Trevas",
            forgeBonus: "Dreno de fadiga, camuflagem nas sombras e toque gélido."
        },
        animais: {
            id: "essencia_animais",
            name: "Garra de Fera Primordial",
            color: "#eab308",
            icon: "fa-solid fa-paw",
            element: "Animais",
            forgeBonus: "Ataques de oportunidade selvagens e instinto predador (+1 Percepção)."
        },
        humanos: {
            id: "essencia_humanos",
            name: "Elixir de Vigor Heroico",
            color: "#ec4899",
            icon: "fa-solid fa-person",
            element: "Humanos",
            forgeBonus: "Conexão biológica: cura +3 PV ao derrotar um inimigo e vigor aumentado."
        },
        plantas: {
            id: "essencia_plantas",
            name: "Seiva de Espinhos Carnívoros",
            color: "#84cc16",
            icon: "fa-solid fa-seedling",
            element: "Plantas",
            forgeBonus: "Espinhos reativos que devolvem dano físico e veneno paralisante."
        },
        spiritum: {
            id: "essencia_spiritum",
            name: "Ectoplasma Astral Puro",
            color: "#a855f7",
            icon: "fa-solid fa-ghost",
            element: "Spiritum",
            forgeBonus: "Toque incorpóreo: atinge espíritos e criaturas astrais no plano físico."
        },
        arkanum: {
            id: "essencia_arkanum",
            name: "Cinzas do Vazio Demoníaco",
            color: "#ef4444",
            icon: "fa-solid fa-skull-crossbones",
            element: "Arkanum",
            forgeBonus: "Perfuração mágica ignorando metade da armadura mundana."
        },
        metamagia: {
            id: "essencia_metamagia",
            name: "Pó de Quimera Dimensional",
            color: "#14b8a6",
            icon: "fa-solid fa-infinity",
            element: "Metamagia",
            forgeBonus: "Armazenamento arcano: pode guardar 1 feitiço para disparo instantâneo."
        }
    };

    // 2. Catálogo de Itens Base para Forja
    const BASE_ITEMS = {
        espada: {
            name: "Espada Longa de Aço",
            category: "arma",
            slot: "uma_mao",
            baseDamage: "1d6+2",
            baseCost: "25 moedas",
            icon: "fa-solid fa-sword",
            materialBase: "Barra de Aço Dobrado"
        },
        adaga: {
            name: "Adaga Rúnica de Precisão",
            category: "arma",
            slot: "uma_mao",
            baseDamage: "1d6",
            baseCost: "10 moedas",
            icon: "fa-solid fa-dagger",
            materialBase: "Lâmina de Ferro Frio"
        },
        machado: {
            name: "Machado de Batalha Pesado",
            category: "arma",
            slot: "duas_maos",
            baseDamage: "1d6+4",
            baseCost: "35 moedas",
            icon: "fa-solid fa-axe-battle",
            materialBase: "Aço Forjado & Carvalho Negro"
        },
        arco: {
            name: "Arco Curto Composto",
            category: "arma",
            slot: "duas_maos",
            baseDamage: "1d6+1",
            baseCost: "30 moedas",
            icon: "fa-solid fa-bow-arrow",
            materialBase: "Madeira Nobre e Corda Trançada"
        },
        cajado: {
            name: "Cajado do Canalizador",
            category: "foco_magico",
            slot: "duas_maos",
            baseDamage: "1d6",
            baseCost: "40 moedas",
            icon: "fa-solid fa-wand-magic-sparkles",
            materialBase: "Cerne de Árvore Arcana"
        },
        armadura: {
            name: "Armadura Peitoral de Placas",
            category: "armadura",
            slot: "torso",
            baseDefense: "RD 3",
            baseCost: "60 moedas",
            icon: "fa-solid fa-shield-halved",
            materialBase: "Placas de Ferro Puro"
        },
        escudo: {
            name: "Escudo Redondo Reforçado",
            category: "escudo",
            slot: "uma_mao",
            baseDefense: "RD 2",
            baseCost: "20 moedas",
            icon: "fa-solid fa-shield",
            materialBase: "Madeira e Borda de Bronze"
        },
        amuleto: {
            name: "Amuleto de Prata dos Antigos",
            category: "acessorio",
            slot: "pescoco",
            baseBonus: "+1 em Resistência Mental",
            baseCost: "50 moedas",
            icon: "fa-solid fa-gem",
            materialBase: "Prata Lunar Lapidada"
        }
    };

    /**
     * Módulo de Forja Arcana (Crafting de Itens com Círculos Mágicos)
     */
    const ForgeEngine = {
        getEssences() {
            return PATH_ESSENCES;
        },

        getBaseItems() {
            return BASE_ITEMS;
        },

        /**
         * Gera a receita canônica para encantar um item com um Círculo Mágico (Secundus ou Terceirus).
         * @param {Object} circleEntry - Registro do círculo (do compêndio ou gerado).
         * @param {string} itemType - Chave do item base (ex: 'espada', 'armadura').
         * @returns {Object} Receita de forja estruturada.
         */
        createForgeRecipe(circleEntry, itemType = 'espada') {
            if (!circleEntry || typeof circleEntry !== 'object' || !Array.isArray(circleEntry.paths)) {
                throw new Error('Círculo de magia inválido para forja.');
            }
            const itemBase = BASE_ITEMS[itemType] || BASE_ITEMS.espada;
            const paths = circleEntry.paths;
            const isTerceirus = (circleEntry.tier === 'TERCEIRUS' || paths.length === 3);

            // Coleta as essências canônicas
            const requiredMaterials = paths.map(pk => {
                const ess = PATH_ESSENCES[pk] || {
                    id: `essencia_${pk}`,
                    name: `Essência de ${pk}`,
                    color: '#94a3b8',
                    element: pk,
                    forgeBonus: `Propriedades místicas de ${pk}`
                };
                return {
                    pathKey: pk,
                    essenceId: ess.id,
                    name: ess.name,
                    quantity: isTerceirus ? 2 : 1,
                    color: ess.color,
                    icon: ess.icon || 'fa-solid fa-flask'
                };
            });

            // Adiciona material base
            requiredMaterials.unshift({
                pathKey: 'base',
                name: itemBase.materialBase,
                quantity: 1,
                color: '#e2e8f0',
                icon: itemBase.icon
            });

            // Dificuldade e Custos
            const forgeCD = isTerceirus ? 14 : 11;
            const peCost = isTerceirus ? 8 : 4;
            const goldCost = isTerceirus ? 120 : 50;

            // Propriedades mágicas resultantes da fusão
            const magicalEffects = [];
            paths.forEach(pk => {
                if (PATH_ESSENCES[pk]) {
                    magicalEffects.push(PATH_ESSENCES[pk].forgeBonus);
                }
            });

            const circleSpellName = (circleEntry.forms && circleEntry.forms.Criar && circleEntry.forms.Criar.spell)
                || (circleEntry.spells && circleEntry.spells.Criar)
                || circleEntry.name;

            const enchantmentTitle = `${itemBase.name.split(' ')[0]} ${circleEntry.name}`;

            return {
                id: `recipe_${circleEntry.id || 'circle'}_${itemType}`,
                title: enchantmentTitle,
                circleId: circleEntry.id || 'custom',
                circleName: circleEntry.name,
                tier: isTerceirus ? 'TERCEIRUS' : 'SECUNDUS',
                itemType: itemType,
                baseItemName: itemBase.name,
                requiredMaterials,
                forgeCD,
                peCost,
                goldCost,
                circleSpellName,
                magicalEffects,
                paths
            };
        },

        /**
         * Executa o processo de forja e encantamento de um item.
         * @param {Object} recipe - Receita gerada por createForgeRecipe.
         * @param {number} totalRoll - Resultado da rolagem +2d6 + perícia do artesão.
         * @param {number} diceSum - Soma bruta dos 2 dados (para detectar 12 crítico ou 2 desastre).
         * @returns {Object} Resultado da forja com o item criado.
         */
        craftItem(recipe, totalRoll, diceSum = null) {
            if (!recipe || typeof recipe !== 'object') {
                throw new Error('Receita de forja inválida.');
            }
            if (typeof totalRoll !== 'number' || isNaN(totalRoll)) {
                throw new Error('Rolagem de teste de forja inválida.');
            }

            const isCritical = (diceSum === 12);
            const isFumble = (diceSum === 2);
            const isSuccess = isCritical ? true : (isFumble ? false : totalRoll >= recipe.forgeCD);

            if (!isSuccess) {
                return {
                    success: false,
                    isCritical: false,
                    isFumble,
                    reason: isFumble ? "Falha Crítica: o choque de energias místicas quebrou o item e consumiu as essências!" : "A rolagem não atingiu a CD necessária para fixar o círculo no metal.",
                    totalRoll,
                    forgeCD: recipe.forgeCD,
                    item: null
                };
            }

            const item = {
                id: `item_${Date.now()}_${recipe.circleId}`,
                name: isCritical ? `★ ${recipe.title} (Obra-Prima Lendária)` : recipe.title,
                baseItem: recipe.baseItemName,
                tier: recipe.tier,
                circleId: recipe.circleId,
                circleName: recipe.circleName,
                paths: recipe.paths,
                activeSpell: recipe.circleSpellName,
                properties: [...recipe.magicalEffects],
                isMasterwork: isCritical,
                craftedAt: new Date().toISOString()
            };

            if (isCritical) {
                item.properties.push("Obra-Prima Arcana: Redução permanente de 1 PE no custo para ativar os efeitos mágicos deste item.");
            }

            return {
                success: true,
                isCritical,
                isFumble: false,
                totalRoll,
                forgeCD: recipe.forgeCD,
                item
            };
        }
    };

    /**
     * Módulo de Rituais Cooperativos (Combinação de Magos)
     */
    const RitualsEngine = {
        /**
         * Valida se uma equipe de magos cobre coletivamente os caminhos exigidos para um Círculo.
         * @param {Array<Object>} mages - Lista de magos: [{ name, paths: ['fogo'], pe: 10, bonus: 3 }]
         * @param {Array<string>} targetPaths - Caminhos exigidos pelo círculo (ex: ['fogo', 'ar', 'terra'])
         * @returns {Object} Diagnóstico de viabilidade do ritual.
         */
        validateTeamPaths(mages, targetPaths) {
            if (!Array.isArray(mages) || mages.length === 0) {
                return { valid: false, reason: "Nenhum mago presente para o ritual." };
            }
            if (!Array.isArray(targetPaths) || targetPaths.length === 0) {
                return { valid: false, reason: "Caminhos do círculo alvo inválidos." };
            }

            const combinedPaths = new Set();
            mages.forEach(m => {
                const pList = Array.isArray(m.paths) ? m.paths : Object.keys(m.skills || {});
                pList.forEach(p => combinedPaths.add(p.toLowerCase()));
            });

            const missing = targetPaths.filter(tp => !combinedPaths.has(tp.toLowerCase()));

            return {
                valid: missing.length === 0,
                missingPaths: missing,
                totalMages: mages.length,
                combinedCount: combinedPaths.size
            };
        },

        /**
         * Calcula o plano de divisão de PE entre os magos participantes do ritual.
         * @param {Array<Object>} mages - [{ name, peAvailable }]
         * @param {number} totalPECost - Custo total de PE do Círculo Mágico.
         * @returns {Object} Distribuição de PE por mago.
         */
        calculatePEDistribution(mages, totalPECost) {
            if (!Array.isArray(mages) || mages.length === 0) {
                throw new Error('Lista de magos inválida.');
            }
            if (typeof totalPECost !== 'number' || totalPECost <= 0) {
                throw new Error('Custo de PE total deve ser um número positivo.');
            }

            const totalAvailable = mages.reduce((sum, m) => sum + (Math.max(0, m.peAvailable || 0)), 0);
            if (totalAvailable < totalPECost) {
                return {
                    possible: false,
                    totalAvailable,
                    totalPECost,
                    shortage: totalPECost - totalAvailable,
                    distribution: []
                };
            }

            // Divisão justa com base na disponibilidade de PE
            let remainingPE = totalPECost;
            const count = mages.length;
            const baseShare = Math.floor(totalPECost / count);
            let remainder = totalPECost % count;

            const distribution = mages.map(m => {
                const assigned = baseShare + (remainder > 0 ? 1 : 0);
                if (remainder > 0) remainder--;
                return {
                    name: m.name || "Mago",
                    peAssigned: assigned,
                    peRemaining: (m.peAvailable || 0) - assigned
                };
            });

            return {
                possible: true,
                totalAvailable,
                totalPECost,
                shortage: 0,
                distribution
            };
        },

        /**
         * Executa a conjuração cooperativa de um ritual arcano.
         * @param {Array<Object>} mages - Lista de magos com bônus de perícia.
         * @param {Object} circleEntry - Círculo alvo (Secundus ou Terceirus).
         * @param {number} d1 - Dado 1 (1 a 6).
         * @param {number} d2 - Dado 2 (1 a 6).
         * @returns {Object} Resultado completo da conjuração.
         */
        performCooperativeRitual(mages, circleEntry, d1 = 3, d2 = 4) {
            if (!circleEntry || typeof circleEntry !== 'object' || !Array.isArray(circleEntry.paths)) {
                throw new Error('Círculo de ritual inválido.');
            }

            const pathCheck = this.validateTeamPaths(mages, circleEntry.paths);
            if (!pathCheck.valid) {
                return {
                    success: false,
                    reason: `O ritual falhou: faltam os caminhos [${pathCheck.missingPaths.join(', ')}] na equipe de conjuradores.`,
                    missingPaths: pathCheck.missingPaths
                };
            }

            const totalPE = (circleEntry.forms && circleEntry.forms.Criar && circleEntry.forms.Criar.pe) || (circleEntry.tier === 'TERCEIRUS' ? 8 : 4);
            const pePlan = this.calculatePEDistribution(mages, totalPE);

            if (!pePlan.possible) {
                return {
                    success: false,
                    reason: `Energia insuficiente: a equipe possui ${pePlan.totalAvailable} PE, mas o ritual exige ${totalPE} PE.`,
                    pePlan
                };
            }

            // Bônus de Cooperação: Média dos bônus dos magos + Bônus de Sinergia Rúnica (+1 para 2 magos, +2 para 3 magos)
            const sumBonus = mages.reduce((acc, m) => acc + (m.bonus || 0), 0);
            const avgBonus = Math.round(sumBonus / mages.length);
            const synergyBonus = mages.length >= 3 ? 2 : 1;
            const totalBonus = avgBonus + synergyBonus;

            const targetCD = (circleEntry.forms && circleEntry.forms.Criar && circleEntry.forms.Criar.cd) || (circleEntry.tier === 'TERCEIRUS' ? 14 : 11);

            const diceTotal = d1 + d2;
            const finalRoll = diceTotal + totalBonus;
            const isCritical = (diceTotal === 12);
            const isFumble = (diceTotal === 2);
            const isSuccess = isCritical ? true : (isFumble ? false : finalRoll >= targetCD);

            return {
                success: isSuccess,
                isCritical,
                isFumble,
                circleName: circleEntry.name,
                tier: circleEntry.tier,
                targetCD,
                diceTotal,
                d1,
                d2,
                avgBonus,
                synergyBonus,
                totalBonus,
                finalRoll,
                pePlan: pePlan.distribution,
                message: isSuccess
                    ? `✦ O Ritual Cooperativo de ${circleEntry.name} foi um sucesso triunfal! (Resultado: ${finalRoll} vs CD ${targetCD})`
                    : `✕ O ritual colapsou antes de canalizar a força total. (Resultado: ${finalRoll} vs CD ${targetCD})`
            };
        }
    };

    /**
     * Módulo de Puzzles & Masmorras Arcanas (Portas e Selos Arcanos)
     */
    const DungeonPuzzleEngine = {
        /**
         * Cria um desafio de porta selada com base em um Círculo Mágico.
         * @param {Object} circleEntry - Círculo canônico.
         * @param {number} missingCount - Quantidade de caminhos que faltam ser deduzidos (padrão 1).
         * @param {Object} options - Título e enigma customizados.
         * @returns {Object} Estrutura de puzzle pronta.
         */
        createDoorPuzzle(circleEntry, missingCount = 1, options = {}) {
            if (!circleEntry || typeof circleEntry !== 'object' || !Array.isArray(circleEntry.paths)) {
                throw new Error('Círculo inválido para gerar puzzle.');
            }
            const paths = [...circleEntry.paths];
            if (paths.length < 2) {
                throw new Error('O puzzle precisa de ao menos 2 caminhos (Secundus ou Terceirus).');
            }

            const clampedMissing = Math.min(paths.length - 1, Math.max(1, missingCount));
            // Deixa os primeiros ativos e os últimos como faltando
            const activePaths = paths.slice(0, paths.length - clampedMissing);
            const missingPaths = paths.slice(paths.length - clampedMissing);

            const activeNames = activePaths.map(p => (PATH_ESSENCES[p] ? PATH_ESSENCES[p].element : p)).join(' e ');
            const missingHints = missingPaths.map(p => {
                const ess = PATH_ESSENCES[p];
                return ess ? `Há runas mencionando '${ess.name}' e o elemento ${ess.element}.` : `Canal de ${p}`;
            });

            return {
                id: `puzzle_${circleEntry.id || 'door'}_${Date.now()}`,
                title: options.title || `O Selo Arcano de ${circleEntry.name}`,
                doorDescription: options.description || `Um portal de pedra milenar selado com o Círculo Mágico de ${circleEntry.name}. As linhas de ${activeNames} brilham na rocha, mas os condutos de mana estão incompletos.`,
                circleId: circleEntry.id,
                circleName: circleEntry.name,
                tier: circleEntry.tier,
                allPaths: paths,
                activePaths,
                missingPaths,
                hints: missingHints,
                isSolved: false
            };
        },

        /**
         * Tenta resolver o enigma da porta injetando caminhos/círculos mágicos.
         * @param {Object} puzzle - Instância de puzzle.
         * @param {Array<string>} injectedPaths - Caminhos que os jogadores canalizaram na porta.
         * @returns {Object} Resultado da tentativa.
         */
        attemptUnlockDoor(puzzle, injectedPaths) {
            if (!puzzle || typeof puzzle !== 'object' || !Array.isArray(puzzle.missingPaths)) {
                throw new Error('Puzzle inválido.');
            }
            if (!Array.isArray(injectedPaths)) {
                throw new Error('Caminhos injetados devem ser um array.');
            }

            const missingSet = new Set(puzzle.missingPaths.map(p => p.toLowerCase()));
            const injectedSet = new Set(injectedPaths.map(p => String(p || '').toLowerCase()));

            // Verifica se contém todos os caminhos necessários e nenhum errado
            const allMatched = puzzle.missingPaths.every(p => injectedSet.has(p.toLowerCase()));
            const hasWrongPath = injectedPaths.some(p => !missingSet.has(p.toLowerCase()));

            if (allMatched && !hasWrongPath && injectedPaths.length === puzzle.missingPaths.length) {
                puzzle.isSolved = true;
                return {
                    success: true,
                    doorOpened: true,
                    message: `🔮 As runas ressoam em harmonia! O selo de ${puzzle.circleName} se completa e a imensa porta de pedra desliza abrindo a passagem!`,
                    puzzleId: puzzle.id
                };
            }

            return {
                success: false,
                doorOpened: false,
                message: hasWrongPath
                    ? "⚡ Choque Elemental! Os condutos rejeitam a energia incompatível e um pulso de choque atinge os conjuradores!"
                    : "As linhas de mana começam a brilhar, mas a corrente mágica continua incompleta...",
                puzzleId: puzzle.id,
                triggeredTrap: hasWrongPath
            };
        },

        /**
         * Catálogo de masmorras pré-fabricadas para jogo imediato.
         */
        getPrebuiltDungeonPuzzles() {
            return [
                {
                    id: "puzzle_masmorra_vulcao",
                    title: "A Porta da Câmara Vulcânica",
                    circleId: "s03",
                    circleName: "Magma & Vulcanismo",
                    tier: "SECUNDUS",
                    activePaths: ["fogo"],
                    missingPaths: ["terra"],
                    doorDescription: "Porta de basalto incandescente gravada com chamas. O conduto inferior está esculpido como uma montanha oca que aguarda contato telúrico.",
                    hints: ["O fogo precisa de corpo sólido para se tornar rocha viva derretida."]
                },
                {
                    id: "puzzle_catacumba_abissal",
                    title: "O Selo dos Três Flagelos (Cataclismo)",
                    circleId: "t005",
                    circleName: "CATACLISMO",
                    tier: "TERCEIRUS",
                    activePaths: ["fogo", "ar"],
                    missingPaths: ["terra"],
                    doorDescription: "Um portal triangular gigantesco. Ar quente e faíscas estalam nas duas pontas superiores, mas o vértice inferior na rocha permanece inerte.",
                    hints: ["A tempestade de chamas só ganha peso para o cataclismo quando ancora na terra."]
                },
                {
                    id: "puzzle_torre_esmeralda",
                    title: "O Portal da Cidade Viva",
                    circleId: "t120",
                    circleName: "Arquiteto de Cidades Vivas",
                    tier: "TERCEIRUS",
                    activePaths: ["terra", "plantas"],
                    missingPaths: ["metamagia"],
                    doorDescription: "Um portão esculpido em raízes entrelaçadas em pedra mármore. Falta o fluxo da mente arcana para dar senciência à construção.",
                    hints: ["Solo e flora precisam da trama metamágica pura para criar a vida consciente."]
                }
            ];
        }
    };

    const MagicForgeSystem = {
        PATH_ESSENCES,
        BASE_ITEMS,
        ForgeEngine,
        RitualsEngine,
        DungeonPuzzleEngine
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MagicForgeSystem;
    } else {
        global.MagicForgeSystem = MagicForgeSystem;
    }

})(typeof window !== 'undefined' ? window : global);
