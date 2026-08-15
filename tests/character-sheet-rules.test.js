/**
 * Testes Unitários para as Regras e Cálculos da Ficha de Personagem (+2d6 v2.3 Newton Rocha)
 */

const QUnit = require('qunit');
const path = require('path');

const { CharacterSheetRules, CharacterSheetController, FORCE_DAMAGE_TABLE } = require('../src/core/character-sheet.js');

QUnit.module('Ficha de Personagem — Regras +2d6 v2.3 (Newton Rocha)', function () {

    QUnit.test('1. Bônus de Atributos Sobre-Humanos e Divinos', function (assert) {
        // Nível Humano (1 a 5) -> Bônus 0
        assert.equal(CharacterSheetRules.calcSuperhumanBonus(1).bonus, 0, 'FOR 1 = Humano (+0)');
        assert.equal(CharacterSheetRules.calcSuperhumanBonus(3).bonus, 0, 'INT 3 = Humano (+0)');
        assert.equal(CharacterSheetRules.calcSuperhumanBonus(5).bonus, 0, 'DES 5 = Humano (+0)');
        assert.equal(CharacterSheetRules.calcSuperhumanBonus(5).tier, 'human', 'Tier é human');

        // Nível Sobre-Humano (6 a 10) -> Bônus +6
        assert.equal(CharacterSheetRules.calcSuperhumanBonus(6).bonus, 6, 'FOR 6 = Sobre-Humano (+6)');
        assert.equal(CharacterSheetRules.calcSuperhumanBonus(8).bonus, 6, 'POD 8 = Sobre-Humano (+6)');
        assert.equal(CharacterSheetRules.calcSuperhumanBonus(10).bonus, 6, 'CON 10 = Sobre-Humano (+6)');
        assert.equal(CharacterSheetRules.calcSuperhumanBonus(8).tier, 'superhuman', 'Tier é superhuman');

        // Nível Divino (> 10) -> Bônus +12
        assert.equal(CharacterSheetRules.calcSuperhumanBonus(11).bonus, 12, 'FOR 11 = Nível Divino (+12)');
        assert.equal(CharacterSheetRules.calcSuperhumanBonus(15).bonus, 12, 'INT 15 = Nível Divino (+12)');
        assert.equal(CharacterSheetRules.calcSuperhumanBonus(12).tier, 'divine', 'Tier é divine');
    });

    QUnit.test('2. Status Derivados: PV Máximo (Bônus CON >= 3)', function (assert) {
        // PV Máximo = 10 + CON + FOR + (se CON >= 3 ganha +5 PVs extras)
        assert.equal(CharacterSheetRules.calcMaxPV(2, 2), 14, 'CON 2 + FOR 2 = 14 PVs (Sem bônus extra de CON)');
        assert.equal(CharacterSheetRules.calcMaxPV(0, 0), 10, 'CON 0 + FOR 0 = 10 PVs');
        assert.equal(CharacterSheetRules.calcMaxPV(1, 3), 14, 'CON 1 + FOR 3 = 14 PVs');

        // Com CON >= 3 (+5 PVs extras)
        assert.equal(CharacterSheetRules.calcMaxPV(3, 2), 20, 'CON 3 + FOR 2 = 10 + 3 + 2 + 5 = 20 PVs');
        assert.equal(CharacterSheetRules.calcMaxPV(4, 4), 23, 'CON 4 + FOR 4 = 10 + 4 + 4 + 5 = 23 PVs');
        assert.equal(CharacterSheetRules.calcMaxPV(6, 6), 27, 'CON 6 + FOR 6 = 10 + 6 + 6 + 5 = 27 PVs');
    });

    QUnit.test('2. Status Derivados: PE Máximo', function (assert) {
        // PE Máximo = POD + 10
        assert.equal(CharacterSheetRules.calcMaxPE(0), 10, 'POD 0 = 10 PEs');
        assert.equal(CharacterSheetRules.calcMaxPE(2), 12, 'POD 2 = 12 PEs');
        assert.equal(CharacterSheetRules.calcMaxPE(5), 15, 'POD 5 = 15 PEs');
        assert.equal(CharacterSheetRules.calcMaxPE(8), 18, 'POD 8 = 18 PEs');
    });

    QUnit.test('2. Status Derivados: Tabela Oficial de Dano de Força', function (assert) {
        assert.equal(CharacterSheetRules.calcForceDamage(1), '1d6-4', 'FOR 1 = 1d6-4');
        assert.equal(CharacterSheetRules.calcForceDamage(2), '1d6-2', 'FOR 2 = 1d6-2');
        assert.equal(CharacterSheetRules.calcForceDamage(3), '1d6', 'FOR 3 = 1d6');
        assert.equal(CharacterSheetRules.calcForceDamage(4), '1d6+1', 'FOR 4 = 1d6+1');
        assert.equal(CharacterSheetRules.calcForceDamage(5), '1d6+2', 'FOR 5 = 1d6+2');
        assert.equal(CharacterSheetRules.calcForceDamage(6), '3d6', 'FOR 6 = 3d6');
        assert.equal(CharacterSheetRules.calcForceDamage(7), '4d6', 'FOR 7 = 4d6');
        assert.equal(CharacterSheetRules.calcForceDamage(8), '5d6', 'FOR 8 = 5d6');
        assert.equal(CharacterSheetRules.calcForceDamage(9), '6d6', 'FOR 9 = 6d6');
        assert.equal(CharacterSheetRules.calcForceDamage(10), '7d6', 'FOR 10 = 7d6');
        assert.equal(CharacterSheetRules.calcForceDamage(11), '8d6', 'FOR 11 = 8d6 (Escala contínua)');
    });

    QUnit.test('2. Status Derivados: Bônus de Iniciativa (DES >= 3 -> DES - 2)', function (assert) {
        assert.equal(CharacterSheetRules.calcInitiativeBonus(1), 0, 'DES 1 = +0 de Iniciativa');
        assert.equal(CharacterSheetRules.calcInitiativeBonus(2), 0, 'DES 2 = +0 de Iniciativa');
        assert.equal(CharacterSheetRules.calcInitiativeBonus(3), 1, 'DES 3 = +1 de Iniciativa (3 - 2)');
        assert.equal(CharacterSheetRules.calcInitiativeBonus(4), 2, 'DES 4 = +2 de Iniciativa (4 - 2)');
        assert.equal(CharacterSheetRules.calcInitiativeBonus(6), 4, 'DES 6 = +4 de Iniciativa (6 - 2)');
    });

    QUnit.test('3. Rolagem Direta a partir das Perícias (+2d6 com Bônus Sobre-Humano e Críticos)', function (assert) {
        // Teste Normal: Perícia +2, DES 2 (Humano), Mod 0 vs CD 10, Dados [4, 4] = 8
        // Total: 8 + 2 (perícia) + 2 (des) + 0 (mod) = 12 (Sucesso)
        const roll1 = CharacterSheetRules.rollSkillTest({
            skillName: 'Pontaria',
            skillBonus: 2,
            attrName: 'DES',
            attrValue: 2,
            cd: 10,
            diceOverride: [4, 4]
        });

        assert.equal(roll1.total, 12, 'Total da rolagem 12');
        assert.ok(roll1.isSuccess, 'Sucesso atingido');
        assert.equal(roll1.margin, 2, 'Margem de +2');

        // Teste Sobre-Humano: Perícia +3, FOR 6 (Sobre-Humano +6), Dados [3, 3] = 6 vs CD 14
        // Total: 6 (dados) + 3 (perícia) + 6 (FOR) + 6 (Sobre-Humano) = 21
        const roll2 = CharacterSheetRules.rollSkillTest({
            skillName: 'Luta Armada',
            skillBonus: 3,
            attrName: 'FOR',
            attrValue: 6,
            cd: 14,
            vsHuman: true,
            diceOverride: [3, 3]
        });

        assert.equal(roll2.superhumanBonus, 6, 'Bônus Sobre-Humano +6 aplicado');
        assert.equal(roll2.total, 21, 'Total com bônus sobre-humano = 21');
        assert.ok(roll2.isSuccess, 'Sucesso com folga');

        // Acerto Crítico (12 nos dados)
        const rollCrit = CharacterSheetRules.rollSkillTest({
            skillName: 'Esquiva',
            skillBonus: 1,
            attrName: 'DES',
            attrValue: 2,
            cd: 18,
            diceOverride: [6, 6]
        });
        assert.ok(rollCrit.isCrit, '12 nos dados é Acerto Crítico');
        assert.ok(rollCrit.isSuccess, 'Crítico é sempre sucesso');

        // Falha Crítica (2 nos dados)
        const rollFumble = CharacterSheetRules.rollSkillTest({
            skillName: 'Medicina',
            skillBonus: 5,
            attrName: 'INT',
            attrValue: 5,
            cd: 8,
            diceOverride: [1, 1]
        });
        assert.ok(rollFumble.isFumble, '2 nos dados é Falha Crítica');
        assert.notOk(rollFumble.isSuccess, 'Falha crítica não tem sucesso');
    });

    QUnit.test('Controlador de Ficha: Gestão de Perícias e Callback de Rolagem', function (assert) {
        let lastRoll = null;
        const controller = new CharacterSheetController({
            onRollCallback: (res) => { lastRoll = res; }
        });

        controller.data.attributes.FOR = 4;
        controller.data.attributes.CON = 3;
        controller.data.attributes.DES = 5;

        // Validar recálculo dos dados internos
        assert.equal(CharacterSheetRules.calcMaxPV(controller.data.attributes.CON, controller.data.attributes.FOR), 22, 'PV recalculado');
        assert.equal(CharacterSheetRules.calcInitiativeBonus(controller.data.attributes.DES), 3, 'Iniciativa recalculada');

        // Executar rolagem direta
        controller.rollSkillDirectly('Luta Armada');
        assert.ok(lastRoll, 'Callback de rolagem invocado');
        assert.equal(lastRoll.skillName, 'Luta Armada', 'Nome da perícia correto');
        assert.ok(lastRoll.total > 0, 'Total calculado');
    });

    QUnit.test('Integração: legado/Forms/formV6.html deve conter regras e botões de rolagem de perícias', function (assert) {
        const fs = require('fs');
        const formHtmlPath = path.resolve(__dirname, '../legado/Forms/formV6.html');
        assert.ok(fs.existsSync(formHtmlPath), 'formV6.html deve existir');

        const htmlContent = fs.readFileSync(formHtmlPath, 'utf-8');
        assert.ok(htmlContent.includes('src="../../src/core/character-sheet.js"'), 'Deve importar character-sheet.js');
        assert.ok(htmlContent.includes('id="danoForcaDisplay"'), 'Deve conter campo de Dano de Força');
        assert.ok(htmlContent.includes('id="iniciativaDisplay"'), 'Deve conter campo de Bônus de Iniciativa');
        assert.ok(htmlContent.includes('rollSkillFromSheet'), 'Deve implementar função rollSkillFromSheet para botões de rolagem');
    });
});
