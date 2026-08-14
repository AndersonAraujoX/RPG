/**
 * Testes unitários para o Sistema de Magia Daemon (+2d6) na Biblioteca Arcana
 * Valida os 12 Caminhos, 3 Formas, Matriz de Fusão e Regras de Teste (+2d6).
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

QUnit.module('Sistema Daemon +2d6 — 12 Caminhos e Fusão Arcana', function () {

    QUnit.test('Estrutura dos 12 Caminhos de Magia', function (assert) {
        const content = fs.readFileSync(PUBLIC_TREE_PATH, 'utf-8');
        const magicPaths = extractObjectFromHtml(content, 'magicPaths');

        const pathKeys = Object.keys(magicPaths);
        assert.equal(pathKeys.length, 12, 'Devem existir exatamente 12 Caminhos de Magia');

        // Validar categorias
        const elementais = pathKeys.filter(k => magicPaths[k].category === 'elemental');
        const vitais = pathKeys.filter(k => magicPaths[k].category === 'vital');
        const arcanos = pathKeys.filter(k => magicPaths[k].category === 'arcano');

        assert.equal(elementais.length, 6, 'Devem existir 6 Caminhos Elementais (Fogo, Água, Ar, Terra, Luz, Trevas)');
        assert.equal(vitais.length, 3, 'Devem existir 3 Caminhos Vitais (Animais, Humanos, Plantas)');
        assert.equal(arcanos.length, 3, 'Devem existir 3 Caminhos Arcanos (Spiritum, Arkanum, Metamagia)');

        // Validar presença de nomes e ícones
        pathKeys.forEach(k => {
            assert.ok(magicPaths[k].name.startsWith('Magia ('), `${k} deve ter nome no formato Magia (...)`);
            assert.ok(magicPaths[k].icon.startsWith('fa-'), `${k} deve possuir ícone FontAwesome`);
            assert.ok(magicPaths[k].color.startsWith('#'), `${k} deve possuir cor hexadecimal`);
        });
    });

    QUnit.test('Estrutura das 3 Formas de Ação (Criar, Controlar, Entender)', function (assert) {
        const content = fs.readFileSync(PUBLIC_TREE_PATH, 'utf-8');
        const magicForms = extractObjectFromHtml(content, 'magicForms');

        assert.ok(magicForms['Criar'], 'Deve existir a Forma Criar');
        assert.ok(magicForms['Controlar'], 'Deve existir a Forma Controlar');
        assert.ok(magicForms['Entender'], 'Deve existir a Forma Entender');

        assert.equal(magicForms['Criar'].cdBase, 10, 'Criar deve ter CD Base 10');
        assert.equal(magicForms['Controlar'].cdBase, 8, 'Controlar deve ter CD Base 8');
        assert.equal(magicForms['Entender'].cdBase, 6, 'Entender deve ter CD Base 6');

        assert.equal(magicForms['Criar'].peCost, 3, 'Criar deve custar 3 PEs');
        assert.equal(magicForms['Controlar'].peCost, 2, 'Controlar deve custar 2 PEs');
        assert.equal(magicForms['Entender'].peCost, 1, 'Entender deve custar 1 PE');
    });

    QUnit.test('Matriz de Fusão e Síntese Arcana', function (assert) {
        const content = fs.readFileSync(PUBLIC_TREE_PATH, 'utf-8');
        const spellFusions = extractObjectFromHtml(content, 'spellFusions');

        const fusionKeys = Object.keys(spellFusions);
        assert.ok(fusionKeys.length >= 10, `Devem existir ao menos 10 fusões pré-cadastradas (encontradas: ${fusionKeys.length})`);

        // Testar fusões clássicas
        assert.ok(spellFusions['fogo+ar'], 'Fusão Fogo+Ar (Plasma) deve existir');
        assert.ok(spellFusions['fogo+terra'], 'Fusão Fogo+Terra (Magma) deve existir');
        assert.ok(spellFusions['agua+ar'], 'Fusão Água+Ar (Gelo) deve existir');
        assert.ok(spellFusions['humanos+spiritum'], 'Fusão Humanos+Spiritum deve existir');
        assert.ok(spellFusions['terra+metamagia'], 'Fusão Terra+Metamagia deve existir');

        // Testar que cada fusão suporta as 3 formas
        fusionKeys.forEach(k => {
            const f = spellFusions[k];
            assert.ok(f.Criar && f.Criar.spell && f.Criar.cd, `${k} deve ter dados válidos para Criar`);
            assert.ok(f.Controlar && f.Controlar.spell && f.Controlar.cd, `${k} deve ter dados válidos para Controlar`);
            assert.ok(f.Entender && f.Entender.spell && f.Entender.cd, `${k} deve ter dados válidos para Entender`);
        });
    });

    QUnit.test('Simulação de Rolagem de Teste (+2d6)', function (assert) {
        // Função de resolução de teste +2d6
        function resolveSpellTest(d1, d2, bonus, cd) {
            const diceTotal = d1 + d2;
            const total = diceTotal + bonus;

            if (diceTotal === 12) return { success: true, critical: true, total };
            if (diceTotal === 2) return { success: false, fumble: true, total };
            return { success: total >= cd, critical: false, fumble: false, total };
        }

        // Teste Acerto Crítico (12 nos dados)
        const crit = resolveSpellTest(6, 6, 0, 15);
        assert.ok(crit.critical, '12 nos dados é Acerto Crítico automático');
        assert.ok(crit.success, 'Acerto Crítico é sempre sucesso');

        // Teste Falha Crítica (2 nos dados)
        const fumble = resolveSpellTest(1, 1, 5, 6);
        assert.ok(fumble.fumble, '2 nos dados é Falha Crítica automática');
        assert.notOk(fumble.success, 'Falha Crítica é sempre falha');

        // Teste Normal com Sucesso (2d6 + Perícia >= CD)
        const normalSuccess = resolveSpellTest(4, 4, 3, 10); // 8 + 3 = 11 vs CD 10
        assert.ok(normalSuccess.success, '11 vs CD 10 é sucesso normal');

        // Teste Normal com Falha
        const normalFail = resolveSpellTest(2, 3, 2, 10); // 5 + 2 = 7 vs CD 10
        assert.notOk(normalFail.success, '7 vs CD 10 é falha');
    });

    QUnit.test('Conformidade de Design e Ausência de CDNs Bloqueados', function (assert) {
        const legadoContent = fs.readFileSync(LEGADO_TREE_PATH, 'utf-8');
        const publicContent = fs.readFileSync(PUBLIC_TREE_PATH, 'utf-8');

        assert.notOk(legadoContent.includes('cdn.tailwindcss.com'), 'legado não deve usar cdn.tailwindcss.com');
        assert.notOk(publicContent.includes('cdn.tailwindcss.com'), 'public não deve usar cdn.tailwindcss.com');
        assert.ok(publicContent.includes('id="fusion-altar"'), 'public deve conter o elemento do Altar de Fusão');
        assert.ok(publicContent.includes('id="forma-criar"'), 'public deve conter seletor de forma Criar');
    });
});
