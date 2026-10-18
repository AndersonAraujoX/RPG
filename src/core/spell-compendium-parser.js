/**
 * ============================================================================
 * Kuar-Tor — Parser do Compêndio de Fusões (Secundus & Terceirus)
 * Converte as tabelas Markdown do compêndio (docs/COMPENDIO_FUSOES_NOTION.md)
 * em entradas estruturadas usadas para gerar os Círculos de Magia.
 * ============================================================================
 */

(function (global) {
    'use strict';

    const FORMS = ['Criar', 'Controlar', 'Entender'];

    /** Remove acentos, emojis e símbolos, devolvendo apenas letras minúsculas. */
    function normalizeToken(text) {
        return String(text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z]/g, '')
            .toLowerCase();
    }

    /**
     * Converte "🔥 Fogo + 💧 Água" em ["fogo", "agua"], validando contra os caminhos conhecidos.
     * @throws {Error} se algum caminho não existir em `knownPaths`.
     */
    function parsePathsCell(cell, knownPaths) {
        if (!knownPaths || typeof knownPaths !== 'object') {
            throw new Error('knownPaths inválido.');
        }
        return String(cell || '')
            .split('+')
            .map(normalizeToken)
            .filter(Boolean)
            .map(key => {
                if (!knownPaths[key]) throw new Error(`Caminho desconhecido: "${key}"`);
                return key;
            });
    }

    /** Extrai o nome da magia em negrito ("**Nome** *(CD..)*: desc") de uma célula de forma. */
    function parseSpellName(cell) {
        const match = /\*\*(.+?)\*\*/.exec(String(cell || ''));
        return match ? match[1].trim() : '';
    }

    function stripBold(text) {
        return String(text || '').replace(/\*\*/g, '').trim();
    }

    /** Divide uma linha de tabela Markdown em células (ignora pipes das bordas). */
    function splitRow(line) {
        return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    }

    /**
     * Interpreta uma linha de tabela. Retorna null se não for uma linha de fusão numerada.
     * Secundus usam numeração de 2 dígitos (#01..#66); Terceirus, 3 dígitos (#001..#120).
     */
    function parseRow(line, knownPaths) {
        if (typeof line !== 'string' || !line.trim().startsWith('|')) return null;
        const cells = splitRow(line);
        if (cells.length < 6) return null;

        const numMatch = /^\*\*(\d{2,3})\*\*$/.exec(cells[0]);
        if (!numMatch) return null;

        const numberText = numMatch[1];
        const paths = parsePathsCell(cells[1], knownPaths);
        const tier = numberText.length === 3 ? 'TERCEIRUS' : 'SECUNDUS';
        const expected = tier === 'TERCEIRUS' ? 3 : 2;
        if (paths.length !== expected) {
            throw new Error(`#${numberText}: ${tier} deve ter ${expected} caminhos, encontrado ${paths.length}.`);
        }

        const spells = {};
        FORMS.forEach((form, i) => { spells[form] = parseSpellName(cells[3 + i]); });

        return {
            id: `${tier === 'TERCEIRUS' ? 't' : 's'}${numberText}`,
            number: parseInt(numberText, 10),
            tier,
            name: stripBold(cells[2]),
            paths,
            spells
        };
    }

    /** Percorre o Markdown inteiro e devolve { secundus: [], terceirus: [] }. */
    function parseCompendium(markdown, knownPaths) {
        if (typeof markdown !== 'string') throw new Error('Markdown inválido.');
        const result = { secundus: [], terceirus: [] };
        markdown.split(/\r?\n/).forEach(line => {
            const entry = parseRow(line, knownPaths);
            if (!entry) return;
            (entry.tier === 'TERCEIRUS' ? result.terceirus : result.secundus).push(entry);
        });
        return result;
    }

    const SpellCompendiumParser = { normalizeToken, parsePathsCell, parseSpellName, parseRow, parseCompendium };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SpellCompendiumParser;
    } else {
        global.SpellCompendiumParser = SpellCompendiumParser;
    }

})(typeof window !== 'undefined' ? window : global);
