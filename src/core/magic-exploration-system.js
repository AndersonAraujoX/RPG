/**
 * ============================================================================
 * Kuar-Tor — Sistema de Exploração e Puzzles Arcanos
 * 
 * Módulo especializado em:
 * 1. Portas com Mais de Um Selo (Acendimento sequencial na ordem certa).
 * 2. Enigmas por Dedução & Gerador de Puzzles Aleatórios para o Mestre.
 * 3. Mapa de Masmorra com Salas Mágicas (Requisitos de caminhos para travessia).
 * ============================================================================
 */

(function (global) {
    'use strict';

    // Pistas temáticas canônicas por essência de caminho místico
    const PATH_CLUES = {
        fogo: [
            "O ar ao redor crepita em ondas de calor incandescente e brasas invisíveis.",
            "Cinzas estalam na pedra onde a chama primordial anseia por consumir.",
            "Um brilho avermelhado pulsa como o coração de uma forja adormecida."
        ],
        agua: [
            "Gotas de umidade gélida condensam nas frestas e o som de marés ressoa no vazio.",
            "Um fluxo líquido e límpido sussurra por entre as ranhuras do relevo.",
            "O conduto reflete a luz como a superfície calma de um lago profundo."
        ],
        ar: [
            "Uma brisa veloz sibila através dos orifícios rúnicos com pressão ascendente.",
            "Redemoinhos sutis levantam poeira fina num bailado etéreo de vento.",
            "Ouvidos atentos escutam trovões distantes e estalos elétricos no vácuo."
        ],
        terra: [
            "Minérios pesados tremem na rocha bruta; o peso da montanha ancora o portal.",
            "Fendas profundas de granito e basalto exigem solidez e estabilidade inquebrantável.",
            "Poeira de quartzo e ferro atrai as mãos com magnetismo mineral ancestral."
        ],
        luz: [
            "Feixes dourados desenham prismas sagrados quando a penumbra é afastada.",
            "Uma luminescência reconfortante cega as sombras ao redor.",
            "Símbolos solares resplandecem aguardando o toque da aurora celestial."
        ],
        trevas: [
            "Uma escuridão palpável parece engolir a luz das tochas vizinhas.",
            "O frio sepulcral da meia-noite congela o fôlego de quem se aproxima.",
            "Tentáculos de sombra dançam nas quinas onde nada deveria se mover."
        ],
        animais: [
            "Marcas profundas de garras e o eco de uivos ancestrais permeiam a câmara.",
            "Um cheiro almiscarado e o bater de asas invisíveis alertam os instintos selvagens.",
            "A gravura de uma alcateia ruge silenciosa no batente de madeira negra."
        ],
        humanos: [
            "Silhuetas e rostos expressivos parecem observar com empatia e julgamento.",
            "Um pulso rítmico, semelhante aos batimentos de um peito heroico, vibra na pedra.",
            "Palavras de liderança e comunhão estão talhadas na língua comum dos homens."
        ],
        plantas: [
            "Gavinhas e raízes petrificadas agarram o portal, prontas para florir ao menor estímulo.",
            "O aroma doce de seiva e terra adubada exala das juntas vedadas.",
            "Espinhos afiados como agulhas protegem a fechadura vegetal."
        ],
        spiritum: [
            "Vozes sussurradas do além ecoam lamentos e memórias esquecidas pelo tempo.",
            "Um vento polar sopra da fresta sem qualquer corrente de ar física.",
            "Ectoplasma azulado brilha levemente onde fantasmas tocaram o portal."
        ],
        arkanum: [
            "Fumaça púrpura de enxofre emana de fendas com pactos demoníacos gravados.",
            "A realidade parece distorcida e viscosa ao redor da fechadura corrompida.",
            "Inscrições proibidas ardem com o calor do abismo eterno."
        ],
        metamagia: [
            "A própria teia mágica se dobra e se anula em padrões fractais infinitos.",
            "Fios de mana pura dançam como cordas de uma harpa etérea desajustada.",
            "Um símbolo infinito gira lentamente sem suporte mecânico perceptível."
        ]
    };

    /**
     * 1. Motor de Portas com Múltiplos Selos Sequenciais
     */
    const MultiSealDoorEngine = {
        /**
         * Cria uma porta mágica que requer acendimento de selos em ordem sequencial.
         * @param {string} id - Identificador único da porta.
         * @param {string} title - Título da porta/desafio.
         * @param {Array<Object>} sequence - Lista de círculos na ordem exigida: [{ id: 's03', name: 'Magma' }, { id: 's62', name: 'Necromancia' }]
         * @param {Object} options - { description, trapDamage }
         */
        createMultiSealDoor(id, title, sequence, options = {}) {
            if (!Array.isArray(sequence) || sequence.length < 2) {
                throw new Error('A porta com múltiplos selos precisa de pelo menos 2 círculos em sequência.');
            }

            return {
                id: id || `multidoor_${Date.now()}`,
                title: title || 'Portal dos Selos Concêntricos',
                description: options.description || 'Uma porta colossal protegida por anéis de contenção mágica que devem ser rompidos em harmonia sequencial.',
                trapDamage: options.trapDamage || '2d6 de dano de choque arcano',
                sequence: sequence.map((s, idx) => ({
                    step: idx + 1,
                    circleId: s.id || s.circleId,
                    circleName: s.name || s.circleName || s.id,
                    paths: s.paths || []
                })),
                currentStep: 0,
                activeHistory: [],
                isUnlocked: false,
                alarmTriggered: false
            };
        },

        /**
         * Tenta acender o próximo selo na porta.
         * @param {Object} doorState - Estado atual da porta.
         * @param {string} circleId - ID do círculo canalizado.
         * @returns {Object} Resultado da tentativa.
         */
        activateSealStep(doorState, circleId) {
            if (!doorState || typeof doorState !== 'object' || !Array.isArray(doorState.sequence)) {
                throw new Error('Estado de porta inválido.');
            }
            if (doorState.isUnlocked) {
                return { success: true, doorOpened: true, message: 'A porta já está totalmente aberta!' };
            }

            const cleanId = String(circleId || '').toLowerCase().trim();
            const expected = doorState.sequence[doorState.currentStep];

            if (!expected) {
                doorState.isUnlocked = true;
                return { success: true, doorOpened: true, message: 'Todos os selos já foram rompidos!' };
            }

            const expectedId = String(expected.circleId).toLowerCase().trim();

            if (cleanId === expectedId) {
                doorState.currentStep++;
                doorState.activeHistory.push(cleanId);
                const isFinished = doorState.currentStep >= doorState.sequence.length;
                if (isFinished) {
                    doorState.isUnlocked = true;
                    return {
                        success: true,
                        doorOpened: true,
                        stepAdvanced: true,
                        currentStep: doorState.currentStep,
                        totalSteps: doorState.sequence.length,
                        message: `🔓 O último selo (${expected.circleName}) ressoa em uníssono! A porta milenar se destranca e abre caminho!`
                    };
                }
                return {
                    success: true,
                    doorOpened: false,
                    stepAdvanced: true,
                    currentStep: doorState.currentStep,
                    totalSteps: doorState.sequence.length,
                    message: `✦ Selo ${doorState.currentStep}/${doorState.sequence.length} (${expected.circleName}) aceso com perfeição! O próximo anel se abre.`
                };
            }

            // Ordem incorreta: ativa choque e reseta o progresso da sequência
            doorState.currentStep = 0;
            doorState.activeHistory = [];
            doorState.alarmTriggered = true;

            return {
                success: false,
                doorOpened: false,
                stepAdvanced: false,
                triggeredTrap: true,
                trapDamage: doorState.trapDamage,
                currentStep: 0,
                totalSteps: doorState.sequence.length,
                message: `⚡ DESARMONIA RÚNICA! O círculo canalizado não é o esperado. Os selos se reiniciam e disparam ${doorState.trapDamage}!`
            };
        }
    };

    /**
     * 2. Enigmas por Dedução & Gerador de Puzzles Aleatórios para o Mestre
     */
    const DeductionPuzzleEngine = {
        PATH_CLUES,

        /**
         * Gera um puzzle dedutivo aleatório a partir de uma lista ou catálogo de círculos.
         * @param {Array<Object>} circles - Catálogo de círculos (Secundus ou Terceirus).
         * @param {Object} options - { missingCount: 1, rng: Function }
         */
        generateRandomDeductionPuzzle(circles, options = {}) {
            if (!Array.isArray(circles) || circles.length === 0) {
                throw new Error('Lista de círculos inválida para gerar enigma.');
            }
            const rng = typeof options.rng === 'function' ? options.rng : Math.random;
            const pick = (arr) => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];

            // Seleciona um círculo aleatório que tenha pelo menos 2 caminhos
            const eligible = circles.filter(c => Array.isArray(c.paths) && c.paths.length >= 2);
            if (eligible.length === 0) {
                throw new Error('Nenhum círculo elegível com 2 ou mais caminhos encontrado.');
            }
            const chosenCircle = pick(eligible);
            const allPaths = [...chosenCircle.paths];

            const missingCount = Math.min(allPaths.length - 1, Math.max(1, Number(options.missingCount) || 1));
            // Embaralha caminhos de forma determinística via rng para escolher os ocultos
            const shuffled = [...allPaths].sort(() => rng() - 0.5);
            const missingPaths = shuffled.slice(0, missingCount);
            const activePaths = allPaths.filter(p => !missingPaths.includes(p));

            const clues = missingPaths.map(p => {
                const list = PATH_CLUES[p] || [`Um conduto misterioso de ${p} espera ativação.`];
                return pick(list);
            });

            return {
                id: `deduction_${chosenCircle.id}_${Date.now()}`,
                title: `Enigma do Círculo de ${chosenCircle.name}`,
                circleId: chosenCircle.id,
                circleName: chosenCircle.name,
                tier: chosenCircle.tier || (allPaths.length === 3 ? 'TERCEIRUS' : 'SECUNDUS'),
                allPaths,
                activePaths,
                missingPaths,
                clues,
                prompt: `As energias de [${activePaths.join(' + ')}] já vibram no portal. Deduza qual(is) caminho(s) completam o Círculo de ${chosenCircle.name}.`,
                isSolved: false
            };
        },

        /**
         * Avalia a dedução dos jogadores para o enigma.
         */
        evaluateDeduction(puzzle, guessedPaths) {
            if (!puzzle || typeof puzzle !== 'object' || !Array.isArray(puzzle.missingPaths)) {
                throw new Error('Puzzle dedutivo inválido.');
            }
            if (!Array.isArray(guessedPaths)) {
                throw new Error('Palpites devem ser um array de caminhos.');
            }

            const cleanGuesses = guessedPaths.map(p => String(p || '').toLowerCase().trim());
            const missingClean = puzzle.missingPaths.map(p => String(p).toLowerCase().trim());

            const allFound = missingClean.every(m => cleanGuesses.includes(m));
            const noExtra = cleanGuesses.every(g => missingClean.includes(g));

            if (allFound && noExtra && cleanGuesses.length === missingClean.length) {
                puzzle.isSolved = true;
                return {
                    success: true,
                    message: `🔮 Dedução magistral! Você canalizou [${cleanGuesses.join(', ')}] e completou com perfeição o Círculo de ${puzzle.circleName}!`
                };
            }

            return {
                success: false,
                message: '✕ Os caminhos canalizados não correspondem às pistas rúnicas. O portal permanece silencioso.'
            };
        }
    };

    /**
     * 3. Mapa de Masmorra com Salas Mágicas (Arcane Dungeon Grid)
     */
    const ArcaneDungeonMapEngine = {
        /**
         * Cria uma masmorra com salas conectadas e exigências arcanas.
         */
        createDungeon(id, title, rooms = []) {
            return {
                id: id || `dungeon_${Date.now()}`,
                title: title || 'Catacumbas dos Doze Selos',
                rooms: rooms.map(r => ({
                    id: r.id,
                    name: r.name,
                    description: r.description || '',
                    requiredPaths: Array.isArray(r.requiredPaths) ? r.requiredPaths : [],
                    connectedRoomIds: Array.isArray(r.connectedRoomIds) ? r.connectedRoomIds : [],
                    isTraversed: false,
                    hazard: r.hazard || null,
                    reward: r.reward || null
                })),
                currentRoomId: rooms[0] ? rooms[0].id : null
            };
        },

        /**
         * Tenta atravessar para uma sala adjacente com base nos caminhos dominados pelo grupo/jogador.
         */
        attemptTraverseRoom(dungeon, targetRoomId, availablePaths = []) {
            if (!dungeon || typeof dungeon !== 'object' || !Array.isArray(dungeon.rooms)) {
                throw new Error('Masmorra inválida.');
            }

            const target = dungeon.rooms.find(r => r.id === targetRoomId);
            if (!target) {
                return { success: false, reason: `Sala com ID "${targetRoomId}" não existe nesta masmorra.` };
            }

            // Se há sala atual, checa se há conexão
            if (dungeon.currentRoomId && dungeon.currentRoomId !== targetRoomId) {
                const current = dungeon.rooms.find(r => r.id === dungeon.currentRoomId);
                if (current && !current.connectedRoomIds.includes(targetRoomId)) {
                    return { success: false, reason: `A sala "${target.name}" não está conectada à sua localização atual.` };
                }
            }

            const cleanAvailable = availablePaths.map(p => String(p).toLowerCase());
            const missing = target.requiredPaths.filter(rp => !cleanAvailable.includes(String(rp).toLowerCase()));

            if (missing.length > 0) {
                return {
                    success: false,
                    reason: `Barreira Mágica: Esta sala requer domínio de [${missing.join(', ')}] para ser atravessada com segurança!`,
                    missingPaths: missing,
                    hazard: target.hazard
                };
            }

            target.isTraversed = true;
            dungeon.currentRoomId = target.id;

            return {
                success: true,
                currentRoom: target,
                message: `✦ Você entrou com segurança em "${target.name}"!`,
                reward: target.reward
            };
        },

        /**
         * Retorna a masmorra pronta "Cidadela dos Quatro Elementos".
         */
        getPrebuiltDungeon() {
            return this.createDungeon('dungeon_cidadela_elemental', 'Cidadela dos Quatro Elementos', [
                {
                    id: 'sala_entrada',
                    name: 'Vestíbulo dos Quatro Ventos',
                    description: 'Uma rotunda aberta com colunas de mármore e lufadas de ar.',
                    requiredPaths: [],
                    connectedRoomIds: ['sala_forja', 'sala_aquifera'],
                    reward: 'Cristal de Mana (+2 PE)'
                },
                {
                    id: 'sala_forja',
                    name: 'Câmara do Fogo Central',
                    description: 'Rios de lava cercam uma bigorna de ferro ancestral incandescente.',
                    requiredPaths: ['fogo'],
                    connectedRoomIds: ['sala_entrada', 'sala_santuario_cataclismo'],
                    reward: 'Minério de Adamante Rúnico',
                    hazard: 'Calor sufocante (queima 1 PE se não tiver proteção)'
                },
                {
                    id: 'sala_aquifera',
                    name: 'Cripta dos Mares Subterrâneos',
                    description: 'Galerias inundadas onde a água mística flui pelas paredes.',
                    requiredPaths: ['agua'],
                    connectedRoomIds: ['sala_entrada', 'sala_santuario_cataclismo'],
                    reward: 'Lágrima Oceânica Concentrada',
                    hazard: 'Correntezas traiçoeiras'
                },
                {
                    id: 'sala_santuario_cataclismo',
                    name: 'Câmara do Selo do Cataclismo',
                    description: 'O epicentro da cidadela onde as três forças primordiais se unem.',
                    requiredPaths: ['fogo', 'ar', 'terra'],
                    connectedRoomIds: ['sala_forja', 'sala_aquifera'],
                    reward: 'O Tomo Sagrado do Cataclismo (T005)',
                    hazard: 'Vórtice Elemental desestabilizador'
                }
            ]);
        }
    };

    const MagicExplorationSystem = {
        PATH_CLUES,
        MultiSealDoorEngine,
        DeductionPuzzleEngine,
        ArcaneDungeonMapEngine
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MagicExplorationSystem;
    } else {
        global.MagicExplorationSystem = MagicExplorationSystem;
    }
})(typeof window !== 'undefined' ? window : global);
