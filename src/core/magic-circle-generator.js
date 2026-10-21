/**
 * ============================================================================
 * Kuar-Tor — Gerador de Círculos de Magia (+2d6)
 * Gera um círculo de magia SVG determinístico para cada fusão Secundus
 * (2 caminhos) ou Terceirus (3 caminhos), a partir da combinação de caminhos.
 *
 * Linguagem visual:
 *  - Cada caminho contribui com sua cor e com um polígono de assinatura
 *    (3 a 8 lados, conforme a posição do caminho nos 12 Caminhos).
 *  - Secundus: Vesica Piscis (2 círculos) + 2 polígonos + eixo duplo.
 *  - Terceirus: Venn de 3 círculos + 3 polígonos + hexagrama + coroa extra de runas.
 *  - O anel de runas é pseudo-aleatório, porém determinístico (semente = id da fusão).
 * ============================================================================
 */

(function (global) {
    'use strict';

    const SIZE = 400;
    const CENTER = SIZE / 2;
    const TIER_CONFIG = {
        2: { tier: 'SECUNDUS', runes: 22, ticks: 48, spokes: 8 },
        3: { tier: 'TERCEIRUS', runes: 34, ticks: 72, spokes: 12 }
    };

    const fmt = n => Number(n.toFixed(2));

    /** Hash FNV-1a de 32 bits (determinístico). */
    function hashString(text) {
        let h = 0x811c9dc5;
        const str = String(text);
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        return h >>> 0;
    }

    /** PRNG mulberry32: devolve função que gera floats em [0,1). */
    function createRng(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function polar(radius, angleRad) {
        return { x: fmt(CENTER + radius * Math.cos(angleRad)), y: fmt(CENTER + radius * Math.sin(angleRad)) };
    }

    const toRad = deg => (deg * Math.PI) / 180;

    /** Pontos de um polígono regular (string para o atributo `points`). */
    function polygonPoints(radius, sides, rotationDeg) {
        const pts = [];
        for (let i = 0; i < sides; i++) {
            const p = polar(radius, toRad(rotationDeg + (360 / sides) * i));
            pts.push(`${p.x},${p.y}`);
        }
        return pts.join(' ');
    }

    /** Número de lados da assinatura geométrica de um caminho (3..8). */
    function sidesFor(pathKey, paths) {
        const index = Object.keys(paths).indexOf(pathKey);
        if (index < 0) throw new Error(`Caminho desconhecido: "${pathKey}"`);
        return 3 + (index % 6);
    }

    function escapeXml(text) {
        return String(text).replace(/[&<>"']/g, ch => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]
        ));
    }

    /** Glifo rúnico: haste radial com 1–2 ramificações em ângulos aleatórios. */
    function runeGlyph(angleRad, rng, innerR, outerR) {
        const stem = [polar(innerR, angleRad), polar(outerR, angleRad)];
        let d = `M${stem[0].x} ${stem[0].y}L${stem[1].x} ${stem[1].y}`;
        const branches = 1 + Math.floor(rng() * 2);
        for (let b = 0; b < branches; b++) {
            const baseR = innerR + (outerR - innerR) * (0.25 + rng() * 0.5);
            const dir = rng() < 0.5 ? -1 : 1;
            const base = polar(baseR, angleRad);
            const tip = polar(baseR + (rng() < 0.5 ? 5 : -5), angleRad + dir * (0.05 + rng() * 0.05));
            d += `M${base.x} ${base.y}L${tip.x} ${tip.y}`;
        }
        return d;
    }

    function validateEntry(entry, paths) {
        if (!entry || typeof entry !== 'object') throw new Error('Fusão inválida.');
        if (!entry.id || typeof entry.id !== 'string') throw new Error('Fusão sem id.');
        if (!paths || typeof paths !== 'object') throw new Error('Caminhos inválidos.');
        const keys = entry.paths;
        if (!Array.isArray(keys) || !TIER_CONFIG[keys.length]) {
            throw new Error('A fusão deve ter 2 (Secundus) ou 3 (Terceirus) caminhos.');
        }
        if (new Set(keys).size !== keys.length) throw new Error('Caminhos duplicados na fusão.');
        keys.forEach(k => { if (!paths[k]) throw new Error(`Caminho desconhecido: "${k}"`); });
    }

    /**
     * Gera o SVG do círculo de magia.
     * @param {{id:string,name?:string,paths:string[]}} entry
     * @param {Object} paths mapa de caminhos { key: { color, name, ... } }
     * @returns {string} markup SVG
     */
    function generateCircleSVG(entry, paths) {
        validateEntry(entry, paths);

        const keys = entry.paths;
        const count = keys.length;
        const cfg = TIER_CONFIG[count];
        const colors = keys.map(k => paths[k].color);
        const rng = createRng(hashString(entry.id));
        const uid = `mc-${entry.id}`;
        const title = escapeXml(entry.name || entry.id);
        const parts = [];

        // Definições: gradiente do anel e brilho central
        const stops = colors.map((c, i) => `<stop offset="${fmt((i / Math.max(count - 1, 1)) * 100)}%" stop-color="${c}"/>`).join('');
        parts.push(`<defs><linearGradient id="${uid}-g" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>` +
            `<radialGradient id="${uid}-glow"><stop offset="0%" stop-color="${colors[0]}" stop-opacity="0.35"/>` +
            `<stop offset="100%" stop-color="${colors[0]}" stop-opacity="0"/></radialGradient></defs>`);

        // Aura de fundo
        parts.push(`<circle cx="${CENTER}" cy="${CENTER}" r="195" fill="url(#${uid}-glow)"/>`);

        // Anéis externos e internos
        const ring = (r, w, o) => `<circle cx="${CENTER}" cy="${CENTER}" r="${r}" fill="none" stroke="url(#${uid}-g)" stroke-width="${w}" opacity="${o}"/>`;
        parts.push(ring(190, 3, 1), ring(182, 1, 0.6), ring(178, 1, 0.4), ring(144, 1.5, 0.9), ring(138, 1, 0.5));

        // Marcas do anel externo, agrupadas por cor
        const tickPaths = colors.map(() => '');
        for (let i = 0; i < cfg.ticks; i++) {
            const a = toRad((360 / cfg.ticks) * i);
            const long = i % 4 === 0;
            const p1 = polar(long ? 180 : 183, a);
            const p2 = polar(190, a);
            tickPaths[i % count] += `M${p1.x} ${p1.y}L${p2.x} ${p2.y}`;
        }
        tickPaths.forEach((d, i) => parts.push(`<path d="${d}" stroke="${colors[i]}" stroke-width="1.2" fill="none" opacity="0.85"/>`));

        // Anel de runas determinístico
        const runeGroups = colors.map(() => '');
        for (let i = 0; i < cfg.runes; i++) {
            const a = toRad((360 / cfg.runes) * i + 360 / (cfg.runes * 2));
            runeGroups[i % count] += runeGlyph(a, rng, 150, 172);
        }
        runeGroups.forEach((d, i) => parts.push(`<path d="${d}" stroke="${colors[i]}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`));

        // Raios finos de ligação
        let spokes = '';
        for (let i = 0; i < cfg.spokes; i++) {
            const a = toRad((360 / cfg.spokes) * i - 90);
            const p1 = polar(60, a);
            const p2 = polar(138, a);
            spokes += `M${p1.x} ${p1.y}L${p2.x} ${p2.y}`;
        }
        parts.push(`<path d="${spokes}" stroke="url(#${uid}-g)" stroke-width="0.8" opacity="0.4" fill="none"/>`);

        // Polígonos de assinatura (um por caminho)
        keys.forEach((k, i) => {
            const sides = sidesFor(k, paths);
            const rot = -90 + i * (180 / sides);
            parts.push(`<polygon points="${polygonPoints(126, sides, rot)}" fill="${colors[i]}" fill-opacity="0.06" stroke="${colors[i]}" stroke-width="2" stroke-linejoin="round"/>`);
        });

        // Terceirus: hexagrama central de maestria
        if (count === 3) {
            parts.push(`<polygon points="${polygonPoints(100, 3, -90)}" fill="none" stroke="url(#${uid}-g)" stroke-width="1.8"/>`);
            parts.push(`<polygon points="${polygonPoints(100, 3, 90)}" fill="none" stroke="url(#${uid}-g)" stroke-width="1.8"/>`);
        }

        // Núcleo: Vesica Piscis (2) ou Venn (3)
        const coreR = count === 2 ? 52 : 46;
        const centers = count === 2
            ? [{ x: CENTER - 28, y: CENTER }, { x: CENTER + 28, y: CENTER }]
            : [-90, 30, 150].map(deg => polar(30, toRad(deg)));
        centers.forEach((c, i) => parts.push(`<circle cx="${c.x}" cy="${c.y}" r="${coreR}" fill="${colors[i]}" fill-opacity="0.13" stroke="${colors[i]}" stroke-width="2.2"/>`));

        // Âncoras dos caminhos (um nó colorido por caminho)
        keys.forEach((k, i) => {
            const p = polar(126, toRad(-90 + (360 / count) * i));
            parts.push(`<circle cx="${p.x}" cy="${p.y}" r="9" fill="#04070d" stroke="${colors[i]}" stroke-width="2.5"/>`);
            parts.push(`<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${colors[i]}"/>`);
        });

        // Centro luminoso
        parts.push(`<circle cx="${CENTER}" cy="${CENTER}" r="6" fill="#ffffff" fill-opacity="0.9"/>`);

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="${title}" data-tier="${cfg.tier}" data-paths="${keys.join(',')}"><title>${title}</title>${parts.join('')}</svg>`;
    }

    /** Gera o SVG de círculo primário (1 caminho) para os 12 Caminhos Primários. */
    function generatePrimaryCircleSVG(pathKey, paths) {
        if (!paths || typeof paths !== 'object') {
            throw new Error('Caminhos inválidos.');
        }
        if (!paths[pathKey]) {
            throw new Error(`Caminho desconhecido: "${pathKey}"`);
        }
        const p = paths[pathKey];
        const color = p.color;
        const sides = sidesFor(pathKey, paths);
        const rng = createRng(hashString(`primary-${pathKey}`));
        const uid = `mc-p-${pathKey}`;
        const title = escapeXml(p.name || pathKey);
        const parts = [];

        parts.push(`<defs><radialGradient id="${uid}-glow"><stop offset="0%" stop-color="${color}" stop-opacity="0.38"/>` +
            `<stop offset="100%" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>`);
        parts.push(`<circle cx="${CENTER}" cy="${CENTER}" r="192" fill="url(#${uid}-glow)"/>`);
        parts.push(`<circle cx="${CENTER}" cy="${CENTER}" r="186" fill="rgba(7,15,28,0.88)" stroke="${color}" stroke-width="3.5"/>`);
        parts.push(`<circle cx="${CENTER}" cy="${CENTER}" r="172" fill="none" stroke="${color}" stroke-width="1.2" stroke-dasharray="6,4" opacity="0.7"/>`);
        parts.push(`<circle cx="${CENTER}" cy="${CENTER}" r="144" fill="none" stroke="${color}" stroke-width="1.6" opacity="0.85"/>`);

        let runes = '';
        for (let i = 0; i < 16; i++) {
            const a = toRad((360 / 16) * i + 11.25);
            runes += runeGlyph(a, rng, 148, 168);
        }
        parts.push(`<path d="${runes}" stroke="${color}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`);

        parts.push(`<polygon points="${polygonPoints(128, sides, -90)}" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/>`);
        parts.push(`<polygon points="${polygonPoints(128, sides, 90)}" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.55" stroke-linejoin="round"/>`);

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="${title}" data-tier="PRIMARIUS" data-paths="${pathKey}"><title>${title}</title>${parts.join('')}</svg>`;
    }

    /**
     * Gera o HTML da animação de convergência quando 2 (Secundus) ou 3 (Terceirus)
     * círculos básicos se fundem em um Círculo de Magia composto.
     *
     * @param {Object} entry - { id, name, paths: string[] }
     * @param {Object} paths - Dicionário dos 12 caminhos místicos
     * @param {Object} [options] - { size: number }
     * @returns {string} HTML da cena animada de convergência
     */
    function generateConvergenceAnimationHTML(entry, paths, options) {
        if (!paths || typeof paths !== 'object') {
            throw new Error('Caminhos inválidos.');
        }
        if (!entry || typeof entry !== 'object') {
            throw new Error('Fusão inválida.');
        }
        const fusedSvg = generateCircleSVG(entry, paths);
        const keys = entry.paths;
        const count = keys.length;
        const tier = count === 3 ? 'TERCEIRUS' : 'SECUNDUS';
        const size = (options && Number(options.size) > 0) ? Number(options.size) : 164;
        const primaryColor = paths[keys[0]].color;
        const secondaryColor = paths[keys[count - 1]].color;

        const vectors = count === 2
            ? [
                { x: '-62px', y: '0px' },
                { x: '62px', y: '0px' }
            ]
            : [
                { x: '0px', y: '-58px' },
                { x: '52px', y: '32px' },
                { x: '-52px', y: '32px' }
            ];

        const fragmentsHtml = keys.map((k, idx) => {
            const pSvg = generatePrimaryCircleSVG(k, paths);
            const vec = vectors[idx];
            const color = paths[k].color;
            return `<div class="mc-orbit-fragment" data-fragment-path="${k}" style="--mc-from-x:${vec.x};--mc-from-y:${vec.y};--mc-color:${color};">${pSvg}</div>`;
        }).join('');

        return (
            `<div class="mc-convergence-stage" data-circle-id="${escapeXml(entry.id)}" data-convergence-tier="${tier}" data-convergence-paths="${keys.join(',')}" style="width:${size}px;height:${size}px;--mc-primary:${primaryColor};--mc-secondary:${secondaryColor};">` +
                fragmentsHtml +
                `<div class="mc-shockwave-ring"></div>` +
                `<div class="mc-shockwave-ring mc-shockwave-delayed"></div>` +
                `<div class="mc-fused-core">${fusedSvg}</div>` +
            `</div>`
        );
    }

    /** Gera o SVG de cada entrada, preservando os dados originais. */
    function buildCatalog(entries, paths) {
        if (!Array.isArray(entries)) throw new Error('Entradas inválidas.');
        return entries.map(entry => Object.assign({}, entry, { svg: generateCircleSVG(entry, paths) }));
    }

    const MagicCircleGenerator = { hashString, createRng, polygonPoints, sidesFor, escapeXml, generateCircleSVG, generatePrimaryCircleSVG, generateConvergenceAnimationHTML, buildCatalog };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MagicCircleGenerator;
    } else {
        global.MagicCircleGenerator = MagicCircleGenerator;
    }

})(typeof window !== 'undefined' ? window : global);
