/**
 * Testes unitários para a Biblioteca Arcana (12 Caminhos Daemon +2d6 & Fusão)
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const LEGADO_TREE_PATH = path.resolve(__dirname, '../legado/arvore_magia.html');
const PUBLIC_TREE_PATH = path.resolve(__dirname, '../public/arvore_magia.html');

function extractObjectFromHtml(htmlContent, varName) {
    const regex = new RegExp(`const ${varName} = ({[\\s\\S]*?});\\s*(?:const|let|function|//)`);
    const match = htmlContent.match(regex);
    if (!match) {
        throw new Error(`Não foi possível extrair ${varName} do arquivo HTML`);
    }
    return eval('(' + match[1] + ')');
}

QUnit.module('Biblioteca Arcana — 12 Caminhos Daemon & Fusão (+2d6)', function () {

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

    QUnit.test('Estrutura dos 12 Caminhos de Magia (Perícias +2d6)', function (assert) {
        const content = fs.readFileSync(PUBLIC_TREE_PATH, 'utf-8');
        const magicPaths = extractObjectFromHtml(content, 'magicPaths');

        const pathKeys = Object.keys(magicPaths);
        assert.equal(pathKeys.length, 12, 'Devem existir exatamente 12 Caminhos de Magia');

        const elementais = pathKeys.filter(k => magicPaths[k].category === 'elemental');
        const vitais = pathKeys.filter(k => magicPaths[k].category === 'vital');
        const arcanos = pathKeys.filter(k => magicPaths[k].category === 'arcano');

        assert.equal(elementais.length, 6, '6 Caminhos Elementais (Fogo, Água, Ar, Terra, Luz, Trevas)');
        assert.equal(vitais.length, 3, '3 Caminhos Vitais (Animais, Humanos, Plantas)');
        assert.equal(arcanos.length, 3, '3 Caminhos Arcanos (Spiritum, Arkanum, Metamagia)');
    });

    QUnit.test('Estrutura das 3 Formas (Criar, Controlar, Entender)', function (assert) {
        const content = fs.readFileSync(PUBLIC_TREE_PATH, 'utf-8');
        const magicForms = extractObjectFromHtml(content, 'magicForms');

        assert.equal(magicForms['Criar'].cdBase, 10, 'Criar: CD 10');
        assert.equal(magicForms['Controlar'].cdBase, 8, 'Controlar: CD 8');
        assert.equal(magicForms['Entender'].cdBase, 6, 'Entender: CD 6');
    });

    QUnit.test('Matriz de Fusão Arcana e Rolagens 2d6', function (assert) {
        const content = fs.readFileSync(PUBLIC_TREE_PATH, 'utf-8');
        const spellFusions = extractObjectFromHtml(content, 'spellFusions');

        assert.ok(spellFusions['fogo+ar'], 'Fusão Fogo+Ar existe');
        assert.ok(spellFusions['fogo+terra'], 'Fusão Fogo+Terra existe');
        assert.ok(spellFusions['agua+ar'], 'Fusão Água+Ar existe');

        // Resolução 2d6
        function rollTest(d1, d2, bonus, cd) {
            const dice = d1 + d2;
            const total = dice + bonus;
            if (dice === 12) return { success: true, crit: true };
            if (dice === 2) return { success: false, fumble: true };
            return { success: total >= cd };
        }

        assert.ok(rollTest(6, 6, 0, 20).crit, '6+6 = 12 é Acerto Crítico');
        assert.notOk(rollTest(1, 1, 10, 5).success, '1+1 = 2 é Falha Crítica');
        assert.ok(rollTest(4, 5, 2, 10).success, '9 + 2 = 11 vs CD 10 é Sucesso');
    });
});
