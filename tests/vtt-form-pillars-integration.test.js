/**
 * Testes Unitários de Integração: Os 6 Pilares do Portal Kuar-Tor (+2d6)
 *
 * Valida com o padrão Arrange-Act-Assert (AAA):
 * 1. Toolkit do Mestre no VTT (Bestiário Rápido, Invocação e Turn Tracker)
 * 2. Efeitos Sonoros Dinâmicos Web Audio API Sintetizados Offline
 * 3. Áreas de Efeito (AoE) e Névoa Tática na Mesa Virtual
 * 4. Integração do Catálogo de Equipamentos com a Ficha de Personagem (formV6.html)
 * 5. Modernização e Conformidade dos Módulos Legados (Diário, Computador, Cofre)
 * 6. Suporte PWA e Resiliência Offline Total (manifest.json, sw.js)
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_VTT_PATH = path.join(ROOT_DIR, 'public/mesa_virtual.html');
const FORM_V6_PATH = path.join(ROOT_DIR, 'public/formV6.html');
const INDEX_HTML_PATH = path.join(ROOT_DIR, 'index.html');
const DIARIO_PUBLIC_PATH = path.join(ROOT_DIR, 'public/diario.html');
const TERMINAL_PUBLIC_PATH = path.join(ROOT_DIR, 'public/computador_de_kuar_tor.html');
const COFRE_PUBLIC_PATH = path.join(ROOT_DIR, 'public/cofre.html');
const MANIFEST_PATH = path.join(ROOT_DIR, 'public/manifest.json');
const SW_PATH = path.join(ROOT_DIR, 'public/sw.js');

const VttBestiaryEngine = require('../src/core/vtt-bestiary-engine');
const VttFogAoeEngine = require('../src/core/vtt-fog-aoe-engine');
const ItemCatalogEngine = require('../src/core/item-catalog-engine');
const AudioSfxEngine = require('../src/core/audio-sfx-engine');
const LiveSheetController = require('../src/core/live-sheet-controller');

QUnit.module('Pilares do Portal Kuar-Tor — Integração VTT e Ficha (+2d6)', function () {

    // =========================================================================
    // PILAR 1: Toolkit do Mestre no VTT (Bestiário Rápido & Turn Tracker)
    // =========================================================================
    QUnit.test('Pilar 1 — Toolkit do Mestre: Markup, botões e funções no VTT (AAA)', function (assert) {
        // Arrange
        const vttHtml = fs.readFileSync(PUBLIC_VTT_PATH, 'utf-8');

        // Act & Assert (Caminho Feliz: Elementos da UI presentes no DOM)
        assert.ok(vttHtml.includes('id="tool-bestiary"'), 'Botão do Bestiário (#tool-bestiary) deve existir na Toolbar');
        assert.ok(vttHtml.includes('id="tool-tracker"'), 'Botão do Rastreador de Turnos (#tool-tracker) deve existir na Toolbar');
        assert.ok(vttHtml.includes('id="bestiary-modal"'), 'Modal do Bestiário (#bestiary-modal) deve estar presente no HTML');
        assert.ok(vttHtml.includes('id="bestiary-search"'), 'Campo de busca do Bestiário (#bestiary-search) deve existir');
        assert.ok(vttHtml.includes('id="bestiary-filter-category"'), 'Filtro de categoria do Bestiário (#bestiary-filter-category) deve existir');
        assert.ok(vttHtml.includes('id="combat-tracker-hud"'), 'HUD flutuante de combate (#combat-tracker-hud) deve existir');
        assert.ok(vttHtml.includes('vtt-bestiary-engine.js'), 'VTT deve importar o motor vtt-bestiary-engine.js');

        // Funções de controle do Bestiário e Turn Tracker
        assert.ok(vttHtml.includes('function openBestiaryModal'), 'Função openBestiaryModal deve estar implementada');
        assert.ok(vttHtml.includes('function renderBestiaryList'), 'Função renderBestiaryList deve estar implementada');
        assert.ok(vttHtml.includes('function spawnCreatureFromBestiary'), 'Função spawnCreatureFromBestiary deve estar implementada');
        assert.ok(vttHtml.includes('function advanceCombatTurn'), 'Função advanceCombatTurn deve estar implementada');
        assert.ok(vttHtml.includes('function toggleTurnTracker'), 'Função toggleTurnTracker deve estar implementada');

        // Act: Invocação de Criatura e Criação de Token de Inimigo via BestiaryEngine
        const enemyToken = VttBestiaryEngine.createEnemyToken('goblin_catacumbas', { x: 150, y: 200 });

        // Assert
        assert.strictEqual(enemyToken.name, 'Salteador das Catacumbas', 'Nome da criatura deve ser mapeado');
        assert.strictEqual(enemyToken.hp, 10, 'PV do token deve corresponder ao bestiário');
        assert.strictEqual(enemyToken.maxHp, 10, 'Max PV do token deve corresponder ao bestiário');
        assert.strictEqual(enemyToken.x, 150, 'Coordenada X deve ser aplicada');
        assert.strictEqual(enemyToken.y, 200, 'Coordenada Y deve ser aplicada');
    });

    // =========================================================================
    // PILAR 2: Efeitos Sonoros Dinâmicos Web Audio API Offline
    // =========================================================================
    QUnit.test('Pilar 2 — Áudio Sintetizado: Importação e integração no VTT e Ficha (AAA)', function (assert) {
        // Arrange
        const vttHtml = fs.readFileSync(PUBLIC_VTT_PATH, 'utf-8');
        const formHtml = fs.readFileSync(FORM_V6_PATH, 'utf-8');

        // Act & Assert (Caminho Feliz: Módulo e botão de Mudo presentes)
        assert.ok(vttHtml.includes('audio-sfx-engine.js'), 'mesa_virtual.html deve importar audio-sfx-engine.js');
        assert.ok(formHtml.includes('audio-sfx-engine.js'), 'formV6.html deve importar audio-sfx-engine.js');
        assert.ok(vttHtml.includes('id="tool-audio-mute"'), 'Toolbar do VTT deve conter botão de mudo (#tool-audio-mute)');
        assert.ok(vttHtml.includes('toggleVttAudioMute'), 'Função toggleVttAudioMute deve estar implementada no VTT');

        // Act & Assert: Gatilhos sonoros integrados em rolagens e combate
        assert.ok(vttHtml.includes('AudioSfxEngine.playDiceRoll()'), 'VTT deve disparar som ao rolar dados');
        assert.ok(vttHtml.includes('AudioSfxEngine.playCriticalSuccess()'), 'VTT deve disparar som ao obter Crítico (12)');
        assert.ok(vttHtml.includes('AudioSfxEngine.playCriticalFailure()'), 'VTT deve disparar som ao obter Falha Crítica (2)');
        assert.ok(vttHtml.includes('AudioSfxEngine.playDamageTaken()'), 'VTT deve disparar som de dano sofrido');
        assert.ok(vttHtml.includes('AudioSfxEngine.playHeal()'), 'VTT deve disparar som de cura');

        // Ficha Live Mode
        assert.ok(formHtml.includes('AudioSfxEngine.playDiceRoll()'), 'formV6 deve disparar som ao rolar dados');
        assert.ok(formHtml.includes('AudioSfxEngine.playCombatHit()'), 'formV6 deve disparar som de golpe de arma');
        assert.ok(formHtml.includes('AudioSfxEngine.playSpellCast()'), 'formV6 deve disparar som ao conjurar magia');
        assert.ok(formHtml.includes('AudioSfxEngine.playConditionToggle()'), 'formV6 deve disparar som ao alternar condição');
    });

    // =========================================================================
    // PILAR 3: Áreas de Efeito (AoE) e Névoa Tática na Mesa Virtual
    // =========================================================================
    QUnit.test('Pilar 3 — Áreas de Efeito (AoE): Toolbar, templates e detecção de alvos (AAA)', function (assert) {
        // Arrange
        const vttHtml = fs.readFileSync(PUBLIC_VTT_PATH, 'utf-8');

        // Act & Assert (Caminho Feliz)
        assert.ok(vttHtml.includes('id="tool-aoe"'), 'Toolbar deve ter o botão #tool-aoe');
        assert.ok(vttHtml.includes('id="aoe-controls-bar"'), 'HUD de controles de AoE (#aoe-controls-bar) deve existir');
        assert.ok(vttHtml.includes('id="aoe-svg"'), 'Camada SVG para renderizar templates de AoE (#aoe-svg) deve existir');
        assert.ok(vttHtml.includes('function activateAoETemplate'), 'Função activateAoETemplate deve existir');
        assert.ok(vttHtml.includes('function renderAoETemplate'), 'Função renderAoETemplate deve existir');
        assert.ok(vttHtml.includes('function clearAoETemplates'), 'Função clearAoETemplates deve existir');

        // Act: Testar cálculo de AoE e detecção de tokens com VttFogAoeEngine
        const circleCells = VttFogAoeEngine.calculateCircleAoE(200, 200, 3, 50, 1.5);
        const mockTokens = [
            { id: 'tok1', name: 'Alvo Próximo', x: 200, y: 200 }, // Col 4, Row 4 (centro do círculo)
            { id: 'tok2', name: 'Alvo Longe', x: 800, y: 800 }     // Fora do círculo
        ];
        const hitTokens = VttFogAoeEngine.getTokensInAoE(mockTokens, circleCells, 50);

        // Assert
        assert.strictEqual(hitTokens.length, 1, 'Exatamente 1 token deve ser atingido pelo AoE');
        assert.strictEqual(hitTokens[0].name, 'Alvo Próximo', 'Alvo Próximo deve ser o atingido');
    });

    // =========================================================================
    // PILAR 4: Integração do Inventário com a Ficha de Personagem (formV6.html)
    // =========================================================================
    QUnit.test('Pilar 4 — Inventário & Catálogo: Botão rápido, modal e integração com LiveSheet (AAA)', function (assert) {
        // Arrange
        const formHtml = fs.readFileSync(FORM_V6_PATH, 'utf-8');

        // Act & Assert (Caminho Feliz: Markup e scripts na ficha)
        assert.ok(formHtml.includes('item-catalog-engine.js'), 'formV6.html deve importar item-catalog-engine.js');
        assert.ok(formHtml.includes('id="openItemCatalogBtn"'), 'Botão do Catálogo de Equipamentos deve existir no HTML');
        assert.ok(formHtml.includes('id="item-catalog-modal"'), 'Modal do Catálogo (#item-catalog-modal) deve existir');
        assert.ok(formHtml.includes('id="item-catalog-search"'), 'Campo de busca de itens (#item-catalog-search) deve existir');
        assert.ok(formHtml.includes('id="item-catalog-category"'), 'Filtro de categoria (#item-catalog-category) deve existir');
        assert.ok(formHtml.includes('window.openItemCatalogModal'), 'Função openItemCatalogModal deve estar exposta');
        assert.ok(formHtml.includes('window.addItemFromCatalog'), 'Função addItemFromCatalog deve estar exposta');

        // Act: Simular adição de item do catálogo à ficha e geração de cartões de ataque
        const sword = ItemCatalogEngine.getItemById('espada_longa');
        const sheet = { equipment: 'Mochila de couro, Tocha (3x)' };
        const updatedSheet = ItemCatalogEngine.addItemToSheet(sheet, sword);

        // Assert
        assert.ok(updatedSheet.equipment.includes('Espada Longa (dano: 1d6+2)'), 'Item formatado deve constar no equipamento');

        // Act: Validar que o LiveSheetController gera cartões de ataque a partir do item adicionado
        const attacks = LiveSheetController.extractAttackCards(updatedSheet, []);
        const swordCard = attacks.find(a => a.name.includes('Espada Longa'));

        // Assert
        assert.ok(swordCard, 'LiveSheetController deve extrair cartão de ataque para a Espada Longa');
        assert.ok(swordCard.damageFormula.includes('1d6'), 'Fórmula de dano deve conter 1d6');
    });

    // =========================================================================
    // PILAR 5: Modernização e Conformidade dos Módulos Legados
    // =========================================================================
    QUnit.test('Pilar 5 — Módulos Modernizados: Diário, Terminal e Cofre (AAA)', function (assert) {
        // Arrange & Act
        const diarioHtml = fs.readFileSync(DIARIO_PUBLIC_PATH, 'utf-8');
        const terminalHtml = fs.readFileSync(TERMINAL_PUBLIC_PATH, 'utf-8');
        const cofreHtml = fs.readFileSync(COFRE_PUBLIC_PATH, 'utf-8');

        // Assert (Sem CDN de bloqueio e com Tailwind local)
        [
            { name: 'Diário', html: diarioHtml },
            { name: 'Terminal', html: terminalHtml },
            { name: 'Cofre', html: cofreHtml }
        ].forEach(({ name, html }) => {
            assert.ok(html.includes('tailwind.css'), `${name} deve referenciar tailwind.css local`);
            assert.notOk(html.includes('cdn.tailwindcss.com'), `${name} não deve usar cdn.tailwindcss.com`);
        });

        // Verificações específicas de funcionalidade
        assert.ok(diarioHtml.includes('saveEntries'), 'Diário deve ter funcionalidade de salvar entradas (saveEntries)');
        assert.ok(terminalHtml.includes('submitInput'), 'Terminal Sombra OS deve ter processador de input (submitInput)');
        assert.ok(cofreHtml.includes('checkVaultBtn'), 'Cofre 3D deve conter verificação de combinação (checkVaultBtn)');
    });

    // =========================================================================
    // PILAR 6: Suporte PWA e Resiliência Offline Total
    // =========================================================================
    QUnit.test('Pilar 6 — PWA & Offline: Manifest e Service Worker registrados (AAA)', function (assert) {
        // Arrange
        const indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
        const vttHtml = fs.readFileSync(PUBLIC_VTT_PATH, 'utf-8');
        const formHtml = fs.readFileSync(FORM_V6_PATH, 'utf-8');

        // Act & Assert
        assert.ok(fs.existsSync(MANIFEST_PATH), 'public/manifest.json deve existir');
        assert.ok(fs.existsSync(SW_PATH), 'public/sw.js deve existir');

        // Tag manifest presente nas páginas principais
        assert.ok(indexHtml.includes('manifest.json'), 'index.html deve referenciar manifest.json');
        assert.ok(vttHtml.includes('manifest.json'), 'mesa_virtual.html deve referenciar manifest.json');
        assert.ok(formHtml.includes('manifest.json'), 'formV6.html deve referenciar manifest.json');

        // Meta theme-color presente
        assert.ok(indexHtml.includes('theme-color'), 'index.html deve ter meta theme-color');
        assert.ok(vttHtml.includes('theme-color'), 'mesa_virtual.html deve ter meta theme-color');
        assert.ok(formHtml.includes('theme-color'), 'formV6.html deve ter meta theme-color');
    });

    // =========================================================================
    // Casos de Borda e Resiliência (AAA)
    // =========================================================================
    QUnit.test('Casos de Borda: Resiliência a entradas vazias, nulas e limites (AAA)', function (assert) {
        // Arrange & Act
        const emptyBestiarySearch = VttBestiaryEngine.filterCreatures('', 'ALL');
        const nullCreature = VttBestiaryEngine.getCreatureById(null);
        const emptyItemFilter = ItemCatalogEngine.filterItems('', 'ALL');
        const nullItem = ItemCatalogEngine.getItemById(null);
        const blankSheet = { equipment: '' };

        // Assert
        assert.ok(emptyBestiarySearch.length > 0, 'Busca vazia no Bestiário deve retornar todos os monstros');
        assert.strictEqual(nullCreature, null, 'ID nulo no Bestiário deve retornar null com segurança');
        assert.ok(emptyItemFilter.length > 0, 'Busca vazia no catálogo de itens deve retornar todos os itens');
        assert.strictEqual(nullItem, null, 'ID nulo no catálogo de itens deve retornar null');
        assert.throws(() => ItemCatalogEngine.addItemToSheet(blankSheet, null), /Item inválido/, 'Item nulo deve disparar exceção tratada');
    });
});
