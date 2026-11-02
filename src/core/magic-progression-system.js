/**
 * Sistema de Progressão Mágica — Kuar-Tor
 *
 * Módulo puro (sem DOM, sem I/O): toda aleatoriedade é injetada (rng) e
 * o estado é sempre devolvido como novo objeto, o que o torna totalmente testável.
 *
 * Mecânicas:
 *  1. Ressonância de Caminhos   -> +1 no 2d6 em Secundus com caminhos de níveis parecidos.
 *  2. Instabilidade Arcana      -> 2 natural em Terceirus dispara um surto de magia do caminho.
 *  3. Maestria de Círculo       -> Novato / Adepto / Mestre reduzem CD e custo de PE.
 *  4. Descoberta de Círculos    -> círculos começam apagados e são revelados por uso ou tomo.
 *  5. Pontos de Especialização  -> no nível 5 de um caminho, escolhe-se um aspecto.
 */
(function (global) {
    'use strict';

    const SPECIALIZATION_LEVEL = 5;
    const RESONANCE_MAX_GAP = 1;

    const MASTERY_TIERS = [
        { key: 'NOVATO', label: 'Novato', minUses: 0, cdMod: 0, peMod: 0 },
        { key: 'ADEPTO', label: 'Adepto', minUses: 3, cdMod: -1, peMod: 0 },
        { key: 'MESTRE', label: 'Mestre', minUses: 8, cdMod: -2, peMod: -1 }
    ];

    /** Dois aspectos por caminho; `forma` indica em qual forma o aspecto concede +1 no 2d6. */
    const SPECIALIZATIONS = {
        fogo: [
            { id: 'brasa', name: 'Brasa', forma: 'Controlar', desc: 'Chamas lentas e persistentes que queimam por turnos.' },
            { id: 'explosao', name: 'Explosão', forma: 'Criar', desc: 'Detonações súbitas de calor e pressão.' }
        ],
        agua: [
            { id: 'correnteza', name: 'Correnteza', forma: 'Controlar', desc: 'Domina fluxos, marés e movimento.' },
            { id: 'geada', name: 'Geada', forma: 'Criar', desc: 'Congela e endurece a água em gelo.' }
        ],
        ar: [
            { id: 'tempestade', name: 'Tempestade', forma: 'Criar', desc: 'Rajadas e relâmpagos violentos.' },
            { id: 'sussurro', name: 'Sussurro', forma: 'Entender', desc: 'Percebe vozes e vibrações a grande distância.' }
        ],
        terra: [
            { id: 'rocha', name: 'Rocha', forma: 'Criar', desc: 'Ergue muralhas e projéteis de pedra.' },
            { id: 'abalo', name: 'Abalo', forma: 'Controlar', desc: 'Faz o solo tremer e rachar.' }
        ],
        luz: [
            { id: 'aurora', name: 'Aurora', forma: 'Criar', desc: 'Luz curativa e radiante.' },
            { id: 'prisma', name: 'Prisma', forma: 'Controlar', desc: 'Dobra e divide a luz em feixes.' }
        ],
        trevas: [
            { id: 'sombra', name: 'Sombra', forma: 'Controlar', desc: 'Molda sombras como se fossem sólidas.' },
            { id: 'breu', name: 'Breu', forma: 'Criar', desc: 'Escuridão que sufoca visão e magia.' }
        ],
        animais: [
            { id: 'matilha', name: 'Matilha', forma: 'Controlar', desc: 'Comanda grupos de animais.' },
            { id: 'predador', name: 'Predador', forma: 'Criar', desc: 'Assume traços de caçadores ferozes.' }
        ],
        humanos: [
            { id: 'empatia', name: 'Empatia', forma: 'Entender', desc: 'Lê emoções e intenções.' },
            { id: 'carisma', name: 'Carisma', forma: 'Controlar', desc: 'Influencia decisões e lealdades.' }
        ],
        plantas: [
            { id: 'espinhos', name: 'Espinhos', forma: 'Criar', desc: 'Raízes e espinhos defensivos.' },
            { id: 'seiva', name: 'Seiva', forma: 'Controlar', desc: 'Regeneração e crescimento acelerado.' }
        ],
        spiritum: [
            { id: 'medium', name: 'Médium', forma: 'Entender', desc: 'Conversa com ecos e espíritos.' },
            { id: 'exorcismo', name: 'Exorcismo', forma: 'Controlar', desc: 'Expulsa e aprisiona presenças.' }
        ],
        arkanum: [
            { id: 'pacto', name: 'Pacto', forma: 'Criar', desc: 'Poder obtido ao custo de barganhas.' },
            { id: 'corrupcao', name: 'Corrupção', forma: 'Controlar', desc: 'Deturpa a magia alheia.' }
        ],
        metamagia: [
            { id: 'amplificar', name: 'Amplificar', forma: 'Criar', desc: 'Intensifica o alcance e o dano.' },
            { id: 'anular', name: 'Anular', forma: 'Controlar', desc: 'Dissipa e desvia feitiços.' }
        ]
    };

    /** Tabela de surtos de magia: 3 efeitos por caminho. */
    const SURGES = {
        fogo: ['Seu cabelo e sobrancelhas pegam fogo (sem dano).', 'Uma explosão de brasas causa 1d6 de dano a você.', 'O calor derrete suas armas de metal.'],
        agua: ['Você fica encharcado e ensopa tudo ao redor.', 'Uma onda empurra todos a 3m de distância.', 'Sua voz sai borbulhante por 1 hora.'],
        ar: ['Um vendaval espalha todos os papéis e itens leves.', 'Você flutua 1m do chão por 1 minuto.', 'Um trovão ensurdece todos por 1 rodada.'],
        terra: ['O chão sob seus pés treme e todos caem.', 'Pedras brotam e bloqueiam a passagem.', 'Seu corpo fica pesado como granito (-2 em movimento).'],
        luz: ['Um clarão cega todos por 1 rodada, inclusive você.', 'Você brilha, revelando sua posição por 1 hora.', 'Sombras fogem de você e ninguém consegue se esconder.'],
        trevas: ['Escuridão total cobre a cena por 1 rodada.', 'Sua sombra ganha vida e foge.', 'Você é tomado por um medo repentino (-1 em testes).'],
        animais: ['Animais próximos ficam agressivos.', 'Você ganha traços animais temporários (cauda, orelhas).', 'Todos os animais da região se voltam para você.'],
        humanos: ['Todos ouvem seus pensamentos superficiais.', 'Você esquece um nome importante.', 'NPCs próximos ficam inexplicavelmente simpáticos ou hostis.'],
        plantas: ['Flores brotam em você e ao redor, atraindo insetos.', 'Vinhas prendem seus pés por 1 rodada.', 'Esporos causam espirros incontroláveis.'],
        spiritum: ['Um espírito inquieto passa a segui-lo.', 'Você fala com a voz de um morto por 1 hora.', 'Ecos do além gelam o ambiente.'],
        arkanum: ['Uma entidade cobra um favor trivial.', 'Runas queimam em sua pele (1 de dano).', 'Sua magia seguinte custa +1 PE.'],
        metamagia: ['Sua próxima magia se duplica em alvo aleatório.', 'Todas as magias próximas falham por 1 rodada.', 'Você troca de lugar com um aliado.']
    };

    function assertEntry(entry) {
        if (!entry || typeof entry !== 'object') throw new Error('Círculo inválido.');
        if (!Array.isArray(entry.paths) || entry.paths.length < 2 || entry.paths.length > 3) {
            throw new Error('Círculo deve ter 2 (Secundus) ou 3 (Terceirus) caminhos.');
        }
    }

    function assertState(state) {
        if (!state || typeof state !== 'object') throw new Error('Estado de progressão inválido.');
    }

    /** Normaliza qualquer dado salvo para um estado de progressão válido. */
    function createProgressionState(raw, seedDiscovered) {
        const src = (raw && typeof raw === 'object') ? raw : {};
        const state = {
            usage: Object.assign({}, src.usage),
            discovered: Object.assign({}, src.discovered),
            specializations: Object.assign({}, src.specializations),
            isSealed: typeof src.isSealed === 'boolean' ? src.isSealed : false,
            sealedAt: src.sealedAt || null
        };
        if (!raw && Array.isArray(seedDiscovered)) {
            seedDiscovered.forEach(id => { if (id) state.discovered[id] = true; });
        }
        return state;
    }

    /** 1. Ressonância: Secundus com os dois caminhos treinados e a no máximo 1 nível de diferença. */
    function computeResonance(entry, skills) {
        assertEntry(entry);
        if (!skills || typeof skills !== 'object') throw new Error('Níveis de caminhos inválidos.');
        if (entry.paths.length !== 2) return 0;
        const a = Number(skills[entry.paths[0]]) || 0;
        const b = Number(skills[entry.paths[1]]) || 0;
        if (a < 1 || b < 1) return 0;
        return Math.abs(a - b) <= RESONANCE_MAX_GAP ? 1 : 0;
    }

    /** 2. Instabilidade: retorna o surto ou null. `rng` deve devolver valores em [0, 1). */
    function rollSurge(entry, diceTotal, rng, table) {
        assertEntry(entry);
        if (typeof rng !== 'function') throw new Error('Gerador aleatório inválido.');
        if (entry.paths.length !== 3 || diceTotal !== 2) return null;
        const surges = table || SURGES;
        const pick = (n) => Math.min(n - 1, Math.floor(rng() * n));
        const path = entry.paths[pick(entry.paths.length)];
        const effects = surges[path];
        if (!Array.isArray(effects) || effects.length === 0) throw new Error(`Sem surtos definidos para "${path}".`);
        return { path, effect: effects[pick(effects.length)] };
    }

    /** 3. Maestria */
    function getMasteryTier(uses) {
        const n = Math.max(0, Number(uses) || 0);
        let tier = MASTERY_TIERS[0];
        MASTERY_TIERS.forEach(t => { if (n >= t.minUses) tier = t; });
        return tier;
    }

    function applyMastery(baseCd, basePe, uses) {
        const cd = Number(baseCd);
        const pe = Number(basePe);
        if (!Number.isFinite(cd) || !Number.isFinite(pe)) throw new Error('CD e PE devem ser numéricos.');
        const tier = getMasteryTier(uses);
        return { cd: Math.max(1, cd + tier.cdMod), pe: Math.max(1, pe + tier.peMod), tier };
    }

    function recordUsage(state, circleId) {
        assertState(state);
        if (!circleId || typeof circleId !== 'string') throw new Error('ID de círculo inválido.');
        const next = createProgressionState(state);
        next.usage[circleId] = (Number(next.usage[circleId]) || 0) + 1;
        next.discovered[circleId] = true;
        return next;
    }

    /** 4. Descoberta */
    function discoverCircle(state, circleId) {
        assertState(state);
        if (!circleId || typeof circleId !== 'string') throw new Error('ID de círculo inválido.');
        const next = createProgressionState(state);
        next.discovered[circleId] = true;
        return next;
    }

    function isDiscovered(state, circleId) {
        assertState(state);
        return !!state.discovered[circleId];
    }

    /**
     * Sela a Biblioteca Arcana: redefine todos os círculos para o estado de selo ancestral (bloqueados).
     * @param {Object} state - Estado de progressão atual.
     * @param {Object} [options] - Opções de selamento.
     * @param {boolean} [options.keepBasics=false] - Se deve manter círculos básicos desvelados.
     * @param {string[]} [options.basicIds=[]] - IDs dos círculos básicos a manter se keepBasics for true.
     * @returns {Object} Novo estado de progressão com a biblioteca selada.
     */
    function sealLibrary(state, options = {}) {
        assertState(state);
        const next = createProgressionState(state);
        next.discovered = {};
        if (options && options.keepBasics && Array.isArray(options.basicIds)) {
            options.basicIds.forEach(id => {
                if (id && typeof id === 'string') next.discovered[id] = true;
            });
        }
        next.isSealed = true;
        next.sealedAt = new Date().toISOString();
        return next;
    }

    /**
     * Desvela a Biblioteca Arcana inteira: marca todos os círculos fornecidos como conhecidos.
     * @param {Object} state - Estado de progressão atual.
     * @param {string[]} allCircleIds - Lista de IDs de todos os círculos a desvelar.
     * @returns {Object} Novo estado de progressão com todos os círculos conhecidos.
     */
    function unsealLibrary(state, allCircleIds = []) {
        assertState(state);
        if (!Array.isArray(allCircleIds)) throw new Error('allCircleIds deve ser um array.');
        const next = createProgressionState(state);
        allCircleIds.forEach(id => {
            if (id && typeof id === 'string') next.discovered[id] = true;
        });
        next.isSealed = false;
        next.unsealedAt = new Date().toISOString();
        return next;
    }

    /**
     * Retorna métricas de selamento da biblioteca arcana.
     * @param {Object} state - Estado de progressão atual.
     * @param {number} [totalCatalogCount=186] - Total de círculos no compêndio (ex: 186).
     * @returns {Object} { discoveredCount, totalCount, sealedCount, percentageDiscovered, isFullySealed, isFullyUnsealed }
     */
    function getLibrarySealStatus(state, totalCatalogCount = 186) {
        assertState(state);
        const discoveredCount = Object.keys(state.discovered || {}).filter(k => !!state.discovered[k]).length;
        const total = Math.max(1, Number(totalCatalogCount) || 186);
        const sealedCount = Math.max(0, total - discoveredCount);
        const percentageDiscovered = Math.min(100, Math.round((discoveredCount / total) * 100));
        return {
            discoveredCount,
            totalCount: total,
            sealedCount,
            percentageDiscovered,
            isFullySealed: discoveredCount === 0,
            isFullyUnsealed: discoveredCount >= total
        };
    }

    /** 5. Especialização */
    function getSpecializationOptions(pathKey) {
        const options = SPECIALIZATIONS[pathKey];
        if (!options) throw new Error(`Caminho desconhecido: "${pathKey}"`);
        return options.slice();
    }

    function chooseSpecialization(state, skills, pathKey, aspectId) {
        assertState(state);
        const options = getSpecializationOptions(pathKey);
        if (!skills || typeof skills !== 'object') throw new Error('Níveis de caminhos inválidos.');
        if ((Number(skills[pathKey]) || 0) < SPECIALIZATION_LEVEL) {
            throw new Error(`Requer nível ${SPECIALIZATION_LEVEL} no caminho para especializar.`);
        }
        if (state.specializations[pathKey]) throw new Error('Este caminho já possui uma especialização.');
        if (!options.some(o => o.id === aspectId)) throw new Error(`Aspecto desconhecido: "${aspectId}"`);
        const next = createProgressionState(state);
        next.specializations[pathKey] = aspectId;
        return next;
    }

    /** Soma +1 por caminho do círculo cuja especialização (ativa, nível >= 5) combina com a forma. */
    function getSpecializationBonus(state, entry, skills, forma) {
        assertState(state);
        assertEntry(entry);
        if (!skills || typeof skills !== 'object') throw new Error('Níveis de caminhos inválidos.');
        return entry.paths.reduce((sum, p) => {
            const chosen = state.specializations[p];
            if (!chosen || (Number(skills[p]) || 0) < SPECIALIZATION_LEVEL) return sum;
            const aspect = (SPECIALIZATIONS[p] || []).find(o => o.id === chosen);
            return sum + (aspect && aspect.forma === forma ? 1 : 0);
        }, 0);
    }

    const MagicProgressionSystem = {
        SPECIALIZATION_LEVEL, MASTERY_TIERS, SPECIALIZATIONS, SURGES,
        createProgressionState, computeResonance, rollSurge, getMasteryTier, applyMastery,
        recordUsage, discoverCircle, isDiscovered,
        sealLibrary, unsealLibrary, getLibrarySealStatus,
        getSpecializationOptions, chooseSpecialization, getSpecializationBonus
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MagicProgressionSystem;
    } else {
        global.MagicProgressionSystem = MagicProgressionSystem;
    }
})(typeof window !== 'undefined' ? window : global);
