/**
 * Gera os artefatos dos Círculos de Magia a partir do compêndio Markdown:
 *  - public/circulos_magia_data.js : dados (66 Secundus + 120 Terceirus) usados pela galeria
 *  - public/circulos/<id>.svg      : um arquivo SVG por fusão (ex.: s01.svg, t001.svg)
 *
 * Uso: node scripts/build-circles.js
 */
const fs = require('fs');
const path = require('path');
const { magicPaths } = require('../src/core/magic-tree-engine');
const { parseCompendium } = require('../src/core/spell-compendium-parser');
const { generateCircleSVG } = require('../src/core/magic-circle-generator');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'docs/COMPENDIO_FUSOES_NOTION.md');
const DATA_OUT = path.join(ROOT, 'public/circulos_magia_data.js');
const SVG_DIR = path.join(ROOT, 'public/circulos');

function main() {
    const compendium = parseCompendium(fs.readFileSync(SOURCE, 'utf-8'), magicPaths);
    if (compendium.secundus.length !== 66 || compendium.terceirus.length !== 120) {
        throw new Error(`Compêndio incompleto: ${compendium.secundus.length} Secundus / ${compendium.terceirus.length} Terceirus.`);
    }

    fs.mkdirSync(SVG_DIR, { recursive: true });
    [...compendium.secundus, ...compendium.terceirus].forEach(entry => {
        fs.writeFileSync(path.join(SVG_DIR, `${entry.id}.svg`), generateCircleSVG(entry, magicPaths), 'utf-8');
    });

    const banner = '// Arquivo gerado por scripts/build-circles.js — não edite manualmente.\n';
    fs.writeFileSync(DATA_OUT, `${banner}window.CIRCLES_DATA = ${JSON.stringify(compendium, null, 1)};\n`, 'utf-8');
    console.log(`OK: ${compendium.secundus.length} Secundus + ${compendium.terceirus.length} Terceirus gerados.`);
}

main();
