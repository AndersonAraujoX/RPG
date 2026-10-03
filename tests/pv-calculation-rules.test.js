/**
 * Suíte de Testes Unitários para o Cálculo de PV Máximo (+2d6)
 * Diretriz: Arrange-Act-Assert (AAA)
 * Regra Oficial: PV = (Constituição x 2) + 10
 */

const QUnit = require('qunit');
const { CharacterSheetRules, CharacterSheetController } = require('../src/core/character-sheet.js');

QUnit.module('Cálculo de PV Máximo ((Constituição x 2) + 10)', function () {

    // =========================================================================
    // 1. CAMINHO FELIZ (FLUXO PRINCIPAL)
    // =========================================================================
    QUnit.test('1. Caminho Feliz: Valores inteiros de Constituição', function (assert) {
        // Arrange
        const testCases = [
            { con: 0, expected: 10, desc: 'CON 0: (0 x 2) + 10 = 10' },
            { con: 1, expected: 12, desc: 'CON 1: (1 x 2) + 10 = 12' },
            { con: 2, expected: 14, desc: 'CON 2: (2 x 2) + 10 = 14 (Padrão inicial)' },
            { con: 3, expected: 16, desc: 'CON 3: (3 x 2) + 10 = 16' },
            { con: 4, expected: 18, desc: 'CON 4: (4 x 2) + 10 = 18' },
            { con: 5, expected: 20, desc: 'CON 5: (5 x 2) + 10 = 20' },
            { con: 6, expected: 22, desc: 'CON 6: (6 x 2) + 10 = 22 (Sobre-Humano)' },
            { con: 8, expected: 26, desc: 'CON 8: (8 x 2) + 10 = 26' },
            { con: 10, expected: 30, desc: 'CON 10: (10 x 2) + 10 = 30 (Nível Máximo Sobre-Humano)' }
        ];

        // Act & Assert
        testCases.forEach(tc => {
            const actual = CharacterSheetRules.calcMaxPV(tc.con);
            assert.equal(actual, tc.expected, tc.desc);
        });
    });

    QUnit.test('1. Caminho Feliz: Passagem de Objeto de Atributos', function (assert) {
        // Arrange
        const charUpper = { CON: 4, FOR: 3, DES: 2 };
        const charLower = { con: 3, for: 5 };

        // Act
        const pvUpper = CharacterSheetRules.calcMaxPV(charUpper);
        const pvLower = CharacterSheetRules.calcMaxPV(charLower);

        // Assert
        assert.equal(pvUpper, 18, 'Objeto com chave maiúscula { CON: 4 } = (4 x 2) + 10 = 18');
        assert.equal(pvLower, 16, 'Objeto com chave minúscula { con: 3 } = (3 x 2) + 10 = 16');
    });

    QUnit.test('1. Caminho Feliz: Suporte a Bônus e Vantagens em PV', function (assert) {
        // Arrange
        const con = 3;
        const bonusPV = 5;

        // Act
        const actual = CharacterSheetRules.calcMaxPV(con, bonusPV);
        const objWithBonus = CharacterSheetRules.calcMaxPV({ CON: 3, bonusPV: 5 });

        // Assert
        assert.equal(actual, 21, 'CON 3 com bônus de 5: (3 x 2) + 10 + 5 = 21 PVs');
        assert.equal(objWithBonus, 21, 'Objeto { CON: 3, bonusPV: 5 } = 21 PVs');
    });

    // =========================================================================
    // 2. CASOS DE BORDA (EDGE CASES)
    // =========================================================================
    QUnit.test('2. Casos de Borda: Entradas Nulas, Undefined, Heterogêneas e NaN', function (assert) {
        // Arrange & Act & Assert
        assert.equal(CharacterSheetRules.calcMaxPV(null), 10, 'null deve resultar na base 10');
        assert.equal(CharacterSheetRules.calcMaxPV(undefined), 10, 'undefined deve resultar na base 10');
        assert.equal(CharacterSheetRules.calcMaxPV(NaN), 10, 'NaN deve resultar na base 10');
        assert.equal(CharacterSheetRules.calcMaxPV('texto'), 10, 'String não numérica deve ser tratada como 0');

        // Strings numéricas válidas
        assert.equal(CharacterSheetRules.calcMaxPV('3'), 16, 'String numérica "3" deve calcular 16');
        assert.equal(CharacterSheetRules.calcMaxPV('  5  '), 20, 'String com whitespace "  5  " deve calcular 20');

        // Objeto vazio ou com valor nulo
        assert.equal(CharacterSheetRules.calcMaxPV({}), 10, 'Objeto vazio {} resulta em 10');
        assert.equal(CharacterSheetRules.calcMaxPV({ CON: null }), 10, 'Objeto com CON: null resulta em 10');
    });

    QUnit.test('2. Casos de Borda: Valores negativos e extremos', function (assert) {
        // Arrange & Act & Assert
        assert.equal(CharacterSheetRules.calcMaxPV(-1), 8, 'CON negativa (-1 x 2) + 10 = 8');
        assert.equal(CharacterSheetRules.calcMaxPV(-5), 0, 'CON negativa (-5 x 2) + 10 = 0');
        assert.equal(CharacterSheetRules.calcMaxPV(12), 34, 'CON nível divino 12 = (12 x 2) + 10 = 34');
    });

    // =========================================================================
    // 3. INTEGRAÇÃO COM CONTROLLER E REATIVIDADE DOM (AAA COM MOCKS)
    // =========================================================================
    QUnit.test('3. Integração: CharacterSheetController recalcula PV dinamicamente', function (assert) {
        // Arrange - Mock do DOM
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

            const controller = new CharacterSheetController();
            controller.data.attributes.CON = 2; // Padrão

            // Act 1 - Recalcular inicial com CON = 2
            controller.recalculateAllStats();

            // Assert 1
            assert.equal(domElements['display-pv-max'].innerText, 14, 'PV inicial no display com CON 2: (2 x 2) + 10 = 14');
            assert.equal(domElements['pontosVida'].value, 14, 'PV inicial no input pontosVida com CON 2: 14');

            // Act 2 - Alterar CON para 4 via handleAttributeChange
            controller.handleAttributeChange('CON', 4);

            // Assert 2
            assert.equal(domElements['display-pv-max'].innerText, 18, 'PV atualizado no display com CON 4: (4 x 2) + 10 = 18');
            assert.equal(domElements['pontosVida'].value, 18, 'PV atualizado no input com CON 4: 18');

            // Act 3 - Alterar CON para 1
            controller.handleAttributeChange('CON', 1);

            // Assert 3
            assert.equal(domElements['display-pv-max'].innerText, 12, 'PV atualizado no display com CON 1: (1 x 2) + 10 = 12');
            assert.equal(domElements['pontosVida'].value, 12, 'PV atualizado no input com CON 1: 12');
        } finally {
            global.document = origDoc;
        }
    });
});
