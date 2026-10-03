/**
 * Suíte de Testes Unitários para o Cálculo de PE Máximo (+2d6)
 * Diretriz: Arrange-Act-Assert (AAA)
 * Regra Oficial: PE = Atributo de Conjuração + CONSTITUIÇÃO + 10
 */

const QUnit = require('qunit');
const { CharacterSheetRules, CharacterSheetController } = require('../src/core/character-sheet.js');

QUnit.module('Cálculo de PE Máximo (Atributo de Conjuração + CONSTITUIÇÃO + 10)', function () {

    // =========================================================================
    // 1. CAMINHO FELIZ (FLUXO PRINCIPAL)
    // =========================================================================
    QUnit.test('1. Caminho Feliz: Parâmetros diretos (conjurAttr, con)', function (assert) {
        // Arrange
        const cases = [
            { conjur: 2, con: 2, expected: 14, desc: 'Base padrão: Conjur 2 + CON 2 + 10 = 14' },
            { conjur: 4, con: 3, expected: 17, desc: 'Mago Arcana: INT 4 + CON 3 + 10 = 17' },
            { conjur: 3, con: 2, expected: 15, desc: 'Clérigo Divino: SAB 3 + CON 2 + 10 = 15' },
            { conjur: 5, con: 4, expected: 19, desc: 'Feiticeiro Inato: POD 5 + CON 4 + 10 = 19' },
            { conjur: 0, con: 0, expected: 10, desc: 'Sem atributos: Conjur 0 + CON 0 + 10 = 10' }
        ];

        // Act & Assert
        cases.forEach(testCase => {
            const actual = CharacterSheetRules.calcMaxPE(testCase.conjur, testCase.con);
            assert.equal(actual, testCase.expected, testCase.desc);
        });
    });

    QUnit.test('1. Caminho Feliz: Resolução de Tradições Mágicas Oficiais', function (assert) {
        // Arrange
        const attrs = {
            FOR: 2,
            DES: 2,
            CON: 3,
            INT: 5,
            SAB: 4,
            CAR: 2,
            POD: 1
        };

        // Act & Assert - Tradição Arcana (usa INT)
        const peArcana = CharacterSheetRules.calcMaxPE(attrs, 'INT');
        assert.equal(peArcana, 5 + 3 + 10, 'Arcana por chave (INT): 5 + 3 + 10 = 18');

        const peArcanaNome = CharacterSheetRules.calcMaxPE(attrs, 'Arcana');
        assert.equal(peArcanaNome, 5 + 3 + 10, 'Arcana por nome (Arcana): 5 + 3 + 10 = 18');

        // Act & Assert - Tradição Divina / Primal (usa SAB)
        const peDivina = CharacterSheetRules.calcMaxPE(attrs, 'SAB');
        assert.equal(peDivina, 4 + 3 + 10, 'Divina por chave (SAB): 4 + 3 + 10 = 17');

        const peDivinaNome = CharacterSheetRules.calcMaxPE(attrs, 'Divina');
        assert.equal(peDivinaNome, 4 + 3 + 10, 'Divina por nome (Divina): 4 + 3 + 10 = 17');

        const pePrimalNome = CharacterSheetRules.calcMaxPE(attrs, 'Primal');
        assert.equal(pePrimalNome, 4 + 3 + 10, 'Primal por nome (Primal): 4 + 3 + 10 = 17');

        // Act & Assert - Tradição Inata (usa POD)
        const peInata = CharacterSheetRules.calcMaxPE(attrs, 'POD');
        assert.equal(peInata, 1 + 3 + 10, 'Inata por chave (POD): 1 + 3 + 10 = 14');

        const peInataNome = CharacterSheetRules.calcMaxPE(attrs, 'Inata');
        assert.equal(peInataNome, 1 + 3 + 10, 'Inata por nome (Inata): 1 + 3 + 10 = 14');
    });

    QUnit.test('1. Caminho Feliz: getConjurationAttributeName mapeia corretamente', function (assert) {
        // Arrange & Act & Assert
        assert.equal(CharacterSheetRules.getConjurationAttributeName('INT'), 'INT');
        assert.equal(CharacterSheetRules.getConjurationAttributeName('arcana'), 'INT');
        assert.equal(CharacterSheetRules.getConjurationAttributeName('ARCANA'), 'INT');

        assert.equal(CharacterSheetRules.getConjurationAttributeName('SAB'), 'SAB');
        assert.equal(CharacterSheetRules.getConjurationAttributeName('divina'), 'SAB');
        assert.equal(CharacterSheetRules.getConjurationAttributeName('primal'), 'SAB');

        assert.equal(CharacterSheetRules.getConjurationAttributeName('POD'), 'POD');
        assert.equal(CharacterSheetRules.getConjurationAttributeName('inata'), 'POD');
    });

    // =========================================================================
    // 2. CASOS DE BORDA (EDGE CASES)
    // =========================================================================
    QUnit.test('2. Casos de Borda: Entradas Nulas, Undefined e Tipos Heterogêneos', function (assert) {
        // Arrange & Act & Assert
        assert.equal(CharacterSheetRules.calcMaxPE(null, null), 10, 'null, null deve resultar na base 10');
        assert.equal(CharacterSheetRules.calcMaxPE(undefined, undefined), 10, 'undefined, undefined deve resultar na base 10');
        assert.equal(CharacterSheetRules.calcMaxPE(NaN, NaN), 10, 'NaN, NaN deve ser tratado e resultar na base 10');
        assert.equal(CharacterSheetRules.calcMaxPE('invalid', 'abc'), 10, 'Strings não numéricas devem ser tratadas como 0');

        // Strings numéricas válidas e com espaços
        assert.equal(CharacterSheetRules.calcMaxPE('3', '2'), 15, 'Strings numéricas "3" e "2" devem somar corretamente');
        assert.equal(CharacterSheetRules.calcMaxPE('  4  ', '  1  '), 15, 'Strings numéricas com whitespace devem somar');

        // Fallback quando apenas um argumento for passado
        assert.equal(CharacterSheetRules.calcMaxPE(3), 13, 'Apenas 1 argumento numérico: conjur 3 + con 0 + 10 = 13');
    });

    QUnit.test('2. Casos de Borda: Objeto de atributos incompleto ou vazio', function (assert) {
        // Arrange
        const emptyAttrs = {};
        const partialAttrs = { CON: 2 };
        const lowerCaseAttrs = { int: 3, con: 2 };

        // Act & Assert
        assert.equal(CharacterSheetRules.calcMaxPE(emptyAttrs, 'INT'), 10, 'Objeto vazio deve resultar em 10 PEs');
        assert.equal(CharacterSheetRules.calcMaxPE(partialAttrs, 'INT'), 12, 'Sem atributo mágico no objeto: 0 + 2 + 10 = 12');
        assert.equal(CharacterSheetRules.calcMaxPE(lowerCaseAttrs, 'INT'), 15, 'Chaves minúsculas ({int, con}): 3 + 2 + 10 = 15');
        assert.equal(CharacterSheetRules.calcMaxPE({ CON: 2 }, null), 12, 'Tradição nula faz fallback para POD: 0 + 2 + 10 = 12');
    });

    QUnit.test('2. Casos de Borda: Valores extremos e atributos negativos', function (assert) {
        // Arrange & Act & Assert
        assert.equal(CharacterSheetRules.calcMaxPE(-1, 2), 11, 'Atributo negativo -1 + 2 + 10 = 11');
        assert.equal(CharacterSheetRules.calcMaxPE(12, 10), 32, 'Atributos divinos/sobre-humanos: 12 + 10 + 10 = 32 PEs');
    });

    // =========================================================================
    // 3. INTEGRAÇÃO COM CONTROLLER E REATIVIDADE (ARRANGE-ACT-ASSERT COM MOCKS)
    // =========================================================================
    QUnit.test('3. Integração: CharacterSheetController recalcula PE dinamicamente', function (assert) {
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
            createMockElement('display-pe-max');
            createMockElement('pontosEnergia');
            createMockElement('tradicaoMagica', 'INT');

            const controller = new CharacterSheetController();
            controller.data.attributes.INT = 4;
            controller.data.attributes.CON = 2;
            controller.data.attributes.SAB = 1;
            controller.data.tradicaoMagica = 'INT';

            // Act - Recalcular com INT 4 e CON 2 (Arcana)
            controller.recalculateAllStats();

            // Assert
            assert.equal(domElements['display-pe-max'].innerText, 16, 'PE recalculado para Tradição INT: 4 + 2 + 10 = 16');
            assert.equal(domElements['pontosEnergia'].value, 16, 'Input pontosEnergia atualizado para 16');

            // Act 2 - Alterar CON para 4
            controller.handleAttributeChange('CON', 4);

            // Assert 2
            assert.equal(domElements['display-pe-max'].innerText, 18, 'PE recalculado após mudar CON para 4: 4 + 4 + 10 = 18');

            // Act 3 - Alterar Tradição para SAB (SAB = 1, CON = 4)
            domElements['tradicaoMagica'].value = 'SAB';
            controller.data.tradicaoMagica = 'SAB';
            controller.recalculateAllStats();

            // Assert 3
            assert.equal(domElements['display-pe-max'].innerText, 15, 'PE recalculado após mudar para SAB: 1 + 4 + 10 = 15');
        } finally {
            global.document = origDoc;
        }
    });
});
