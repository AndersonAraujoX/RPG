/**
 * Testes Unitários: CharacterInventoryBridge (+2d6)
 *
 * Estrutura Arrange-Act-Assert (AAA):
 * 1. Cálculo de Carga Máxima e Peso Total
 * 2. Status de Sobrecarga e Penalidades
 * 3. Adicionar, Remover e Acumular Itens
 * 4. Equipar e Desequipar com Troca Inteligente de Slots
 * 5. Consumo de Itens (Poções de Cura e Energia) com Atualização da Ficha
 * 6. Transferência de Itens entre Personagens
 * 7. Sincronia Bidirecional Ficha <-> Inventário e Parser Legado
 * 8. Casos de Borda e Tratamento de Exceções
 */

const QUnit = require('qunit');
const CharacterInventoryBridge = require('../src/core/character-inventory-bridge');

QUnit.module('CharacterInventoryBridge — Sistema Conector de Fichas e Itens', function () {

    // -------------------------------------------------------------------------
    // 1. Caminho Feliz: Capacidade de Carga e Peso
    // -------------------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: Cálculo de Carga Máxima e Peso Total (AAA)', function (assert) {
        // Arrange
        const forca = 3;
        const constituicao = 2;
        const inventory = [
            { name: 'Espada Longa', weight: 1.8, quantity: 1 },
            { name: 'Cota de Malha', weight: 12.0, quantity: 1 },
            { name: 'Tocha', weight: 0.5, quantity: 4 }
        ];

        // Act
        const maxCapacity = CharacterInventoryBridge.calculateCarryCapacity(forca, constituicao);
        const totalWeight = CharacterInventoryBridge.calculateTotalWeight(inventory);

        // Assert
        // (FOR 3 * 5) + (CON 2 * 2) = 15 + 4 = 19 kg
        assert.strictEqual(maxCapacity, 19, 'Carga máxima deve ser (3*5)+(2*2) = 19kg');
        // 1.8 + 12.0 + (0.5 * 4 = 2.0) = 15.8 kg
        assert.strictEqual(totalWeight, 15.8, 'Peso total deve ser 15.8kg');
    });

    // -------------------------------------------------------------------------
    // 2. Caminho Feliz: Status de Sobrecarga
    // -------------------------------------------------------------------------
    QUnit.test('2. Caminho Feliz: Detecção de Sobrecarga e Penalidades (AAA)', function (assert) {
        // Arrange
        const maxWeight = 20;

        // Act
        const lightStatus = CharacterInventoryBridge.getEncumbranceStatus(10, maxWeight);
        const heavyStatus = CharacterInventoryBridge.getEncumbranceStatus(17, maxWeight);
        const overburdenedStatus = CharacterInventoryBridge.getEncumbranceStatus(25, maxWeight);

        // Assert
        assert.strictEqual(lightStatus.status, 'light', '50% do peso deve ser carga leve');
        assert.strictEqual(lightStatus.penalty, 0, 'Sem penalidades para carga leve');

        assert.strictEqual(heavyStatus.status, 'heavy', '85% do peso deve ser carga pesada');
        assert.strictEqual(heavyStatus.penalty, 0, 'Carga pesada ainda não aplica penalidade direta');

        assert.strictEqual(overburdenedStatus.status, 'overburdened', '125% do peso deve ser sobrecarregado');
        assert.strictEqual(overburdenedStatus.penalty, -2, 'Sobrecarregado deve aplicar -2 em testes e defesa');
    });

    // -------------------------------------------------------------------------
    // 3. Caminho Feliz: Adicionar, Acumular e Remover Itens
    // -------------------------------------------------------------------------
    QUnit.test('3. Caminho Feliz: Adicionar, Acumular e Remover Itens (AAA)', function (assert) {
        // Arrange
        let inventory = [];
        const potion = { id: 'pot_1', name: 'Poção de Cura', category: 'Consumível', quantity: 2, weight: 0.3 };
        const shield = { id: 'shd_1', name: 'Escudo Pesado', category: 'Escudos', quantity: 1, weight: 3.0 };

        // Act: Adiciona itens
        inventory = CharacterInventoryBridge.addItem(inventory, potion);
        inventory = CharacterInventoryBridge.addItem(inventory, shield);

        // Assert
        assert.strictEqual(inventory.length, 2, 'Inventário deve ter 2 itens distintos');
        assert.strictEqual(inventory[0].quantity, 2, 'Quantidade inicial da poção deve ser 2');

        // Act: Acumular mesmo consumível
        inventory = CharacterInventoryBridge.addItem(inventory, { name: 'Poção de Cura', category: 'Consumível', quantity: 3 });

        // Assert
        assert.strictEqual(inventory.length, 2, 'Não deve criar linha duplicada para consumível com mesmo nome');
        assert.strictEqual(inventory[0].quantity, 5, 'Quantidade acumulada deve ser 2 + 3 = 5');

        // Act: Remover quantidade parcial e total
        inventory = CharacterInventoryBridge.removeItem(inventory, 'shd_1', 1);

        // Assert
        assert.strictEqual(inventory.length, 1, 'Escudo deve ter sido completamente removido');
        assert.strictEqual(inventory[0].id, 'pot_1', 'Apenas a poção deve permanecer');
    });

    // -------------------------------------------------------------------------
    // 4. Caminho Feliz: Equipar e Desequipar com Troca de Slots
    // -------------------------------------------------------------------------
    QUnit.test('4. Caminho Feliz: Equipar e Desequipar Itens em Slots (AAA)', function (assert) {
        // Arrange
        let inventory = [
            { id: 'w1', name: 'Espada Curta', category: 'Armas', slot: 'backpack', isEquipped: false },
            { id: 'w2', name: 'Machado de Guerra', category: 'Armas', slot: 'backpack', isEquipped: false },
            { id: 'a1', name: 'Armadura de Couro', category: 'Armaduras', slot: 'backpack', isEquipped: false }
        ];

        // Act: Equipar Espada Curta na Mão Principal
        inventory = CharacterInventoryBridge.equipItem(inventory, 'w1', CharacterInventoryBridge.SLOTS.MAIN_HAND);

        // Assert
        assert.strictEqual(inventory[0].isEquipped, true, 'Espada Curta deve estar equipada');
        assert.strictEqual(inventory[0].slot, 'mainHand', 'Slot da Espada Curta deve ser mainHand');

        // Act: Equipar Machado na mesma mão principal (deve desequipar a espada curta)
        inventory = CharacterInventoryBridge.equipItem(inventory, 'w2', CharacterInventoryBridge.SLOTS.MAIN_HAND);

        // Assert
        assert.strictEqual(inventory[0].isEquipped, false, 'Espada Curta deve ter sido desequipada');
        assert.strictEqual(inventory[0].slot, 'backpack', 'Espada Curta deve voltar para a mochila');
        assert.strictEqual(inventory[1].isEquipped, true, 'Machado de Guerra deve ser o novo item equipado');
        assert.strictEqual(inventory[1].slot, 'mainHand', 'Machado deve ocupar a mão principal');

        // Act: Desequipar o Machado
        inventory = CharacterInventoryBridge.unequipItem(inventory, 'w2');

        // Assert
        assert.strictEqual(inventory[1].isEquipped, false, 'Machado deve ser desequipado');
        assert.strictEqual(inventory[1].slot, 'backpack', 'Machado deve ir para a mochila');
    });

    // -------------------------------------------------------------------------
    // 5. Caminho Feliz: Uso de Consumíveis (Poções de Cura e Energia)
    // -------------------------------------------------------------------------
    QUnit.test('5. Caminho Feliz: Uso de Consumíveis atualiza PV/PE na Ficha (AAA)', function (assert) {
        // Arrange
        const sheet = {
            charName: 'Kaelen',
            pontosVida: 20,
            currentHP: 10, // Ferido
            pontosEnergia: 12,
            currentPE: 4,  // Esgotado
            inventory: [
                { id: 'pot_hp', name: 'Poção de Cura Rúnica', category: 'Consumível', quantity: 2 },
                { id: 'pot_pe', name: 'Elixir de Energia do Vazio', category: 'Consumível', quantity: 1 }
            ]
        };

        // Act: Consumir Poção de Cura
        const hpRes = CharacterInventoryBridge.useConsumable(sheet, 'pot_hp');

        // Assert
        assert.ok(hpRes.success, 'Consumo de poção deve ter sucesso');
        assert.strictEqual(hpRes.recoveryType, 'HP', 'Tipo de recuperação deve ser HP');
        assert.strictEqual(hpRes.formula, '1d6+3', 'Fórmula de recuperação de HP deve ser 1d6+3');
        assert.ok(hpRes.amount >= 4 && hpRes.amount <= 9, 'Quantidade curada deve estar na faixa de 1d6+3');
        assert.ok(hpRes.updatedSheet.currentHP > 10, 'PV atual deve ter aumentado');
        assert.strictEqual(hpRes.updatedSheet.inventory.find(i => i.id === 'pot_hp').quantity, 1, 'Quantidade restante de poções deve ser 1');

        // Act: Consumir Elixir de PE
        const peRes = CharacterInventoryBridge.useConsumable(hpRes.updatedSheet, 'pot_pe');

        // Assert
        assert.ok(peRes.success, 'Consumo de elixir deve ter sucesso');
        assert.strictEqual(peRes.recoveryType, 'PE', 'Tipo de recuperação deve ser PE');
        assert.strictEqual(peRes.formula, '1d6+2', 'Fórmula de recuperação de PE deve ser 1d6+2');
        assert.ok(peRes.amount >= 3 && peRes.amount <= 8, 'Quantidade de PE recuperada deve ser 1d6+2');
        assert.ok(peRes.updatedSheet.currentPE > 4, 'PE atual deve ter aumentado');
        assert.notOk(peRes.updatedSheet.inventory.some(i => i.id === 'pot_pe'), 'Elixir com qtd 1 consumido deve ser removido do inventário');
    });

    // -------------------------------------------------------------------------
    // 6. Caminho Feliz: Transferência de Itens entre Personagens
    // -------------------------------------------------------------------------
    QUnit.test('6. Caminho Feliz: Transferência de Itens entre Personagens (AAA)', function (assert) {
        // Arrange
        const sender = {
            charName: 'Arthur',
            inventory: [
                { id: 'gem_1', name: 'Gema do Vazio', quantity: 5, weight: 0.1 }
            ]
        };
        const receiver = {
            charName: 'Lyra',
            inventory: []
        };

        // Act: Transfere 2 gemas de Arthur para Lyra
        const res = CharacterInventoryBridge.transferItem(sender, receiver, 'gem_1', 2);

        // Assert
        assert.ok(res.success, 'Transferência deve ser bem sucedida');
        assert.strictEqual(res.senderSheet.inventory[0].quantity, 3, 'Arthur deve ficar com 3 gemas (5 - 2)');
        assert.strictEqual(res.receiverSheet.inventory[0].quantity, 2, 'Lyra deve receber 2 gemas');
        assert.strictEqual(res.receiverSheet.inventory[0].name, 'Gema do Vazio', 'Nome do item transferido preservado');
    });

    // -------------------------------------------------------------------------
    // 7. Caminho Feliz: Sincronia com Ficha e Parser Legado
    // -------------------------------------------------------------------------
    QUnit.test('7. Caminho Feliz: Sincronia Ficha <-> Inventário e Parser Legado (AAA)', function (assert) {
        // Arrange: Inventário estruturado com armas e armaduras
        const sheet = { charName: 'Guerreiro' };
        const inventory = [
            { id: 'i1', name: 'Espada Longa', slot: 'mainHand', isEquipped: true, damage: '1d6+2', attackBonus: 1 },
            { id: 'i2', name: 'Escudo de Madeira', slot: 'offHand', isEquipped: true, defenseBonus: 1 },
            { id: 'i3', name: 'Cota de Malha', slot: 'armor', isEquipped: true, armorValue: 2 },
            { id: 'i4', name: 'Ração de Viagem', slot: 'backpack', isEquipped: false, quantity: 3 }
        ];

        // Act: Sincronizar Ficha
        const synced = CharacterInventoryBridge.syncSheetWithInventory(sheet, inventory);

        // Assert
        assert.strictEqual(synced.equippedArmorBonus, 2, 'Bônus de armadura equipada deve ser 2');
        assert.strictEqual(synced.equippedDefenseBonus, 1, 'Bônus de defesa equipada deve ser 1');
        assert.ok(synced.equipment.includes('Espada Longa (dano: 1d6+2)'), 'Texto do equipamento deve conter arma formatada');
        assert.ok(synced.equipment.includes('Mochila: Ração de Viagem (3x)'), 'Texto deve conter itens da mochila');

        // Act: Converter texto legado de volta em itens estruturados
        const legacyText = 'Espada Longa (dano: 1d6+2), Tocha (3x), Corda de Seda';
        const parsedItems = CharacterInventoryBridge.parseEquipmentTextToInventory(legacyText);

        // Assert
        assert.ok(parsedItems.length >= 3, 'Deve extrair os 3 itens do texto livre');
        assert.ok(parsedItems.some(i => i.name.includes('Espada Longa')), 'Deve reconhecer Espada Longa');
        assert.ok(parsedItems.some(i => i.name.includes('Tocha') && i.quantity === 3), 'Deve capturar quantidade da Tocha (3x)');
    });

    // -------------------------------------------------------------------------
    // 8. Casos de Borda e Tratamento de Exceções
    // -------------------------------------------------------------------------
    QUnit.test('8. Casos de Borda: Entradas Nulas, Vazias e Limites (AAA)', function (assert) {
        // Arrange
        const emptySheet = { inventory: [] };

        // Act & Assert: Capacidade mínima para atributos zerados ou negativos
        const minCapacity = CharacterInventoryBridge.calculateCarryCapacity(0, -5);
        assert.strictEqual(minCapacity, 10, 'Capacidade mínima deve ser sempre 10kg');

        // Act & Assert: Peso total com lista nula ou vazia
        assert.strictEqual(CharacterInventoryBridge.calculateTotalWeight(null), 0, 'Peso de lista nula deve ser 0');
        assert.strictEqual(CharacterInventoryBridge.calculateTotalWeight([]), 0, 'Peso de lista vazia deve ser 0');

        // Act & Assert: Adicionar item nulo deve disparar erro
        assert.throws(
            () => CharacterInventoryBridge.addItem([], null),
            /Item inválido/,
            'Item nulo deve lançar exceção'
        );

        // Act & Assert: Consumo com item inexistente
        const nonExistentRes = CharacterInventoryBridge.useConsumable(emptySheet, 'nao_existe');
        assert.strictEqual(nonExistentRes.success, false, 'Item inexistente não pode ser consumido');

        // Act & Assert: Transferência com parâmetros inválidos deve disparar erro
        assert.throws(
            () => CharacterInventoryBridge.transferItem(null, null, 'item_x'),
            /Parâmetros inválidos/,
            'Transferência sem ficha deve lançar exceção'
        );
    });
});
