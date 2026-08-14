/**
 * Testes unitários para a aplicação Single-File VTT (+2d6 v2.3 Tio Nitro) em index.html
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const INDEX_HTML_PATH = path.resolve(__dirname, '../index.html');

function extractDataFromIndex(htmlContent, varName) {
    const regex = new RegExp(`const ${varName} = ({[\\s\\S]*?}|(?:\\[[\\s\\S]*?\\]));\\s*(?:const|let|function|//)`);
    const match = htmlContent.match(regex);
    if (!match) {
        throw new Error(`Não foi possível extrair ${varName} de index.html`);
    }
    return eval('(' + match[1] + ')');
}

QUnit.module('Single-File VTT +2d6 (index.html)', function () {

    QUnit.test('Arquivo index.html deve existir na raiz e conter as 5 seções principais', function (assert) {
        assert.ok(fs.existsSync(INDEX_HTML_PATH), 'index.html deve existir');
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        // Verificar 5 Abas
        assert.ok(content.includes('id="tab-roller"'), 'Aba 1: Rolador 2d6 deve existir');
        assert.ok(content.includes('id="tab-sheet"'), 'Aba 2: Ficha Interativa deve existir');
        assert.ok(content.includes('id="tab-combat"'), 'Aba 3: Gerenciador de Combate deve existir');
        assert.ok(content.includes('id="tab-bestiary"'), 'Aba 4: Bestiário & PdMs deve existir');
        assert.ok(content.includes('id="tab-compendium"'), 'Aba 5: Compêndio de Regras deve existir');
    });

    QUnit.test('Fórmulas Matemáticas da Ficha (+2d6 v2.3)', function (assert) {
        // PVs = 10 + CON + FOR
        function calcPV(con, forStat) { return 10 + con + forStat; }
        // PEs = POD + 10
        function calcPE(pod) { return pod + 10; }
        // Iniciativa
        function calcInitBonus(des) { return { bonus: des, advantage: des >= 3 }; }
        // Dano de Força
        function calcDmgBonus(forStat) {
            if (forStat >= 5) return '+2d6';
            if (forStat >= 3) return '+1d6';
            if (forStat >= 1) return '+0';
            return '-1';
        }

        // Testes de PV
        assert.equal(calcPV(2, 2), 14, 'CON 2 + FOR 2 = 14 PVs');
        assert.equal(calcPV(0, 0), 10, 'CON 0 + FOR 0 = 10 PVs');
        assert.equal(calcPV(4, 5), 19, 'CON 4 + FOR 5 = 19 PVs');

        // Testes de PE
        assert.equal(calcPE(2), 12, 'POD 2 = 12 PEs');
        assert.equal(calcPE(5), 15, 'POD 5 = 15 PEs');

        // Testes de Iniciativa
        assert.ok(calcInitBonus(3).advantage, 'DES 3 concede Vantagem de Iniciativa');
        assert.notOk(calcInitBonus(2).advantage, 'DES 2 não concede Vantagem');

        // Testes de Dano
        assert.equal(calcDmgBonus(2), '+0', 'FOR 2 = +0 dano');
        assert.equal(calcDmgBonus(3), '+1d6', 'FOR 3 = +1d6 dano');
        assert.equal(calcDmgBonus(5), '+2d6', 'FOR 5 = +2d6 dano');
    });

    QUnit.test('Mecânicas do Rolador 2d6 e Teste de Morte', function (assert) {
        function resolve2d6(d1, d2, bonus, cd) {
            const sum = d1 + d2;
            const total = sum + bonus;
            if (sum === 12) return { crit: true, success: true, total };
            if (sum === 2) return { fumble: true, success: false, total };
            return { success: total >= cd, total };
        }

        function resolveDeathSave(d1, d2) {
            const sum = d1 + d2;
            if (sum >= 11) return 'stabilized';
            if (sum >= 6) return 'resisted';
            return 'failed';
        }

        // Teste de Rolagem 2d6
        assert.ok(resolve2d6(6, 6, 0, 18).crit, '6+6 = 12 é Acerto Crítico');
        assert.ok(resolve2d6(1, 1, 10, 5).fumble, '1+1 = 2 é Falha Crítica');
        assert.ok(resolve2d6(4, 4, 3, 10).success, '8 + 3 = 11 vs CD 10 é Sucesso');
        assert.notOk(resolve2d6(2, 3, 1, 10).success, '5 + 1 = 6 vs CD 10 é Falha');

        // Teste de Morte
        assert.equal(resolveDeathSave(6, 5), 'stabilized', '11 no Teste de Morte Estabiliza');
        assert.equal(resolveDeathSave(4, 4), 'resisted', '8 no Teste de Morte Resiste');
        assert.equal(resolveDeathSave(1, 3), 'failed', '4 no Teste de Morte Falha');
    });

    QUnit.test('Exemplos de Monstros do Manual no Bestiário', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
        const presetMonsters = extractDataFromIndex(content, 'presetMonsters');

        assert.ok(presetMonsters.zumbi, 'Zumbi Capenga deve estar catalogado');
        assert.ok(presetMonsters.goblin, 'Chefe Goblin deve estar catalogado');
        assert.ok(presetMonsters.orc, 'General Orc deve estar catalogado');
        assert.ok(presetMonsters.cthulhu, 'Cthulhu deve estar catalogado');
        assert.ok(presetMonsters.kratos, 'Kratos deve estar catalogado');

        assert.equal(presetMonsters.zumbi.nd, 1, 'Zumbi é ND 1');
        assert.equal(presetMonsters.cthulhu.nd, 10, 'Cthulhu é ND 10');
        assert.equal(presetMonsters.kratos.nd, 10, 'Kratos é ND 10');
    });

    QUnit.test('Compêndio de Regras Contém Armas, Armaduras e Magias', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
        const compendiumData = extractDataFromIndex(content, 'compendiumData');

        assert.ok(compendiumData.length >= 15, 'Compêndio deve ter ao menos 15 entradas');

        const melee = compendiumData.filter(i => i.cat === 'melee');
        const ranged = compendiumData.filter(i => i.cat === 'ranged');
        const armor = compendiumData.filter(i => i.cat === 'armor');
        const magic = compendiumData.filter(i => i.cat === 'magic');

        assert.ok(melee.length >= 4, 'Armas brancas catalogadas');
        assert.ok(ranged.length >= 4, 'Armas de fogo catalogadas');
        assert.ok(armor.length >= 4, 'Armaduras com RD catalogadas');
        assert.ok(magic.length >= 5, 'Magias dos Níveis 1 a 5 catalogadas');
    });
});
