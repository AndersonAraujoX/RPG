/**
 * Testes unitários para a Biblioteca Arcana (Árvore de Magia)
 * Valida a integridade do banco de magias, cálculo de tiers, consistência de pré-requisitos,
 * coordenadas espaciais e conformidade com as regras de design/segurança (sem CDN bloqueado).
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const LEGADO_TREE_PATH = path.resolve(__dirname, '../legado/arvore_magia.html');
const PUBLIC_TREE_PATH = path.resolve(__dirname, '../public/arvore_magia.html');

// Extrair o objeto rawSpells e computeLayout do código HTML para testes isolados
function extractSpellsData(htmlContent) {
    const rawSpellsMatch = htmlContent.match(/const rawSpells = ({[\s\S]*?});\s*const collegeAngles/);
    if (!rawSpellsMatch) {
        throw new Error('Não foi possível extrair rawSpells do arquivo HTML');
    }
    // Avaliar objeto JSON-like
    const rawSpellsStr = rawSpellsMatch[1];
    return eval('(' + rawSpellsStr + ')');
}

function extractCollegeAngles(htmlContent) {
    const match = htmlContent.match(/const collegeAngles = ({[\s\S]*?});/);
    if (!match) {
        throw new Error('Não foi possível extrair collegeAngles do arquivo HTML');
    }
    return eval('(' + match[1] + ')');
}

QUnit.module('Árvore de Magia — Biblioteca Arcana', function () {

    QUnit.test('Arquivos arvore_magia.html devem existir em /legado e /public', function (assert) {
        assert.ok(fs.existsSync(LEGADO_TREE_PATH), 'legado/arvore_magia.html deve existir');
        assert.ok(fs.existsSync(PUBLIC_TREE_PATH), 'public/arvore_magia.html deve existir');
    });

    QUnit.test('Arquivos não devem usar CDN bloqueado cdn.tailwindcss.com', function (assert) {
        const legadoContent = fs.readFileSync(LEGADO_TREE_PATH, 'utf-8');
        const publicContent = fs.readFileSync(PUBLIC_TREE_PATH, 'utf-8');

        assert.notOk(legadoContent.includes('cdn.tailwindcss.com'), 'legado/arvore_magia.html não deve conter cdn.tailwindcss.com');
        assert.notOk(publicContent.includes('cdn.tailwindcss.com'), 'public/arvore_magia.html não deve conter cdn.tailwindcss.com');
    });

    QUnit.test('Todos os pré-requisitos das magias devem existir na base de dados', function (assert) {
        const content = fs.readFileSync(LEGADO_TREE_PATH, 'utf-8');
        const rawSpells = extractSpellsData(content);

        const spellKeys = Object.keys(rawSpells);
        assert.ok(spellKeys.length >= 40, `Deve conter ao menos 40 magias catalogadas (encontradas: ${spellKeys.length})`);

        const missingReqs = [];

        spellKeys.forEach(id => {
            const spell = rawSpells[id];
            if (spell.reqs && spell.reqs.length > 0) {
                spell.reqs.forEach(req => {
                    if (!rawSpells[req]) {
                        missingReqs.push(`Magia '${id}' requer '${req}' que não existe no catálogo`);
                    }
                });
            }
        });

        assert.deepEqual(missingReqs, [], 'Todos os pré-requisitos referenciados devem ser válidos');
    });

    QUnit.test('Cálculo de Tiers (Camadas) e Coordenadas Espaciais', function (assert) {
        const content = fs.readFileSync(LEGADO_TREE_PATH, 'utf-8');
        const rawSpells = extractSpellsData(content);
        const collegeAngles = extractCollegeAngles(content);

        // Algoritmo de Tiers
        function getTier(id, depth = 0) {
            if (depth > 20) return 1;
            if (id === 'magery_0') return 0;
            const spell = rawSpells[id];
            if (!spell || !spell.reqs || spell.reqs.length === 0) return 1;
            let maxT = 0;
            spell.reqs.forEach(req => {
                const rt = getTier(req, depth + 1);
                if (rt > maxT) maxT = rt;
            });
            return maxT + 1;
        }

        const spellTree = {};
        Object.keys(rawSpells).forEach(id => {
            spellTree[id] = { ...rawSpells[id], _tier: getTier(id) };
        });

        // Testar Tiers de nós chave
        assert.equal(spellTree['magery_0']._tier, 0, 'Magery 0 deve ter Tier 0 (Centro)');
        assert.equal(spellTree['magery_1']._tier, 1, 'Magery 1 deve ter Tier 1');
        assert.equal(spellTree['magery_2']._tier, 2, 'Magery 2 deve ter Tier 2');
        assert.equal(spellTree['magery_3']._tier, 3, 'Magery 3 deve ter Tier 3');

        // Testar posicionamento de nós
        let counters = {};
        const invalidCoords = [];

        Object.keys(spellTree).forEach(id => {
            const s = spellTree[id];
            if (id === 'magery_0') {
                s.x = 0; s.y = 0;
                return;
            }
            if (s.college === 'Core') {
                s.x = 0; s.y = s._tier * -140;
                return;
            }

            const key = s.college + '_' + s._tier;
            counters[key] = (counters[key] || 0) + 1;
            let countIndex = counters[key] - 1;

            const baseAngle = collegeAngles[s.college] !== undefined ? collegeAngles[s.college] : 0;
            let offset = countIndex === 0 ? 0 : (countIndex % 2 === 1 ? (Math.ceil(countIndex / 2) * 26) : -(Math.ceil(countIndex / 2) * 26));

            const ang = (baseAngle + offset) * Math.PI / 180;
            const radius = s._tier * 165;

            s.x = Math.round(Math.cos(ang) * radius);
            s.y = Math.round(Math.sin(ang) * radius);

            if (isNaN(s.x) || isNaN(s.y)) {
                invalidCoords.push(id);
            }
        });

        assert.deepEqual(invalidCoords, [], 'Nenhuma coordenada espacial deve ser NaN');
        assert.equal(spellTree['magery_0'].x, 0, 'Magery 0 x = 0');
        assert.equal(spellTree['magery_0'].y, 0, 'Magery 0 y = 0');
    });

    QUnit.test('Elementos de interface ricos no HTML', function (assert) {
        const content = fs.readFileSync(LEGADO_TREE_PATH, 'utf-8');

        assert.ok(content.includes('id="stars-canvas"'), 'Deve conter canvas cósmico de estrelas');
        assert.ok(content.includes('id="connections-svg"'), 'Deve conter elemento SVG para conexões suaves');
        assert.ok(content.includes('id="spell-search"'), 'Deve conter barra de busca de magias');
        assert.ok(content.includes('id="info-tooltip"'), 'Deve conter tooltip dinâmico');
        assert.ok(content.includes('id="purchase-modal"'), 'Deve conter modal de aprendizado de feitiço');
        assert.ok(content.includes('id="cp-display"'), 'Deve conter mostrador de CP');
    });
});
