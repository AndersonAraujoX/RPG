/**
 * @file tests/grid-inventory-engine.test.js
 * @description Testes AAA do inventário em grade (estilo Resident Evil).
 */
const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');
const G = require('../src/core/grid-inventory-engine');
const Catalog = require('../src/core/item-catalog-engine');

const items = Catalog.getAllItems();
const resolve = id => Catalog.getItemById(id);
const get = id => resolve(id);

QUnit.module('GridInventoryEngine — Maleta Tática (AAA)', function () {

    QUnit.test('1. Caminho Feliz: classes genéricas resolvem a área (espada, arco, machado) (AAA)', function (assert) {
        // Arrange & Act
        const espada = G.getFootprint(get('espada_longa'));
        const curta = G.getFootprint(get('espada_curta'));
        const adaga = G.getFootprint(get('adaga_aco'));
        const machado = G.getFootprint(get('machado_batalha'));
        const arco = G.getFootprint(get('arco_curto'));

        // Assert
        assert.deepEqual([espada.w, espada.h, espada.classId], [1, 4, 'espada'], 'Espada em geral = 1x4');
        assert.deepEqual([curta.w, curta.h], [1, 3], 'Espada curta = 1x3');
        assert.deepEqual([adaga.w, adaga.h], [1, 2], 'Adaga = 1x2');
        assert.deepEqual([machado.w, machado.h], [2, 3], 'Machado = 2x3');
        assert.equal(arco.source, 'item', 'Override por item tem prioridade sobre a classe');
    });

    QUnit.test('2. Caminho Feliz: todo item do catálogo possui área válida na tabela (AAA)', function (assert) {
        // Arrange & Act
        const table = G.buildItemAreaTable(items);

        // Assert
        assert.equal(table.length, items.length, 'Uma linha por item');
        table.forEach(r => assert.ok(r.w >= 1 && r.h >= 1 && r.area === r.w * r.h, `${r.id} com área válida`));
        assert.ok(G.getFootprintTable(items).some(r => r.scope === 'Classe genérica'), 'Tabela de classes presente');
    });

    QUnit.test('3. Caminho Feliz: colocar, mover, girar e remover item (AAA)', function (assert) {
        // Arrange
        let inv = G.createInventory(8, 5);
        const espada = get('espada_longa');

        // Act
        inv = G.placeItem(inv, espada, 0, 0, false, resolve);
        inv = G.moveItem(inv, 1, 3, 0, resolve);
        inv = G.rotateItem(inv, 1, resolve);
        const afterRotate = inv.items[0];
        inv = G.removeItem(inv, 1);

        // Assert
        assert.deepEqual([afterRotate.x, afterRotate.y, afterRotate.rotated], [3, 0, true], 'Movido e girado');
        assert.equal(inv.items.length, 0, 'Removido');
    });

    QUnit.test('4. Casos de Borda: sobreposição, limites e rotação sem espaço (AAA)', function (assert) {
        // Arrange
        let inv = G.createInventory(4, 4);
        const escudo = get('escudo_aco'); // 3x3
        inv = G.placeItem(inv, escudo, 0, 0, false, resolve);

        // Act & Assert
        assert.notOk(G.canPlace(inv, get('adaga_aco'), 0, 0, false, resolve), 'Sobreposição bloqueada');
        assert.notOk(G.canPlace(inv, get('espada_longa'), 3, 1, false, resolve), 'Fora dos limites bloqueado');
        assert.notOk(G.canPlace(inv, get('adaga_aco'), -1, 0, false, resolve), 'Coordenada negativa bloqueada');
        assert.throws(() => G.placeItem(inv, get('adaga_aco'), 1, 1, false, resolve), /Sem espaço/);

        const sword = G.placeItem(G.createInventory(4, 4), get('espada_longa'), 0, 0, false, resolve);
        const blocked = G.placeItem(sword, get('adaga_aco'), 1, 0, false, resolve);
        assert.throws(() => G.rotateItem(blocked, 1, resolve), /Sem espaço/, 'Rotação bloqueada por outro item');
        assert.ok(G.rotateItem(sword, 1, resolve).items[0].rotated, 'Espada 1x4 gira para 4x1 se houver linha livre');
    });

    QUnit.test('5. Casos de Borda: autoPlace usa rotação e detecta maleta cheia (AAA)', function (assert) {
        // Arrange: maleta 4x1 só comporta espada 1x4 girada
        const inv = G.createInventory(4, 1);

        // Act
        const placed = G.autoPlace(inv, get('espada_longa'), resolve);
        const full = G.createInventory(1, 1);

        // Assert
        assert.ok(placed.items[0].rotated, 'Encaixou girada');
        assert.equal(G.findFreeSlot(full, get('espada_longa'), resolve), null, 'Sem slot livre');
        assert.throws(() => G.autoPlace(full, get('espada_longa'), resolve), /Maleta cheia/);
    });

    QUnit.test('6. Caminho Feliz: estatísticas de espaço, capacidade por FOR e CON e imutabilidade (AAA)', function (assert) {
        // Arrange
        const inv = G.createInventory(8, 5);

        // Act
        const next = G.autoPlace(inv, get('pocao_cura'), resolve);
        const stats = G.getStats(next, resolve);

        // Assert
        assert.equal(inv.items.length, 0, 'Estado original não foi mutado');
        assert.equal(stats.usedCells, 1);
        assert.equal(stats.freeCells, 39);
        assert.notOk('weight' in stats, 'Peso não faz parte das estatísticas');
        assert.deepEqual(G.capacityFromAttributes(0, 0), { cols: 6, rows: 4 }, 'Mínimo 6x4');
        assert.deepEqual(G.capacityFromAttributes(1, 2), { cols: 8, rows: 5 }, 'FOR 1 / CON 2 = 8x5');
        assert.deepEqual(G.capacityFromAttributes(3, 3), { cols: 9, rows: 7 }, 'FOR 3 / CON 3 = 9x7');
        assert.deepEqual(G.capacityFromAttributes(4, 4), { cols: 10, rows: 8 }, 'Máximo 10x8');
        assert.deepEqual(G.capacityFromAttributes(99, -5), { cols: 6, rows: 8 }, 'Valores limitados a 0..4');
        assert.deepEqual(G.capacityFromAttributes(null, undefined), { cols: 6, rows: 4 }, 'Nulos viram 0');
        assert.deepEqual(G.capacityFromAttributes('2', '1.9'), { cols: 7, rows: 6 }, 'Strings numéricas e decimais truncados');
    });

    QUnit.test('7. Tratamento de Exceções: entradas inválidas e restauração segura (AAA)', function (assert) {
        // Arrange & Act & Assert
        assert.throws(() => G.getFootprint(null), /Item inválido/);
        assert.throws(() => G.createInventory(0, 3), /inválidas/);
        assert.throws(() => G.placeItem(null, get('adaga_aco'), 0, 0, false, resolve), /Inventário inválido/);
        assert.throws(() => G.removeItem(G.createInventory(), 99), /não encontrado/);
        assert.throws(() => G.buildItemAreaTable(null), /Catálogo inválido/);
        assert.deepEqual(G.getFootprint({ name: 'Coisa Estranha' }), { w: 1, h: 1, source: 'padrao' }, 'Fallback 1x1');

        const restored = G.restoreInventory({ cols: 4, rows: 4, items: [
            { itemId: 'inexistente', x: 0, y: 0 },
            { itemId: 'espada_longa', x: 0, y: 0 },
            { itemId: 'espada_longa', x: 0, y: 0 }
        ] }, resolve);
        assert.equal(restored.items.length, 1, 'Descarta desconhecidos e sobrepostos');
        assert.equal(G.restoreInventory(null, resolve).cols, 8, 'Dado nulo gera maleta padrão');
    });

    QUnit.test('8. Integração: página da maleta existe e referencia motores e tabelas (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(path.resolve(__dirname, '../public/inventario_grid.html'), 'utf-8');
        const itemsHtml = fs.readFileSync(path.resolve(__dirname, '../public/items.html'), 'utf-8');

        // Assert
        assert.ok(html.includes('grid-inventory-engine.js') && html.includes('item-catalog-engine.js'), 'Scripts referenciados');
        assert.ok(html.includes('id="case-grid"') && html.includes('id="table-items"') && html.includes('id="table-classes"'), 'Grade e tabelas');
        assert.ok(itemsHtml.includes('inventario_grid.html'), 'Link a partir do Baú da Guilda');
        assert.ok(html.includes('id="char-select"'), 'Seletor de herói presente no HTML');
        assert.ok(html.includes('id="char-badge"'), 'Badge de atributos do herói presente');
        assert.ok(html.includes('id="btn-import-sheet"'), 'Botão de importação de itens da ficha presente');
    });

    QUnit.test('9. Caminho Feliz: extração de FOR e CON da ficha do personagem e chaves de armazenamento (AAA)', function (assert) {
        // Arrange: fichas em múltiplos formatos suportados (formV6, wrapper, campos planos)
        const sheetFormV6 = { id: 'arthur_1', name: 'Arthur', sheetData: { for: '3', con: '2', charName: 'Arthur Pendragon' } };
        const sheetVtt = { id: 'merlin_1', name: 'Merlin', forVal: 1, conVal: 4 };
        const sheetLegacy = { forca: 2, constituicao: 3, charName: 'Galahad' };
        const sheetEmpty = null;
        const sheetOutOfBounds = { for: 10, con: -2 };

        // Act
        const resFormV6 = G.extractAttributesFromSheet(sheetFormV6);
        const resVtt = G.extractAttributesFromSheet(sheetVtt);
        const resLegacy = G.extractAttributesFromSheet(sheetLegacy);
        const resEmpty = G.extractAttributesFromSheet(sheetEmpty);
        const resBounds = G.extractAttributesFromSheet(sheetOutOfBounds);

        // Assert
        assert.deepEqual(resFormV6, { forVal: 3, conVal: 2, name: 'Arthur', id: 'arthur_1' });
        assert.deepEqual(resVtt, { forVal: 1, conVal: 4, name: 'Merlin', id: 'merlin_1' });
        assert.deepEqual(resLegacy, { forVal: 2, conVal: 3, name: 'Galahad', id: '' });
        assert.deepEqual(resEmpty, { forVal: 1, conVal: 2, name: 'Sem Ficha', id: '' }, 'Valores padrão seguros');
        assert.deepEqual(resBounds, { forVal: 4, conVal: 0, name: 'Herói Sem Nome', id: '' }, 'Valores delimitados a 0..4');

        // Chaves de armazenamento
        assert.equal(G.getStorageKeyForCharacter('hero_123'), 'kuartor_grid_inventory_hero_123');
        assert.equal(G.getStorageKeyForCharacter(''), 'kuartor_grid_inventory');
        assert.equal(G.getStorageKeyForCharacter(null), 'kuartor_grid_inventory');
    });

    QUnit.test('10. Caminho Feliz & Casos de Borda: sincronização da maleta com a ficha do herói (syncWithCharacterSheet) (AAA)', function (assert) {
        // Arrange: maleta inicial 6x4 (FOR 0 / CON 0)
        let inv = G.createInventory(6, 4);
        inv = G.placeItem(inv, get('pocao_cura'), 0, 0, false, resolve);
        inv = G.placeItem(inv, get('adaga_aco'), 1, 0, false, resolve); // 1x2

        const heroSheet = {
            id: 'warrior_1',
            name: 'Guerreiro da Vanguarda',
            sheetData: { for: 3, con: 2 } // FOR 3 (7 linhas) / CON 2 (8 colunas)
        };

        // Act: sincroniza com a ficha do herói
        const syncedInv = G.syncWithCharacterSheet(inv, heroSheet, resolve);

        // Assert
        assert.equal(syncedInv.cols, 8, 'Colunas ajustadas para 8 (6 + CON 2)');
        assert.equal(syncedInv.rows, 7, 'Linhas ajustadas para 7 (4 + FOR 3)');
        assert.equal(syncedInv.items.length, 2, 'Itens existentes preservados');

        // Casos de Borda: encolhimento que descarta item fora da nova área
        const weakHero = { for: 0, con: 0 }; // 6 colunas x 4 linhas
        let bigInv = G.createInventory(10, 8);
        bigInv = G.placeItem(bigInv, get('pocao_cura'), 0, 0, false, resolve);
        bigInv = G.placeItem(bigInv, get('espada_longa'), 7, 0, false, resolve); // fora do limite de 6 cols

        const shrunkInv = G.syncWithCharacterSheet(bigInv, weakHero, resolve);
        assert.equal(shrunkInv.cols, 6);
        assert.equal(shrunkInv.rows, 4);
        assert.equal(shrunkInv.items.length, 1, 'Item que não coube mais foi descartado com segurança');

        // Tratamento de exceção
        assert.throws(() => G.syncWithCharacterSheet(null, heroSheet, resolve), /Inventário inválido/);
    });

    QUnit.test('11. Caminho Feliz & Casos de Borda: importação de inventário de ficha (importItemsFromSheetInventory) (AAA)', function (assert) {
        // Arrange: maleta 8x6 vazia
        const inv = G.createInventory(8, 6);
        const sheetInventory = [
            { id: 'espada_curta', name: 'Espada Curta', quantity: 1 },
            { id: 'pocao_cura', name: 'Poção', quantity: 2 },
            { itemId: 'adaga_aco', quantity: 1 },
            { id: 'item_inexistente', quantity: 1 } // deve ser ignorado
        ];

        // Act
        const result = G.importItemsFromSheetInventory(inv, sheetInventory, resolve);

        // Assert
        assert.equal(result.importedCount, 4, '4 itens importados (1 espada curta + 2 poções + 1 adaga)');
        assert.equal(result.skippedCount, 1, '1 item inexistente ignorado');
        assert.equal(result.inv.items.length, 4, 'Maleta contém os 4 itens alocados');

        // Casos de Borda: entrada nula ou inválida
        const nullRes = G.importItemsFromSheetInventory(inv, null, resolve);
        assert.equal(nullRes.importedCount, 0, 'Entrada nula retorna 0 importados');
        assert.equal(nullRes.inv, inv, 'Retorna a mesma maleta intacta');

        // Maleta pequena onde apenas um item cabe e o segundo estoura
        const tinyInv = G.createInventory(4, 1); // 4 células em linha
        const largeItems = [
            { id: 'espada_longa', quantity: 2 } // cada uma ocupa 4 células (1x4 ou 4x1)
        ];
        const overflowRes = G.importItemsFromSheetInventory(tinyInv, largeItems, resolve);
        assert.equal(overflowRes.importedCount, 1, 'Primeira espada cabe (rotacionada 4x1)');
        assert.equal(overflowRes.skippedCount, 1, 'Segunda espada não cabe e foi contada como skipped');
    });
});

