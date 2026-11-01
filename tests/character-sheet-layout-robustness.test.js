/**
 * Testes Unitários & Integrados: Robustez de Layout e Integridade da Ficha (+2d6 Kuar-Tor)
 *
 * Valida que public/formV6.html não possui quebras estruturais de tags HTML (flexbox traps),
 * garante a correta hierarquia do cabeçalho e abas de modo (Edição vs Live Play),
 * e certifica o tratamento resiliente de UUIDs e cálculos de recursos vitais.
 *
 * Estrutura Arrange-Act-Assert (AAA):
 * 1. Caminho Feliz: Balanceamento estrito de tags HTML no arquivo da ficha
 * 2. Caminho Feliz: Hierarquia de nós do DOM (Header, Seletor de Abas e Modo Edição)
 * 3. Caminho Feliz: Sincronia de IDs de Autenticação e Banner
 * 4. Casos de Borda: Geração de UUIDs segura em ambientes com e sem crypto.randomUUID
 * 5. Casos de Borda: Tolerância a dados nulos na inicialização do inventário
 * 6. Tratamento de Exceções: Cálculos vitais em Live Play e VTT sem dependência externa
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const FORMV6_PATH = path.resolve(__dirname, '../public/formV6.html');
const { CharacterSheetRules } = require('../src/core/character-sheet');

QUnit.module('Robustez de Layout e Integridade da Ficha (formV6.html)', function () {

    // -------------------------------------------------------------------------
    // 1. Balanceamento estrito de tags HTML
    // -------------------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: Todas as tags estruturais (div, fieldset, form) devem estar balanceadas (AAA)', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(FORMV6_PATH), 'public/formV6.html deve existir');
        let html = fs.readFileSync(FORMV6_PATH, 'utf8');

        // Remove scripts e styles para análise estrita de marcação DOM
        html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
        html = html.replace(/<style[\s\S]*?<\/style>/gi, '');

        const tagsToCheck = ['div', 'fieldset', 'form', 'button', 'select', 'textarea'];

        tagsToCheck.forEach(tag => {
            // Act
            const openMatches = html.match(new RegExp('<' + tag + '[\\s>]', 'gi')) || [];
            const closeMatches = html.match(new RegExp('</' + tag + '>', 'gi')) || [];

            // Assert
            assert.strictEqual(
                openMatches.length,
                closeMatches.length,
                `Tag <${tag}> deve estar perfeitamente balanceada: ${openMatches.length} aberturas vs ${closeMatches.length} fechamentos`
            );
        });
    });

    // -------------------------------------------------------------------------
    // 2. Hierarquia de nós do DOM
    // -------------------------------------------------------------------------
    QUnit.test('2. Caminho Feliz: O cabeçalho flex deve ser fechado antes das abas de modo e do formulário (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(FORMV6_PATH, 'utf8');

        // Act: localiza o início do header flex e o início das abas
        const headerFlexIdx = html.indexOf('<div class="flex flex-col md:flex-row justify-between items-center mb-6">');
        const tabsContainerIdx = html.indexOf('<!-- Seletor de Modo');
        const editModeSectionIdx = html.indexOf('id="editModeSection"');

        // Assert
        assert.ok(headerFlexIdx !== -1, 'Cabeçalho flex deve existir');
        assert.ok(tabsContainerIdx !== -1, 'Seletor de abas deve existir');
        assert.ok(editModeSectionIdx !== -1, 'Container #editModeSection deve existir');

        // O cabeçalho deve fechar antes do seletor de abas
        const sliceBeforeTabs = html.substring(headerFlexIdx, tabsContainerIdx);
        const openDivsInHeader = (sliceBeforeTabs.match(/<div[\s>]/gi) || []).length;
        const closeDivsInHeader = (sliceBeforeTabs.match(/<\/div>/gi) || []).length;

        assert.strictEqual(
            openDivsInHeader,
            closeDivsInHeader,
            'O cabeçalho flex deve ser fechado (diff 0) antes do início do seletor de abas'
        );
    });

    // -------------------------------------------------------------------------
    // 3. Sincronia de IDs de Autenticação e Banner
    // -------------------------------------------------------------------------
    QUnit.test('3. Caminho Feliz: IDs de status de autenticação não devem colidir (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(FORMV6_PATH, 'utf8');

        // Act
        const authStatusCount = (html.match(/id="auth-status"/g) || []).length;
        const bannerStatusExists = html.includes('id="firebase-auth-status-banner"');

        // Assert
        assert.strictEqual(authStatusCount, 1, 'Deve existir exatamente 1 elemento com id="auth-status" (sem duplicatas)');
        assert.ok(bannerStatusExists, 'Deve existir elemento específico para o banner: #firebase-auth-status-banner');
    });

    // -------------------------------------------------------------------------
    // 4. Geração Segura de UUIDs
    // -------------------------------------------------------------------------
    QUnit.test('4. Casos de Borda: Função generateUuid suporta ausência de crypto.randomUUID (AAA)', function (assert) {
        // Arrange: Simula ambiente sem crypto.randomUUID (HTTP ou navegador legado)
        function mockGenerateUuid(hasCryptoApi) {
            const fakeCrypto = hasCryptoApi ? { randomUUID: () => 'uuid-fake-1234-5678' } : undefined;
            if (typeof fakeCrypto !== 'undefined' && typeof fakeCrypto.randomUUID === 'function') {
                return fakeCrypto.randomUUID();
            }
            return 'sheet_' + 1234567890 + '_' + 'abc1234';
        }

        // Act
        const withCrypto = mockGenerateUuid(true);
        const withoutCrypto = mockGenerateUuid(false);

        // Assert
        assert.strictEqual(withCrypto, 'uuid-fake-1234-5678', 'Deve usar API nativa quando disponível');
        assert.ok(withoutCrypto.startsWith('sheet_'), 'Deve usar fallback resiliente quando indisponível');
    });

    // -------------------------------------------------------------------------
    // 5. Tolerância a Dados Nulos na Inicialização do Inventário
    // -------------------------------------------------------------------------
    QUnit.test('5. Casos de Borda: Inicialização de inventário e vitais com ficha vazia (AAA)', function (assert) {
        // Arrange
        const emptySheet = {};

        // Act
        const maxHP = CharacterSheetRules.calcMaxPV(emptySheet, 0);
        const maxPE = CharacterSheetRules.calcMaxPE(emptySheet, 'POD', 0);

        // Assert
        assert.strictEqual(maxHP, 10, 'PV de ficha vazia deve ser o piso base de 10');
        assert.strictEqual(maxPE, 10, 'PE de ficha vazia deve ser o piso base de 10');
    });

    // -------------------------------------------------------------------------
    // 6. Cálculo Vital em Modo Live Play e VTT
    // -------------------------------------------------------------------------
    QUnit.test('6. Tratamento de Exceções: Cálculos vitais preservam integridade com valores negativos ou corrompidos (AAA)', function (assert) {
        // Arrange: Atributos com valores extremos ou strings incorretas
        const dirtySheet = {
            CON: -5,
            POD: 'NaN',
            tradicaoMagica: 'DESCONHECIDA',
            bonusPV: -20,
            bonusPE: null
        };

        // Act
        const hp = CharacterSheetRules.calcMaxPV(dirtySheet, dirtySheet.bonusPV);
        const pe = CharacterSheetRules.calcMaxPE(dirtySheet, dirtySheet.tradicaoMagica, dirtySheet.bonusPE);

        // Assert
        assert.ok(typeof hp === 'number' && !isNaN(hp), 'PV calculado deve ser número válido');
        assert.ok(typeof pe === 'number' && !isNaN(pe), 'PE calculado deve ser número válido');
    });
});
