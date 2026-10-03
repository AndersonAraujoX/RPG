/**
 * Suíte de Testes Unitários para Bônus e Vantagens em PV e PE (+2d6)
 * Diretriz: Arrange-Act-Assert (AAA)
 * Regra:
 *   PV = (Constituição x 2) + 10 + Bônus de PV
 *   PE = Atributo de Conjuração + Constituição + 10 + Bônus de PE
 */

const QUnit = require('qunit');
const { CharacterSheetRules, CharacterSheetController } = require('../src/core/character-sheet.js');

QUnit.module('Bônus e Vantagens em PV e PE (Recursos de Combate)', function () {

    // =========================================================================
    // 1. CAMINHO FELIZ (FLUXO PRINCIPAL)
    // =========================================================================
    QUnit.test('1. Caminho Feliz: Cálculo de PV com Bônus Diretos', function (assert) {
        // Arrange
        const cases = [
            { con: 2, bonus: 0, expected: 14, desc: 'CON 2 sem bônus: (2 x 2) + 10 = 14' },
            { con: 2, bonus: 5, expected: 19, desc: 'CON 2 com +5 PV (Vitalidade): 14 + 5 = 19' },
            { con: 4, bonus: 10, expected: 28, desc: 'CON 4 com +10 PV (Item Lendário): 18 + 10 = 28' },
            { con: 0, bonus: 3, expected: 13, desc: 'CON 0 com +3 PV: 10 + 3 = 13' }
        ];

        // Act & Assert
        cases.forEach(c => {
            const actual = CharacterSheetRules.calcMaxPV(c.con, c.bonus);
            assert.equal(actual, c.expected, c.desc);
        });
    });

    QUnit.test('1. Caminho Feliz: Cálculo de PE com Bônus Diretos', function (assert) {
        // Arrange
        const cases = [
            { conjur: 3, con: 2, bonus: 0, expected: 15, desc: 'Sem bônus: 3 + 2 + 10 = 15' },
            { conjur: 4, con: 2, bonus: 5, expected: 21, desc: 'Com +5 PE: 4 + 2 + 10 + 5 = 21' },
            { conjur: 5, con: 3, bonus: 10, expected: 28, desc: 'Com +10 PE: 5 + 3 + 10 + 10 = 28' }
        ];

        // Act & Assert
        cases.forEach(c => {
            const actual = CharacterSheetRules.calcMaxPE(c.conjur, c.con, c.bonus);
            assert.equal(actual, c.expected, c.desc);
        });
    });

    QUnit.test('1. Caminho Feliz: Extração Automática de Bônus de Vantagens (calcResourceBonusFromAdvantages)', function (assert) {
        // Arrange - Vantagens como Objetos estruturados
        const advantagesObjs = [
            { name: 'Robustez Extraordinária', bonusPV: 5 },
            { name: 'Canalizador Superior', bonusPE: 6 },
            { name: 'Vitalidade do Titã', bonus_pv: 10 },
            { name: 'Reserva Arcana', bonus_pe: 4 }
        ];

        // Act
        const totalBonusPV = CharacterSheetRules.calcResourceBonusFromAdvantages(advantagesObjs, 'PV');
        const totalBonusPE = CharacterSheetRules.calcResourceBonusFromAdvantages(advantagesObjs, 'PE');

        // Assert
        assert.equal(totalBonusPV, 15, 'Total de bônus PV de objetos (5 + 10 = 15)');
        assert.equal(totalBonusPE, 10, 'Total de bônus PE de objetos (6 + 4 = 10)');

        // Arrange - Vantagens como Strings com notação "+X PV" / "+X PE"
        const advantagesStrings = [
            'Vitalidade (+5 PV)',
            'Vontade Inabalável (+8 PE)',
            'Pele de Pedra (+10 PV)',
            'Foco Extremo (+2 PE)'
        ];

        // Act
        const stringBonusPV = CharacterSheetRules.calcResourceBonusFromAdvantages(advantagesStrings, 'PV');
        const stringBonusPE = CharacterSheetRules.calcResourceBonusFromAdvantages(advantagesStrings, 'PE');

        // Assert
        assert.equal(stringBonusPV, 15, 'Total de bônus PV extraído de strings (5 + 10 = 15)');
        assert.equal(stringBonusPE, 10, 'Total de bônus PE extraído de strings (8 + 2 = 10)');
    });

    // =========================================================================
    // 2. CASOS DE BORDA (EDGE CASES)
    // =========================================================================
    QUnit.test('2. Casos de Borda: Bônus Nulos, Undefined, Strings Numéricas e Negativos', function (assert) {
        // Arrange & Act & Assert
        assert.equal(CharacterSheetRules.calcMaxPV(2, null), 14, 'Bônus null não altera a base');
        assert.equal(CharacterSheetRules.calcMaxPV(2, undefined), 14, 'Bônus undefined não altera a base');
        assert.equal(CharacterSheetRules.calcMaxPV(2, '5'), 19, 'String numérica "5" deve somar 5');
        assert.equal(CharacterSheetRules.calcMaxPV(2, '  8  '), 22, 'String com whitespace "  8  " deve somar 8');
        assert.equal(CharacterSheetRules.calcMaxPV(2, -2), 12, 'Penalidade de PV (-2) deve subtrair da base');

        assert.equal(CharacterSheetRules.calcMaxPE(3, 2, null), 15, 'Bônus PE null não altera a base');
        assert.equal(CharacterSheetRules.calcMaxPE(3, 2, '6'), 21, 'Bônus PE string "6" deve somar 6');
        assert.equal(CharacterSheetRules.calcMaxPE(3, 2, -3), 12, 'Penalidade de PE (-3) deve subtrair da base');

        // Lista de vantagens nula ou vazia
        assert.equal(CharacterSheetRules.calcResourceBonusFromAdvantages(null, 'PV'), 0, 'Lista null retorna 0');
        assert.equal(CharacterSheetRules.calcResourceBonusFromAdvantages([], 'PE'), 0, 'Lista vazia retorna 0');
        assert.equal(CharacterSheetRules.calcResourceBonusFromAdvantages(['Vantagem Sem Bônus'], 'PV'), 0, 'Vantagem neutra retorna 0');
    });

    // =========================================================================
    // 3. INTEGRAÇÃO COM DOM E CONTROLLER (AAA COM MOCKS)
    // =========================================================================
    QUnit.test('3. Integração: CharacterSheetController sincroniza bônus manuais e vantagens', function (assert) {
        // Arrange - Mock dos elementos HTML
        const domElements = {};
        const createMockElement = (id, initialValue = '', tagName = 'DIV') => {
            const el = {
                id,
                tagName,
                value: initialValue,
                innerText: initialValue,
                listeners: {},
                addEventListener(event, fn) { this.listeners[event] = fn; },
                trigger(event) { if (this.listeners[event]) this.listeners[event]({ target: el }); }
            };
            domElements[id] = el;
            return el;
        };

        const origDoc = global.document;
        global.document = {
            getElementById: (id) => domElements[id] || null,
            querySelector: (sel) => {
                const id = sel.replace('#', '');
                return domElements[id] || null;
            }
        };

        try {
            createMockElement('display-pv-max');
            createMockElement('pontosVida', '', 'INPUT');
            createMockElement('bonusPV', '0', 'INPUT');

            createMockElement('display-pe-max');
            createMockElement('pontosEnergia', '', 'INPUT');
            createMockElement('bonusPE', '0', 'INPUT');
            createMockElement('tradicaoMagica', 'INT');

            const controller = new CharacterSheetController();
            controller.data.attributes.CON = 2; // Base PV: (2 * 2) + 10 = 14
            controller.data.attributes.INT = 3; // Base PE: 3 + 2 + 10 = 15
            controller.data.tradicaoMagica = 'INT';

            // Act 1 - Inicial sem bônus
            controller.recalculateAllStats();

            // Assert 1
            assert.equal(domElements['pontosVida'].value, 14, 'PV inicial base é 14');
            assert.equal(domElements['pontosEnergia'].value, 15, 'PE inicial base é 15');

            // Act 2 - Usuário digita bônus manual no formulário (+5 PV e +4 PE)
            domElements['bonusPV'].value = '5';
            domElements['bonusPE'].value = '4';
            controller.recalculateAllStats();

            // Assert 2
            assert.equal(domElements['pontosVida'].value, 19, 'PV recalculado com bônus manual 5: 14 + 5 = 19');
            assert.equal(domElements['pontosEnergia'].value, 19, 'PE recalculado com bônus manual 4: 15 + 4 = 19');

            // Act 3 - Adiciona vantagem que concede "+5 PV"
            controller.data.advantages.push('Vitalidade (+5 PV)');
            controller.recalculateAllStats();

            // Assert 3 - Deve somar bônus manual (5) + vantagem (5) = +10
            assert.equal(domElements['pontosVida'].value, 24, 'PV com bônus manual (5) + vantagem (5) = 14 + 10 = 24');
        } finally {
            global.document = origDoc;
        }
    });
});
