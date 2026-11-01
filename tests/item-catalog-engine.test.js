/**
 * @file tests/item-catalog-engine.test.js
 * @description Suíte de Testes Unitários: ItemCatalogEngine (Inventário & Equipamentos +2d6)
 * Padrão: Arrange-Act-Assert (AAA)
 */

const QUnit = require('qunit');
const ItemCatalogEngine = require('../src/core/item-catalog-engine');
const LiveSheetController = require('../src/core/live-sheet-controller');

QUnit.module('ItemCatalogEngine — Catálogo de Itens & Integração de Inventário', function () {

    // -------------------------------------------------------------
    // 1. Caminho Feliz: Catálogo e Busca de Itens
    // -------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: Obter catálogo e buscar por ID (AAA)', function (assert) {
        // Arrange
        const expectedMinItems = 12;

        // Act
        const allItems = ItemCatalogEngine.getAllItems();
        const sword = ItemCatalogEngine.getItemById('espada_longa');
        const shield = ItemCatalogEngine.getItemById('escudo_aco');

        // Assert
        assert.ok(Array.isArray(allItems), 'Retorna lista de itens');
        assert.ok(allItems.length >= expectedMinItems, 'Catálogo completo presente');
        assert.equal(sword.name, 'Espada Longa', 'Nome da espada');
        assert.equal(sword.damage, '1d6+2', 'Dano da espada');
        assert.equal(shield.defenseBonus, 2, 'Bônus de defesa do escudo');
    });

    QUnit.test('2. Caminho Feliz: Filtros por Categoria e Busca Textual (AAA)', function (assert) {
        // Arrange
        const optArmas = { category: 'Armas' };
        const optSearch = { search: 'Sangue Vital' };

        // Act
        const armas = ItemCatalogEngine.filterItems(optArmas);
        const potion = ItemCatalogEngine.filterItems(optSearch);

        // Assert
        assert.ok(armas.length >= 6, 'Retorna armas brancas e de disparo');
        assert.equal(potion.length, 1, 'Encontra a poção de sangue vital');
        assert.equal(potion[0].category, 'Consumíveis', 'Categoria consumível');
    });

    // -------------------------------------------------------------
    // 2. Caminho Feliz: Integração com Ficha de Personagem
    // -------------------------------------------------------------
    QUnit.test('3. Caminho Feliz: Adicionar Arma à Ficha e Compatibilidade com LiveSheetController (AAA)', function (assert) {
        // Arrange
        const initialSheet = {
            charName: 'Herói Teste',
            for: 3,
            des: 2,
            equipment: 'Mochila de couro'
        };

        // Act - Adicionar Espada Longa
        const updated = ItemCatalogEngine.addItemToSheet(initialSheet, 'espada_longa');
        // Extrair cartões de ataque usando o LiveSheetController
        const attackCards = LiveSheetController.extractAttackCards(updated, []);

        // Assert
        assert.ok(updated.equipment.includes('Espada Longa (dano: 1d6+2)'), 'Linha formatada de arma incluída no equipamento');
        assert.ok(attackCards.some(a => a.name === 'Espada Longa'), 'Espada Longa detectada como cartão de ataque');
        const swordCard = attackCards.find(a => a.name === 'Espada Longa');
        assert.equal(swordCard.damageFormula, '1d6+2', 'Fórmula de dano compatível');
    });

    QUnit.test('4. Caminho Feliz: Adicionar e Remover Itens do Equipamento (AAA)', function (assert) {
        // Arrange
        const sheet = { equipment: 'Adaga de Aço (dano: 1d6)\nTocha Rúnica Inextinguível' };

        // Act
        const afterAdd = ItemCatalogEngine.addItemToSheet(sheet, 'pocao_cura');
        const afterRemove = ItemCatalogEngine.removeItemFromSheet(afterAdd, 'Adaga de Aço');

        // Assert
        assert.ok(afterAdd.equipment.includes('Poção de Sangue Vital'), 'Poção adicionada');
        assert.notOk(afterRemove.equipment.includes('Adaga de Aço'), 'Adaga removida');
        assert.ok(afterRemove.equipment.includes('Poção de Sangue Vital'), 'Poção preservada');
        assert.ok(afterRemove.equipment.includes('Tocha Rúnica'), 'Tocha preservada');
    });

    QUnit.test('5. Caminho Feliz: Cálculo de Armadura e Bônus de Defesa Equipados (AAA)', function (assert) {
        // Arrange
        const sheetWithArmor = {
            equipment: 'Armadura Completa de Placas\nEscudo de Aço Forjado'
        };

        // Act
        const stats = ItemCatalogEngine.calculateEquippedDefenseAndArmor(sheetWithArmor);

        // Assert
        assert.equal(stats.totalDefenseBonus, 2, 'Escudo concede +2 Defesa Passiva');
        assert.equal(stats.totalArmorReduction, 3, 'Armadura de placas absorve 3 de dano');
        assert.equal(stats.penalties, -2, 'Penalidade de -2 em Destreza');
    });

    // -------------------------------------------------------------
    // 3. Casos de Borda e Exceções
    // -------------------------------------------------------------
    QUnit.test('6. Casos de Borda & Exceções: Itens nulos ou inexistentes (AAA)', function (assert) {
        // Arrange & Act
        const invalidItem = ItemCatalogEngine.getItemById('item_fantasma_123');

        // Assert
        assert.equal(invalidItem, null, 'Retorna null para item inexistente');
        assert.throws(
            () => ItemCatalogEngine.addItemToSheet({}, null),
            /inválido/i,
            'Lança exceção clara para item nulo'
        );
    });
});
