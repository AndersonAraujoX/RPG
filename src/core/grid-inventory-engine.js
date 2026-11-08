/**
 * @file src/core/grid-inventory-engine.js
 * @description Inventário em grade (estilo "maleta" de Resident Evil) para Kuar-Tor +2d6.
 * Cada item ocupa uma área (largura x altura) na grade. A área é resolvida em 3 níveis:
 *   1) Override por ID de item; 2) Classe genérica (espada, arco, machado...); 3) Fallback por categoria.
 * Todas as operações são puras (retornam novo estado, sem mutar o original).
 * @module GridInventoryEngine
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.GridInventoryEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const DEFAULT_COLS = 8;
    const DEFAULT_ROWS = 5;

    /**
     * Classes genéricas de itens: `pattern` casa com "id + nome" normalizados.
     * Ordem importa: a primeira que casar vence (mais específicas primeiro).
     */
    const GENERIC_CLASSES = [
        { id: 'adaga', label: 'Adaga / Faca (geral)', w: 1, h: 2, pattern: /adaga|faca|punhal/, examples: 'Adaga de Aço' },
        { id: 'espada_curta', label: 'Espada Curta (geral)', w: 1, h: 3, pattern: /espada curta|gladio|sabre|cimitarra/, examples: 'Espada Curta' },
        { id: 'espada', label: 'Espada (geral)', w: 1, h: 4, pattern: /espada|montante|katana/, examples: 'Espada Longa' },
        { id: 'machado', label: 'Machado / Martelo (geral)', w: 2, h: 3, pattern: /machado|martelo|maca|clava/, examples: 'Machado de Batalha' },
        { id: 'haste', label: 'Lança / Haste (geral)', w: 1, h: 5, pattern: /lanca|alabarda|pique|cajado|bordao/, examples: 'Lança de Guerra' },
        { id: 'arco', label: 'Arco (geral)', w: 2, h: 4, pattern: /arco/, examples: 'Arco Curto, Arco Longo' },
        { id: 'besta', label: 'Besta (geral)', w: 3, h: 2, pattern: /besta/, examples: 'Besta Pesada Rúnica' },
        { id: 'escudo_pequeno', label: 'Escudo Pequeno (geral)', w: 2, h: 2, pattern: /broquel|escudo pequeno/, examples: 'Broquel de Bordo' },
        { id: 'escudo', label: 'Escudo (geral)', w: 2, h: 3, pattern: /escudo/, examples: 'Escudo de Aço Forjado' },
        { id: 'armadura_pesada', label: 'Armadura Pesada (geral)', w: 3, h: 4, pattern: /placas|armadura completa|armadura pesada/, examples: 'Armadura de Placas' },
        { id: 'armadura_media', label: 'Armadura Média (geral)', w: 3, h: 3, pattern: /malha|cota|armadura media|brigantina/, examples: 'Cota de Malha' },
        { id: 'armadura_leve', label: 'Armadura Leve (geral)', w: 2, h: 3, pattern: /armadura|couro|gibao|manto/, examples: 'Armadura de Couro' },
        { id: 'pocao', label: 'Poção / Elixir / Antídoto (geral)', w: 1, h: 1, pattern: /pocao|elixir|antidoto|tonico|frasco/, examples: 'Poção de Sangue Vital' },
        { id: 'luz', label: 'Tocha / Lanterna (geral)', w: 1, h: 2, pattern: /tocha|lanterna|lampiao/, examples: 'Tocha Rúnica' },
        { id: 'pergaminho', label: 'Pergaminho / Tomo (geral)', w: 1, h: 2, pattern: /pergaminho|tomo|grimorio|livro|mapa/, examples: 'Grimório' },
        { id: 'chave', label: 'Chave / Gema / Runa (geral)', w: 1, h: 1, pattern: /chave|gema|runa|anel|amuleto|moeda/, examples: 'Chave, Anel' }
    ];

    /** Fallback por categoria quando nenhuma classe genérica casa. */
    const CATEGORY_FALLBACK = {
        armas: { w: 1, h: 3 },
        armaduras: { w: 3, h: 3 },
        escudos: { w: 2, h: 3 },
        consumiveis: { w: 1, h: 1 },
        aventura: { w: 1, h: 2 }
    };

    /** Overrides exatos por ID (sobrepõem as classes genéricas). */
    const ITEM_OVERRIDES = {
        besta_pesada: { w: 3, h: 2 },
        arco_longo: { w: 2, h: 5 },
        arco_curto: { w: 2, h: 3 },
        broquel_madeira: { w: 2, h: 2 },
        escudo_aco: { w: 3, h: 3 }
    };

    const DEFAULT_FOOTPRINT = { w: 1, h: 1 };

    function normalize(str) {
        return String(str || '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/[-_]/g, ' ').trim();
    }

    function assertInventory(inv) {
        if (!inv || typeof inv !== 'object' || !Array.isArray(inv.items)
            || !Number.isInteger(inv.cols) || !Number.isInteger(inv.rows)) {
            throw new Error('Inventário inválido.');
        }
    }

    /** Resolve a área base (sem rotação) de um item do catálogo. */
    function getFootprint(item) {
        if (!item || typeof item !== 'object') throw new Error('Item inválido.');
        if (item.id && ITEM_OVERRIDES[item.id]) {
            return Object.assign({ source: 'item' }, ITEM_OVERRIDES[item.id]);
        }
        const haystack = normalize(`${item.id || ''} ${item.name || ''}`);
        const cls = GENERIC_CLASSES.find(c => c.pattern.test(haystack));
        if (cls) return { w: cls.w, h: cls.h, source: 'classe', classId: cls.id };
        const cat = CATEGORY_FALLBACK[normalize(item.category)];
        if (cat) return { w: cat.w, h: cat.h, source: 'categoria' };
        return Object.assign({ source: 'padrao' }, DEFAULT_FOOTPRINT);
    }

    /** Área efetiva considerando rotação (troca largura/altura). */
    function getEffectiveSize(item, rotated) {
        const fp = getFootprint(item);
        return rotated ? { w: fp.h, h: fp.w } : { w: fp.w, h: fp.h };
    }

    /** Tabela completa de áreas para exibição: classes genéricas + overrides + categorias. */
    function getFootprintTable(catalog) {
        const rows = GENERIC_CLASSES.map(c => ({
            scope: 'Classe genérica', name: c.label, w: c.w, h: c.h, area: c.w * c.h, examples: c.examples
        }));
        Object.keys(ITEM_OVERRIDES).forEach(id => {
            const ov = ITEM_OVERRIDES[id];
            const it = Array.isArray(catalog) ? catalog.find(i => i.id === id) : null;
            rows.push({ scope: 'Item específico', name: it ? it.name : id, w: ov.w, h: ov.h, area: ov.w * ov.h, examples: id });
        });
        Object.keys(CATEGORY_FALLBACK).forEach(cat => {
            const c = CATEGORY_FALLBACK[cat];
            rows.push({ scope: 'Categoria (reserva)', name: cat, w: c.w, h: c.h, area: c.w * c.h, examples: 'Itens sem classe própria' });
        });
        return rows;
    }

    /** Tabela de TODOS os itens do catálogo com área resolvida e origem da regra. */
    function buildItemAreaTable(catalog) {
        if (!Array.isArray(catalog)) throw new Error('Catálogo inválido.');
        return catalog.map(it => {
            const fp = getFootprint(it);
            return { id: it.id, name: it.name, category: it.category, w: fp.w, h: fp.h, area: fp.w * fp.h, source: fp.source };
        });
    }

    function createInventory(cols, rows) {
        const c = cols === undefined ? DEFAULT_COLS : cols;
        const r = rows === undefined ? DEFAULT_ROWS : rows;
        if (!Number.isInteger(c) || !Number.isInteger(r) || c < 1 || r < 1) {
            throw new Error('Dimensões da maleta inválidas.');
        }
        return { cols: c, rows: r, items: [], nextUid: 1 };
    }

    function clampAttr(v) { return Math.max(0, Math.min(4, Math.floor(Number(v)) || 0)); }

    /** Maleta: FOR (0..4) define as linhas (4 + FOR); CON (0..4) define as colunas (6 + CON). */
    function capacityFromAttributes(forVal, conVal) {
        return { cols: 6 + clampAttr(conVal), rows: 4 + clampAttr(forVal) };
    }

    /** Resolve o tamanho de uma entrada colocada usando o catálogo injetado. */
    function sizeOf(entry, resolveItem) {
        const item = resolveItem(entry.itemId);
        if (!item) throw new Error(`Item desconhecido: ${entry.itemId}`);
        return getEffectiveSize(item, entry.rotated);
    }

    function buildOccupancy(inv, resolveItem, ignoreUid) {
        const grid = Array.from({ length: inv.rows }, () => Array(inv.cols).fill(null));
        inv.items.forEach(e => {
            if (e.uid === ignoreUid) return;
            const s = sizeOf(e, resolveItem);
            for (let dy = 0; dy < s.h; dy++) {
                for (let dx = 0; dx < s.w; dx++) grid[e.y + dy][e.x + dx] = e.uid;
            }
        });
        return grid;
    }

    function fits(inv, size, x, y, resolveItem, ignoreUid) {
        if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
        if (x < 0 || y < 0 || x + size.w > inv.cols || y + size.h > inv.rows) return false;
        const occ = buildOccupancy(inv, resolveItem, ignoreUid);
        for (let dy = 0; dy < size.h; dy++) {
            for (let dx = 0; dx < size.w; dx++) if (occ[y + dy][x + dx] !== null) return false;
        }
        return true;
    }

    function canPlace(inv, item, x, y, rotated, resolveItem) {
        assertInventory(inv);
        return fits(inv, getEffectiveSize(item, !!rotated), x, y, resolveItem);
    }

    function placeItem(inv, item, x, y, rotated, resolveItem) {
        assertInventory(inv);
        if (!canPlace(inv, item, x, y, rotated, resolveItem)) {
            throw new Error('Sem espaço: área ocupada ou fora da maleta.');
        }
        const entry = { uid: inv.nextUid, itemId: item.id, x, y, rotated: !!rotated };
        return Object.assign({}, inv, { items: inv.items.concat(entry), nextUid: inv.nextUid + 1 });
    }

    function removeItem(inv, uid) {
        assertInventory(inv);
        if (!inv.items.some(e => e.uid === uid)) throw new Error('Item não encontrado na maleta.');
        return Object.assign({}, inv, { items: inv.items.filter(e => e.uid !== uid) });
    }

    function moveItem(inv, uid, x, y, resolveItem, rotated) {
        assertInventory(inv);
        const entry = inv.items.find(e => e.uid === uid);
        if (!entry) throw new Error('Item não encontrado na maleta.');
        const rot = rotated === undefined ? entry.rotated : !!rotated;
        const item = resolveItem(entry.itemId);
        if (!fits(inv, getEffectiveSize(item, rot), x, y, resolveItem, uid)) {
            throw new Error('Sem espaço: área ocupada ou fora da maleta.');
        }
        const moved = Object.assign({}, entry, { x, y, rotated: rot });
        return Object.assign({}, inv, { items: inv.items.map(e => (e.uid === uid ? moved : e)) });
    }

    function rotateItem(inv, uid, resolveItem) {
        assertInventory(inv);
        const entry = inv.items.find(e => e.uid === uid);
        if (!entry) throw new Error('Item não encontrado na maleta.');
        return moveItem(inv, uid, entry.x, entry.y, resolveItem, !entry.rotated);
    }

    /** Procura o primeiro encaixe livre (tenta normal e depois rotacionado). Retorna null se cheio. */
    function findFreeSlot(inv, item, resolveItem) {
        assertInventory(inv);
        for (const rotated of [false, true]) {
            const size = getEffectiveSize(item, rotated);
            for (let y = 0; y <= inv.rows - size.h; y++) {
                for (let x = 0; x <= inv.cols - size.w; x++) {
                    if (fits(inv, size, x, y, resolveItem)) return { x, y, rotated };
                }
            }
        }
        return null;
    }

    function autoPlace(inv, item, resolveItem) {
        const slot = findFreeSlot(inv, item, resolveItem);
        if (!slot) throw new Error('Maleta cheia: nenhum espaço livre para este item.');
        return placeItem(inv, item, slot.x, slot.y, slot.rotated, resolveItem);
    }

    /** Estatísticas de ocupação (somente espaço). */
    function getStats(inv, resolveItem) {
        assertInventory(inv);
        let used = 0;
        inv.items.forEach(e => {
            const s = sizeOf(e, resolveItem);
            used += s.w * s.h;
        });
        const total = inv.cols * inv.rows;
        return { totalCells: total, usedCells: used, freeCells: total - used };
    }

    /** Valida/normaliza dado salvo; descarta itens que não cabem ou desconhecidos. */
    function restoreInventory(raw, resolveItem) {
        if (!raw || typeof raw !== 'object') return createInventory();
        let inv;
        try { inv = createInventory(raw.cols, raw.rows); } catch (e) { inv = createInventory(); }
        (Array.isArray(raw.items) ? raw.items : []).forEach(e => {
            const item = e && resolveItem(e.itemId);
            if (!item) return;
            try { inv = placeItem(inv, item, e.x, e.y, e.rotated, resolveItem); } catch (err) { /* descarta */ }
        });
        return inv;
    }

    /**
     * Extrai com segurança FOR, CON e metadados de qualquer ficha ou objeto salvo.
     * Trunca e delimita valores entre 0 e 4 (regra de atributos de Kuar-Tor).
     * @param {Object} sheet Ficha ou entrada de ficha.
     * @returns {{ forVal: number, conVal: number, name: string, id: string }}
     */
    function extractAttributesFromSheet(sheet) {
        if (!sheet || typeof sheet !== 'object') {
            return { forVal: 1, conVal: 2, name: 'Sem Ficha', id: '' };
        }
        const data = sheet.sheetData || sheet;
        const rawFor = data.for !== undefined ? data.for
            : (data.forVal !== undefined ? data.forVal
            : (data.forca !== undefined ? data.forca
            : (data.attributes && data.attributes.for !== undefined ? data.attributes.for : 1)));

        const rawCon = data.con !== undefined ? data.con
            : (data.conVal !== undefined ? data.conVal
            : (data.constituicao !== undefined ? data.constituicao
            : (data.attributes && data.attributes.con !== undefined ? data.attributes.con : 2)));

        const name = String(sheet.name || data.charName || data.name || 'Herói Sem Nome').trim();
        const id = String(sheet.id || data.id || '').trim();

        return {
            forVal: clampAttr(rawFor),
            conVal: clampAttr(rawCon),
            name: name || 'Herói Sem Nome',
            id
        };
    }

    /**
     * Retorna a chave do LocalStorage para persistir a maleta de um personagem.
     * Permite maletas isoladas por herói ou chave padrão para uso manual.
     * @param {string} [characterId]
     * @returns {string}
     */
    function getStorageKeyForCharacter(characterId) {
        const cleanId = String(characterId || '').trim();
        return cleanId ? `kuartor_grid_inventory_${cleanId}` : 'kuartor_grid_inventory';
    }

    /**
     * Sincroniza e redimensiona a maleta com os atributos FOR e CON de uma ficha,
     * preservando itens existentes que couberem nas novas dimensões.
     * @param {Object} inv Estado atual da maleta.
     * @param {Object} sheet Ficha do herói.
     * @param {Function} resolveItem Função para resolver item por ID.
     * @returns {Object} Novo estado da maleta com dimensões ajustadas.
     */
    function syncWithCharacterSheet(inv, sheet, resolveItem) {
        assertInventory(inv);
        const { forVal, conVal } = extractAttributesFromSheet(sheet);
        const cap = capacityFromAttributes(forVal, conVal);
        return restoreInventory(Object.assign({}, inv, { cols: cap.cols, rows: cap.rows }), resolveItem);
    }

    /**
     * Importa itens de uma lista de inventário de ficha (ex: bridge de equipamentos)
     * adicionando-os na maleta nos primeiros espaços disponíveis.
     * @param {Object} inv Estado atual da maleta.
     * @param {Array} sheetInventory Lista de itens da ficha.
     * @param {Function} resolveItem Função para resolver item por ID.
     * @returns {{ inv: Object, importedCount: number, skippedCount: number }}
     */
    function importItemsFromSheetInventory(inv, sheetInventory, resolveItem) {
        assertInventory(inv);
        if (!Array.isArray(sheetInventory) || typeof resolveItem !== 'function') {
            return { inv, importedCount: 0, skippedCount: 0 };
        }
        let currentInv = inv;
        let importedCount = 0;
        let skippedCount = 0;

        for (const rawItem of sheetInventory) {
            if (!rawItem) continue;
            const itemId = rawItem.id || rawItem.itemId;
            const item = itemId ? resolveItem(itemId) : null;
            if (!item) {
                skippedCount++;
                continue;
            }
            const qty = Math.max(1, parseInt(rawItem.quantity || rawItem.qtd || 1) || 1);
            for (let q = 0; q < qty; q++) {
                try {
                    currentInv = autoPlace(currentInv, item, resolveItem);
                    importedCount++;
                } catch (e) {
                    skippedCount++;
                }
            }
        }

        return { inv: currentInv, importedCount, skippedCount };
    }

    return {
        DEFAULT_COLS, DEFAULT_ROWS, GENERIC_CLASSES, ITEM_OVERRIDES, CATEGORY_FALLBACK,
        getFootprint, getEffectiveSize, getFootprintTable, buildItemAreaTable,
        createInventory, capacityFromAttributes, canPlace, placeItem, removeItem,
        moveItem, rotateItem, findFreeSlot, autoPlace, getStats, restoreInventory,
        extractAttributesFromSheet, getStorageKeyForCharacter, syncWithCharacterSheet, importItemsFromSheetInventory
    };
}));
