/**
 * Testes Unitários para a Gestão de Turnos, Iniciativa Automática (+2d6) e Redução de Condições
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const { CharacterSheetRules } = require('../src/core/character-sheet.js');
const INDEX_HTML_PATH = path.resolve(__dirname, '../index.html');

QUnit.module('Módulo de Gestão de Turnos & Iniciativa (+2d6)', function () {

    QUnit.test('1. Rolagem Oficial de Iniciativa: 2d6 + DES + Bônus (DES >= 3 -> DES - 2)', function (assert) {
        // DES 2 -> Bônus 0 -> Dados [3, 4] = 7 -> Total = 7 + 2 + 0 = 9
        const init1 = CharacterSheetRules.calcCombatInitiative(2, [3, 4]);
        assert.equal(init1.des, 2, 'DES 2');
        assert.equal(init1.initBonus, 0, 'Bônus de Iniciativa = 0');
        assert.equal(init1.total, 9, 'Total = 7 + 2 + 0 = 9');

        // DES 3 -> Bônus 1 -> Dados [4, 4] = 8 -> Total = 8 + 3 + 1 = 12
        const init2 = CharacterSheetRules.calcCombatInitiative(3, [4, 4]);
        assert.equal(init2.initBonus, 1, 'DES 3 ganha +1 de bônus');
        assert.equal(init2.total, 12, 'Total = 8 + 3 + 1 = 12');

        // DES 4 -> Bônus 2 -> Dados [5, 6] = 11 -> Total = 11 + 4 + 2 = 17
        const init3 = CharacterSheetRules.calcCombatInitiative(4, [5, 6]);
        assert.equal(init3.initBonus, 2, 'DES 4 ganha +2 de bônus');
        assert.equal(init3.total, 17, 'Total = 11 + 4 + 2 = 17');

        // DES 6 -> Bônus 4 -> Dados [2, 3] = 5 -> Total = 5 + 6 + 4 = 15
        const init4 = CharacterSheetRules.calcCombatInitiative(6, [2, 3]);
        assert.equal(init4.initBonus, 4, 'DES 6 ganha +4 de bônus');
        assert.equal(init4.total, 15, 'Total = 5 + 6 + 4 = 15');
    });

    QUnit.test('2. Ordenação Decrescente da Lista de Combatentes', function (assert) {
        const combatants = [
            { id: '1', name: 'Zumbi', des: 1, init: 7 },
            { id: '2', name: 'Guerreiro', des: 3, init: 16 },
            { id: '3', name: 'Ladino', des: 4, init: 19 },
            { id: '4', name: 'Cultista', des: 2, init: 11 }
        ];

        combatants.sort((a, b) => b.init - a.init);

        assert.equal(combatants[0].name, 'Ladino', '1º lugar: Ladino (Init 19)');
        assert.equal(combatants[1].name, 'Guerreiro', '2º lugar: Guerreiro (Init 16)');
        assert.equal(combatants[2].name, 'Cultista', '3º lugar: Cultista (Init 11)');
        assert.equal(combatants[3].name, 'Zumbi', '4º lugar: Zumbi (Init 7)');
    });

    QUnit.test('3. Redução Automática de Condições no Início do Turno', function (assert) {
        const conditions = [
            { id: 'c1', name: 'Pasmar', duration: 2 },
            { id: 'c2', name: 'Em Chamas', duration: 1 }
        ];

        // 1ª Redução (Turno 1)
        const turn1 = CharacterSheetRules.processTurnConditions(conditions);
        assert.equal(turn1.conditions.length, 1, 'Resta 1 condição ativa');
        assert.equal(turn1.conditions[0].name, 'Pasmar', 'Pasmar continua ativa');
        assert.equal(turn1.conditions[0].duration, 1, 'Duração de Pasmar reduziu de 2 para 1 rodada');
        assert.equal(turn1.expired.length, 1, '1 condição expirou');
        assert.equal(turn1.expired[0].name, 'Em Chamas', 'Em Chamas expirou');

        // 2ª Redução (Turno 2)
        const turn2 = CharacterSheetRules.processTurnConditions(turn1.conditions);
        assert.equal(turn2.conditions.length, 0, 'Nenhuma condição ativa restante');
        assert.equal(turn2.expired.length, 1, 'Pasmar expirou');
        assert.equal(turn2.expired[0].name, 'Pasmar', 'Pasmar agora expirou');
    });

    QUnit.test('4. Estrutura e Funções de Combate na Mesa Virtual e CombatEngine', function (assert) {
        const MESA_PATH = path.resolve(__dirname, '../public/mesa_virtual.html');
        assert.ok(fs.existsSync(MESA_PATH), 'mesa_virtual.html deve existir');
        const content = fs.readFileSync(MESA_PATH, 'utf-8');

        assert.ok(content.includes('pane-turn') || content.includes('round-counter'), 'Elemento de rodadas/turnos presente');
        assert.ok(content.includes('modifyTokenStat') || content.includes('advanceTurn'), 'Funções de combate presentes no VTT');
        assert.ok(content.includes('CONDITIONS') || content.includes('condition'), 'Estrutura de condições presente');
    });
});
