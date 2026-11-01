/**
 * Testes de Integração & UI: Conexão Ficha <-> Itens dos Jogadores (+2d6)
 *
 * Valida a união entre as páginas public/items.html, public/formV6.html,
 * os motores src/core/character-inventory-bridge.js, src/core/item-catalog-engine.js
 * e o controlador de interface src/ui/pages/items.js.
 *
 * Estrutura Arrange-Act-Assert (AAA):
 * 1. Validação de Marcação e Elementos DOM do Gerenciador de Itens (items.html)
 * 2. Validação de Integração com o Modo Live Play da Ficha (formV6.html)
 * 3. Validação do Controlador src/ui/pages/items.js (Auth, Sincronia Local e Nuvem)
 * 4. Simulação de Ciclo de Vida: Adicionar do Catálogo, Equipar e Recalcular Defesa (AAA)
 * 5. Simulação de Uso de Consumíveis: Poção restaura PV e atualiza ficha (AAA)
 * 6. Simulação de Transferência entre Personagens com persistência estruturada (AAA)
 * 7. Casos de Borda: Carga Máxima com Atributos Zerados, Sobrecarga e Listas Vazias (AAA)
 * 8. Tratamento de Exceções: Itens inválidos e transferências nulas (AAA)
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const ITEMS_HTML_PATH = path.resolve(__dirname, '../public/items.html');
const ITEMS_JS_PATH = path.resolve(__dirname, '../src/ui/pages/items.js');
const FORM_HTML_PATH = path.resolve(__dirname, '../public/formV6.html');

const CharacterInventoryBridge = require('../src/core/character-inventory-bridge');
const ItemCatalogEngine = require('../src/core/item-catalog-engine');
const CharacterSheetRules = require('../src/core/character-sheet');

QUnit.module('Integração Ficha <-> Inventário de Itens (+2d6 Kuar-Tor)', function () {

    // -------------------------------------------------------------------------
    // 1. Marcação DOM em public/items.html
    // -------------------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: public/items.html deve conter estrutura completa de inventário tático (AAA)', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(ITEMS_HTML_PATH), 'public/items.html deve existir');
        const content = fs.readFileSync(ITEMS_HTML_PATH, 'utf-8');

        // Act & Assert
        // Contrato de autenticação & navegação
        assert.ok(content.includes('id="logout-button"'), 'Deve conter #logout-button');
        assert.notOk(content.includes('style="display: none;"'), 'Não deve ter display: none inline no logout-button');
        assert.ok(content.includes('href="formV6.html"'), 'Deve possuir link para formV6.html');

        // Seleção de Personagem
        assert.ok(content.includes('id="character-selection"'), 'Deve conter #character-selection');
        assert.ok(content.includes('id="character-dropdown"'), 'Deve conter #character-dropdown');
        assert.ok(content.includes('id="no-characters-message"'), 'Deve conter #no-characters-message');

        // Card de Carga & Vitals
        assert.ok(content.includes('id="character-encumbrance-card"'), 'Deve conter #character-encumbrance-card');
        assert.ok(content.includes('id="encumbrance-text"'), 'Deve conter #encumbrance-text');
        assert.ok(content.includes('id="encumbrance-bar"'), 'Deve conter #encumbrance-bar');
        assert.ok(content.includes('id="encumbrance-badge"'), 'Deve conter #encumbrance-badge');

        // Slots Táticos
        assert.ok(content.includes('id="equipped-slots-grid"'), 'Deve conter #equipped-slots-grid');

        // Formulário e Catálogo
        assert.ok(content.includes('id="item-form"'), 'Deve conter #item-form');
        assert.ok(content.includes('id="catalog-quick-select"'), 'Deve conter #catalog-quick-select');
        assert.ok(content.includes('id="itemName"'), 'Deve conter input #itemName');
        assert.ok(content.includes('id="itemType"'), 'Deve conter select #itemType');
        assert.ok(content.includes('id="itemQuantity"'), 'Deve conter input #itemQuantity');
        assert.ok(content.includes('id="add-item-button"'), 'Deve conter #add-item-button');

        // Categorias de Itens
        assert.ok(content.includes('id="list-weapon"'), 'Deve conter #list-weapon');
        assert.ok(content.includes('id="list-armor"'), 'Deve conter #list-armor');
        assert.ok(content.includes('id="list-accessory"'), 'Deve conter #list-accessory');
        assert.ok(content.includes('id="list-consumable"'), 'Deve conter #list-consumable');

        // Modal de Transferência
        assert.ok(content.includes('id="transfer-modal"'), 'Deve conter #transfer-modal');
        assert.ok(content.includes('id="transfer-recipient-select"'), 'Deve conter #transfer-recipient-select');
        assert.ok(content.includes('id="transfer-quantity-input"'), 'Deve conter #transfer-quantity-input');
        assert.ok(content.includes('id="confirm-transfer-btn"'), 'Deve conter #confirm-transfer-btn');

        // Scripts do Core
        assert.ok(content.includes('character-inventory-bridge.js'), 'Deve importar character-inventory-bridge.js');
        assert.ok(content.includes('item-catalog-engine.js'), 'Deve importar item-catalog-engine.js');
    });

    // -------------------------------------------------------------------------
    // 2. Integração com public/formV6.html
    // -------------------------------------------------------------------------
    QUnit.test('2. Caminho Feliz: public/formV6.html integra HUD de Inventário no Modo Live Play e Modo Edição (AAA)', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(FORM_HTML_PATH), 'public/formV6.html deve existir');
        const content = fs.readFileSync(FORM_HTML_PATH, 'utf-8');

        // Act & Assert - Modo Live Play
        assert.ok(content.includes('character-inventory-bridge.js'), 'formV6.html deve importar character-inventory-bridge.js');
        assert.ok(content.includes('id="liveInventorySection"'), 'formV6.html deve ter #liveInventorySection');
        assert.ok(content.includes('id="liveWeightDisplay"'), 'formV6.html deve ter #liveWeightDisplay');
        assert.ok(content.includes('id="liveWeightBar"'), 'formV6.html deve ter #liveWeightBar');
        assert.ok(content.includes('id="liveEncumbranceBadge"'), 'formV6.html deve ter #liveEncumbranceBadge');
        assert.ok(content.includes('id="liveEquippedGrid"'), 'formV6.html deve ter #liveEquippedGrid');
        assert.ok(content.includes('id="liveBackpackGrid"'), 'formV6.html deve ter #liveBackpackGrid');
        assert.ok(content.includes('renderLiveInventory'), 'formV6.html deve implementar renderLiveInventory');

        // Act & Assert - Modo Edição (Inventário Tático Integrado)
        assert.ok(content.includes('id="editModeInventoryContainer"'), 'formV6.html deve ter #editModeInventoryContainer no Modo Edição');
        assert.ok(content.includes('id="editWeightText"'), 'formV6.html deve ter #editWeightText');
        assert.ok(content.includes('id="editWeightBar"'), 'formV6.html deve ter #editWeightBar');
        assert.ok(content.includes('id="editEncumbranceBadge"'), 'formV6.html deve ter #editEncumbranceBadge');
        assert.ok(content.includes('id="editEncumbrancePenalty"'), 'formV6.html deve ter #editEncumbrancePenalty');
        assert.ok(content.includes('id="editEquippedGrid"'), 'formV6.html deve ter #editEquippedGrid');
        assert.ok(content.includes('id="editBackpackGrid"'), 'formV6.html deve ter #editBackpackGrid');
        assert.ok(content.includes('id="customItemDrawer"'), 'formV6.html deve ter #customItemDrawer');
        assert.ok(content.includes('id="equipmentTextCollapse"'), 'formV6.html deve ter #equipmentTextCollapse para retrocompatibilidade');
        assert.ok(content.includes('renderEditModeInventory'), 'formV6.html deve implementar renderEditModeInventory');
        assert.ok(content.includes('syncInventoryToSheetAndDom'), 'formV6.html deve implementar syncInventoryToSheetAndDom');
        assert.ok(content.includes('toggleCustomItemForm'), 'formV6.html deve implementar toggleCustomItemForm');
        assert.ok(content.includes('toggleEquipmentTextEditor'), 'formV6.html deve implementar toggleEquipmentTextEditor');
        assert.ok(content.includes('addCustomItemToSheet'), 'formV6.html deve implementar addCustomItemToSheet');
    });

    // -------------------------------------------------------------------------
    // 3. Controlador src/ui/pages/items.js
    // -------------------------------------------------------------------------
    QUnit.test('3. Caminho Feliz: src/ui/pages/items.js implementa arquitetura unificada (AAA)', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(ITEMS_JS_PATH), 'src/ui/pages/items.js deve existir');
        const content = fs.readFileSync(ITEMS_JS_PATH, 'utf-8');

        // Act & Assert
        assert.ok(content.includes('auth.signOut()'), 'items.js deve chamar auth.signOut()');
        assert.ok(content.includes('window.location.reload()'), 'items.js deve recarregar a janela no logout');
        assert.ok(content.includes('kuar_tor_saved_sheets'), 'items.js deve ler e gravar no localStorage kuar_tor_saved_sheets');
        assert.ok(content.includes('CharacterInventoryBridge.addItem'), 'items.js deve utilizar CharacterInventoryBridge.addItem');
        assert.ok(content.includes('CharacterInventoryBridge.equipItem'), 'items.js deve utilizar CharacterInventoryBridge.equipItem');
        assert.ok(content.includes('CharacterInventoryBridge.useConsumable'), 'items.js deve utilizar CharacterInventoryBridge.useConsumable');
        assert.ok(content.includes('CharacterInventoryBridge.transferItem'), 'items.js deve utilizar CharacterInventoryBridge.transferItem');
    });

    // -------------------------------------------------------------------------
    // 4. Simulação de Ciclo: Adição do Catálogo, Equipar e Recalcular Defesa (AAA)
    // -------------------------------------------------------------------------
    QUnit.test('4. Simulação: Adicionar do Catálogo Oficial, Equipar e Sincronizar Ficha (AAA)', function (assert) {
        // Arrange
        let sheet = {
            charName: 'Sir Galahad',
            des: 3,
            for: 3,
            con: 2,
            equipment: '',
            inventory: []
        };

        const espada = ItemCatalogEngine.getItemById('espada_longa');
        const cota = ItemCatalogEngine.getItemById('cota_malha');

        assert.ok(espada, 'Espada Longa deve existir no catálogo oficial');
        assert.ok(cota, 'Cota de Malha deve existir no catálogo oficial');

        // Act: Adiciona itens ao inventário estruturado
        sheet.inventory = CharacterInventoryBridge.addItem(sheet.inventory, {
            ...espada,
            slot: 'mainHand',
            isEquipped: true
        });
        sheet.inventory = CharacterInventoryBridge.addItem(sheet.inventory, {
            ...cota,
            slot: 'armor',
            isEquipped: true
        });

        // Sincroniza ficha
        CharacterInventoryBridge.syncSheetWithInventory(sheet, sheet.inventory);

        // Assert
        assert.strictEqual(sheet.inventory.length, 2, 'Inventário deve conter 2 itens');
        assert.strictEqual(sheet.equippedArmorBonus, 2, 'Cota de Malha deve conceder 2 de absorção de armadura');
        assert.ok(sheet.equipment.includes('Espada Longa'), 'Texto de equipamento deve conter Espada Longa');
        assert.ok(sheet.equipment.includes('Cota de Malha'), 'Texto de equipamento deve conter Cota de Malha');
        assert.ok(sheet.equipment.includes('[Equipado: Mão Principal]'), 'Deve identificar slot de mão principal');
        assert.ok(sheet.equipment.includes('[Equipado: Armadura]'), 'Deve identificar slot de armadura');
    });

    // -------------------------------------------------------------------------
    // 5. Simulação de Uso de Consumíveis (AAA)
    // -------------------------------------------------------------------------
    QUnit.test('5. Simulação: Consumo de Poção restaura PV e atualiza quantidade (AAA)', function (assert) {
        // Arrange
        const sheet = {
            charName: 'Valeros',
            pontosVida: 20,
            currentHP: 8,
            inventory: [
                { id: 'pocao_cura_1', name: 'Poção de Cura Menor', category: 'Consumível', quantity: 2, weight: 0.3 }
            ]
        };

        // Act
        const result = CharacterInventoryBridge.useConsumable(sheet, 'pocao_cura_1');

        // Assert
        assert.ok(result.success, 'Consumo deve ter sucesso');
        assert.ok(result.amount >= 4 && result.amount <= 9, `Cura deve ser 1d6+3 (veio ${result.amount})`);
        assert.strictEqual(result.updatedSheet.currentHP, 8 + result.amount, 'PV atual deve ser restaurado');
        assert.strictEqual(result.updatedSheet.inventory[0].quantity, 1, 'Quantidade de poções deve diminuir para 1');
    });

    // -------------------------------------------------------------------------
    // 6. Simulação de Transferência entre Personagens (AAA)
    // -------------------------------------------------------------------------
    QUnit.test('6. Simulação: Transferir item de um herói para outro herói (AAA)', function (assert) {
        // Arrange
        const heroiOrigem = {
            charName: 'Guerreiro Thorgar',
            inventory: [
                { id: 'item_tocha', name: 'Tocha', category: 'Aventura', quantity: 5, weight: 0.5 }
            ]
        };
        const heroiDestino = {
            charName: 'Maga Elyria',
            inventory: []
        };

        // Act: Transfere 2 tochas de Thorgar para Elyria
        const result = CharacterInventoryBridge.transferItem(heroiOrigem, heroiDestino, 'item_tocha', 2);

        // Assert
        assert.ok(result.success, 'Transferência deve ser bem sucedida');
        assert.strictEqual(result.senderSheet.inventory[0].quantity, 3, 'Thorgar deve ficar com 3 tochas');
        assert.strictEqual(result.receiverSheet.inventory.length, 1, 'Elyria deve receber a tocha');
        assert.strictEqual(result.receiverSheet.inventory[0].quantity, 2, 'Elyria deve ter 2 tochas');
        assert.strictEqual(result.receiverSheet.inventory[0].isEquipped, false, 'Item transferido deve ir para a mochila');
    });

    // -------------------------------------------------------------------------
    // 7. Casos de Borda: Carga com Atributos Zerados e Sobrecarga (AAA)
    // -------------------------------------------------------------------------
    QUnit.test('7. Casos de Borda: Carga mínima (10kg) e status de Sobrecarga (AAA)', function (assert) {
        // Arrange: Atributos zerados
        const capMinima = CharacterInventoryBridge.calculateCarryCapacity(0, 0);
        assert.strictEqual(capMinima, 10, 'Capacidade nunca deve ser menor que 10kg');

        // Arrange: Carga acima de 100%
        const encOver = CharacterInventoryBridge.getEncumbranceStatus(25, 20);
        assert.strictEqual(encOver.status, 'overburdened', 'Deve detectar sobrecarga');
        assert.strictEqual(encOver.penalty, -2, 'Deve aplicar -2 de penalidade');
        assert.strictEqual(encOver.ratio, 125, 'Ratio deve ser 125%');

        // Arrange: Coleção vazia
        const pesoVazio = CharacterInventoryBridge.calculateTotalWeight([]);
        assert.strictEqual(pesoVazio, 0, 'Peso de lista vazia deve ser 0');
    });

    // -------------------------------------------------------------------------
    // 8. Tratamento de Exceções & Entradas Nulas (AAA)
    // -------------------------------------------------------------------------
    QUnit.test('8. Tratamento de Exceções: Itens nulos e transferências inválidas (AAA)', function (assert) {
        // Act & Assert: addItem com nulo
        assert.throws(function () {
            CharacterInventoryBridge.addItem([], null);
        }, /Item inválido/, 'Deve lançar exceção ao inserir item nulo');

        // Act & Assert: useConsumable com ficha nula
        assert.throws(function () {
            CharacterInventoryBridge.useConsumable(null, 'item_id');
        }, /Ficha ou ID do item inválidos/, 'Deve lançar exceção ao consumir sem ficha');

        // Act & Assert: transferItem com destinatário nulo
        assert.throws(function () {
            CharacterInventoryBridge.transferItem({}, null, 'item_id');
        }, /Parâmetros inválidos/, 'Deve lançar exceção com destinatário nulo');
    });
});
