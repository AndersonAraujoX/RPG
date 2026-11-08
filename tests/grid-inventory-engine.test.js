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

    QUnit.test('6. Caminho Feliz: estatísticas, capacidade por FOR e imutabilidade (AAA)', function (assert) {
        // Arrange
        const inv = G.createInventory(8, 5);

        // Act
        const next = G.autoPlace(inv, get('pocao_cura'), resolve);
        const stats = G.getStats(next, resolve);

        // Assert
        assert.equal(inv.items.length, 0, 'Estado original não foi mutado');
        assert.equal(stats.usedCells, 1);
        assert.equal(stats.freeCells, 39);
        assert.equal(stats.weight, 0.3);
        assert.deepEqual(G.capacityFromStrength(4), { cols: 8, rows: 8 });
        assert.deepEqual(G.capacityFromStrength(99), { cols: 8, rows: 8 }, 'FOR limitado a 4');
        assert.deepEqual(G.capacityFromStrength(null), { cols: 8, rows: 4 }, 'Nulo vira 0');
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
    });
});
