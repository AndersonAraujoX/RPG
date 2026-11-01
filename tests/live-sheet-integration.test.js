/**
 * @file tests/live-sheet-integration.test.js
 * @description Suíte de Testes de Integração: Pilar 3 (Modo Ficha de Jogo) e Pilar 4 (Ecossistema Kuar-Tor)
 * Padrão: Arrange-Act-Assert (AAA)
 * Cobertura:
 *  - Caminho Feliz: Estrutura do Live Play Sheet em public/formV6.html e integração com Mesa Virtual.
 *  - Casos de Borda: Fichas sem armas/equipamento, sem magias, dados vazios e recuperação resiliente.
 *  - Tratamento de Exceções: Payloads corrompidos e sincronização de storage.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const FORMV6_PATH = path.resolve(__dirname, '../public/formV6.html');
const MESA_PATH = path.resolve(__dirname, '../public/mesa_virtual.html');

const LiveSheetController = require('../src/core/live-sheet-controller');
const CharacterSheetRules = require('../src/core/character-sheet');

QUnit.module('Integração: Pilar 3 (Modo Ficha de Jogo) & Pilar 4 (Ecossistema Portal)', function () {

    // -------------------------------------------------------------------------
    // 1. CAMINHO FELIZ: Estrutura HTML do Modo Ficha de Jogo (Live Play Sheet)
    // -------------------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: public/formV6.html deve conter os seletores de modo e scripts necessários (AAA)', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(FORMV6_PATH), 'public/formV6.html deve existir');
        const html = fs.readFileSync(FORMV6_PATH, 'utf-8');

        // Act & Assert
        // Scripts importados
        assert.ok(html.includes('src="../src/core/live-sheet-controller.js"'), 'Deve importar live-sheet-controller.js');
        assert.ok(html.includes('src="../src/core/dice-roller.js"'), 'Deve importar dice-roller.js');

        // Seletores de Abas de Modo
        assert.ok(html.includes('id="tabModeEdit"'), 'Deve conter aba #tabModeEdit');
        assert.ok(html.includes('id="tabModeLive"'), 'Deve conter aba #tabModeLive');

        // Containers estruturais
        assert.ok(html.includes('id="editModeSection"'), 'Deve conter container #editModeSection');
        assert.ok(html.includes('id="livePlaySheetSection"'), 'Deve conter container #livePlaySheetSection');
    });

    QUnit.test('2. Caminho Feliz: public/formV6.html deve conter controles de PV, PE, descansos e condições (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(FORMV6_PATH, 'utf-8');

        // Act & Assert
        // Barras e indicadores vitais
        assert.ok(html.includes('id="liveHpBar"'), 'Deve conter barra visual de PV #liveHpBar');
        assert.ok(html.includes('id="livePeBar"'), 'Deve conter barra visual de PE #livePeBar');
        assert.ok(html.includes('id="liveHpText"'), 'Deve conter indicador de PV atual #liveHpText');
        assert.ok(html.includes('id="livePeText"'), 'Deve conter indicador de PE atual #livePeText');

        // Ações de descanso
        assert.ok(html.includes('id="liveShortRestBtn"'), 'Deve conter botão #liveShortRestBtn (Descanso Curto)');
        assert.ok(html.includes('id="liveLongRestBtn"'), 'Deve conter botão #liveLongRestBtn (Descanso Longo)');

        // Rastreador de condições e estatísticas efetivas
        assert.ok(html.includes('id="liveConditionsContainer"'), 'Deve conter #liveConditionsContainer');
        assert.ok(html.includes('id="liveEffectiveDefense"'), 'Deve conter display #liveEffectiveDefense');
        assert.ok(html.includes('id="liveEffectiveInitiative"'), 'Deve conter display #liveEffectiveInitiative');
        assert.ok(html.includes('id="liveEffectiveDmgForca"'), 'Deve conter display #liveEffectiveDmgForca');

        // Grades de ação
        assert.ok(html.includes('id="liveAttacksGrid"'), 'Deve conter grade de ataques formatados #liveAttacksGrid');
        assert.ok(html.includes('id="liveSkillsGrid"'), 'Deve conter grade de perícias 1-clique #liveSkillsGrid');
        assert.ok(html.includes('id="liveSpellsGrid"'), 'Deve conter grimório de magias #liveSpellsGrid');
    });

    // -------------------------------------------------------------------------
    // 2. CAMINHO FELIZ: Pilar 4 - Integração com Mesa Virtual e Duplicação
    // -------------------------------------------------------------------------
    QUnit.test('3. Caminho Feliz: Ações da Lista de Crônicas (Mesa Virtual & Duplicação) (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(FORMV6_PATH, 'utf-8');

        // Act & Assert
        // Botões na renderização da lista
        assert.ok(html.includes('play-vtt-btn'), 'renderSheetsList deve gerar botões com classe .play-vtt-btn');
        assert.ok(html.includes('duplicate-sheet-btn'), 'renderSheetsList deve gerar botões com classe .duplicate-sheet-btn');

        // Botões de ação direta no Live Play
        assert.ok(html.includes('id="livePlayVttBtn"'), 'Deve conter botão #livePlayVttBtn');
        assert.ok(html.includes('id="liveDuplicateSheetBtn"'), 'Deve conter botão #liveDuplicateSheetBtn');
        assert.ok(html.includes('id="liveSyncMagicTreeBtn"'), 'Deve conter botão #liveSyncMagicTreeBtn');
        assert.ok(html.includes('id="liveExportJsonBtn"'), 'Deve conter botão #liveExportJsonBtn');
    });

    QUnit.test('4. Caminho Feliz: public/mesa_virtual.html deve ler personagem ativo e fichas salvas (AAA)', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(MESA_PATH), 'public/mesa_virtual.html deve existir');
        const mesaHtml = fs.readFileSync(MESA_PATH, 'utf-8');

        // Act & Assert
        assert.ok(
            mesaHtml.includes('kuartor_active_vtt_character'),
            'Mesa Virtual deve inspecionar localStorage kuartor_active_vtt_character ao carregar'
        );
        assert.ok(
            mesaHtml.includes('renderSavedSheetsInPicker'),
            'Mesa Virtual deve possuir seletor de fichas salvas renderSavedSheetsInPicker'
        );
        assert.ok(
            mesaHtml.includes('kuar_tor_saved_sheets'),
            'Mesa Virtual deve integrar com as fichas salvas em kuar_tor_saved_sheets'
        );
    });

    // -------------------------------------------------------------------------
    // 3. CASOS DE BORDA: Fichas com coleções vazias ou dados incompletos
    // -------------------------------------------------------------------------
    QUnit.test('5. Casos de Borda: Extração de Ataques e Magias em Ficha Mínima (AAA)', function (assert) {
        // Arrange
        const minimalSheet = {
            charName: 'Viajante Solitário',
            for: 3,
            des: 2,
            con: 2,
            equipment: '',
            caminhosMagia: [],
            pericias: []
        };

        // Act
        const attacks = LiveSheetController.extractAttackCards(minimalSheet, []);
        const spells = LiveSheetController.extractSpellCards(minimalSheet, null);
        const payload = LiveSheetController.prepareVttTokenPayload(minimalSheet);

        // Assert
        assert.ok(attacks.length >= 1, 'Deve extrair pelo menos 1 ataque padrão (Golpe Desarmado)');
        assert.equal(attacks[0].name, 'Golpe Desarmado', 'Nome do ataque padrão é Golpe Desarmado');
        assert.equal(attacks[0].damageFormula, '1d6 - 2 + 1', 'Dano desarmado inclui bônus de força (1d6 - 2 + 1)');
        assert.ok(Array.isArray(spells), 'Magias deve retornar array mesmo sem caminhos');
        assert.equal(payload.name, 'Viajante Solitário', 'Nome do token VTT correto');
        assert.equal(payload.defense, 9, 'Defesa passiva calculada para DES 2 (7 + 2 = 9)');
    });

    QUnit.test('6. Casos de Borda: Clamping e Modificadores Extremos de Condições (AAA)', function (assert) {
        // Arrange
        const desVal = 2;
        const allConditions = ['sangrando', 'atordoado', 'em_guarda', 'inconsciente', 'cego', 'imobilizado'];

        // Act
        const effectiveDef = LiveSheetController.getEffectiveDefense(desVal, 0, allConditions);
        const mods = LiveSheetController.getConditionModifiers(allConditions);

        // Assert
        // Base: 7 + 2 = 9. Modificadores: em_guarda (+2), atordoado (-2), inconsciente (-5), cego (-2), imobilizado (-3) -> total mod = -10. 9 - 10 = -1 -> clamped para 1.
        assert.ok(effectiveDef >= 1, 'Defesa efetiva não pode ser inferior a 1');
        assert.ok(mods.isUnconscious, 'Sinaliza inconsciência');
        assert.ok(mods.attackMod <= -99, 'Ataque com penalidade de incapacitação');
    });

    // -------------------------------------------------------------------------
    // 4. TRATAMENTO DE EXCEÇÕES: Proteção contra Corrupção de Estado e Storage
    // -------------------------------------------------------------------------
    QUnit.test('7. Tratamento de Exceções: Importação de JSON mal formatado ou nulo (AAA)', function (assert) {
        // Arrange
        const corruptedStrings = ['{ invalid json', '', null, undefined, '12345'];

        // Act & Assert
        corruptedStrings.forEach(input => {
            const res = LiveSheetController.importJson(input);
            assert.equal(res.success, false, `Importação com entrada "${input}" deve falhar com segurança`);
            assert.ok(res.error && res.error.length > 0, `Deve conter mensagem de erro descritiva: ${res.error}`);
        });
    });

    QUnit.test('8. Tratamento de Exceções: Sincronização da Árvore de Magia com Estado Nulo (AAA)', function (assert) {
        // Arrange
        const sheet = { charName: 'Mago', caminhosMagia: [{ nome: 'Fogo', nivel: 2 }] };

        // Act
        const resultWithNullTree = LiveSheetController.syncMagicTree(sheet, null);
        const resultWithEmptyTree = LiveSheetController.syncMagicTree(sheet, {});

        // Assert
        assert.deepEqual(resultWithNullTree.updatedSheet.caminhosMagia, sheet.caminhosMagia, 'Mantém caminhos originais se árvore for nula');
        assert.deepEqual(resultWithEmptyTree.updatedSheet.caminhosMagia, sheet.caminhosMagia, 'Mantém caminhos originais se árvore for vazia');
    });
});
