/**
 * @file character-sync-firestore.test.js
 * @description Suíte de testes unitários para a sincronização de Fichas de Personagem e
 * transações atômicas de inventário no Cloud Firestore.
 * Segue o padrão Arrange-Act-Assert (AAA), cobrindo caminho feliz, casos de borda e tratamento de erros.
 */

const QUnit = require('qunit');
const FirestoreService = require('../src/modules/firestore-service.js');

QUnit.module('Firestore Character & Inventory Sync', function () {

    // =========================================================================
    // 1. Payloads de Ficha de Personagem
    // =========================================================================

    QUnit.test('1. Montagem de Ficha de Personagem Completa (Caminho Feliz)', function (assert) {
        // Arrange
        const rawData = {
            id: 'char_arthur_1',
            name: 'Arthur Lâmina Flamejante',
            concept: 'Paladino Cyber-Arcano',
            forVal: 4,
            des: 3,
            con: 3,
            intVal: 2,
            car: 2,
            vont: 3,
            per: 2,
            pv: 22,
            maxPv: 22,
            pe: 10,
            maxPe: 10,
            rd: 3,
            inventory: [{ id: 'i1', name: 'Espada Longa', quantity: 1, type: 'weapon' }],
            avatar: 'https://example.com/avatar.jpg'
        };

        // Act
        const character = FirestoreService.buildCharacterPayload(rawData, 'user_uid_456');

        // Assert
        assert.equal(character.id, 'char_arthur_1', 'ID do personagem deve ser mantido');
        assert.equal(character.ownerUid, 'user_uid_456', 'ownerUid deve ser atribuído corretamente');
        assert.equal(character.name, 'Arthur Lâmina Flamejante', 'Nome deve ser sanitizado');
        assert.equal(character.attributes.forVal, 4, 'Força deve ser número 4');
        assert.equal(character.attributes.des, 3, 'Destreza deve ser número 3');
        assert.equal(character.combatStats.pv, 22, 'PV deve ser 22');
        assert.equal(character.combatStats.rd, 3, 'RD deve ser 3');
        assert.equal(character.inventory.length, 1, 'Inventário deve conter 1 item');
        assert.ok(character.updatedAt, 'Timestamp de atualização deve existir');
    });

    QUnit.test('2. Tratamento de Atributos e Campos Ausentes/Nulos (Casos de Borda)', function (assert) {
        // Arrange
        const incompleteData = {
            name: '   ', // Espaços em branco
            attributes: null,
            combatStats: null,
            inventory: null
        };

        // Act
        const character = FirestoreService.buildCharacterPayload(incompleteData, null);

        // Assert
        assert.equal(character.name, 'Herói Sem Nome', 'Nome vazio deve receber fallback');
        assert.equal(character.ownerUid, 'anon', 'UID nulo deve ter fallback anon');
        assert.equal(character.attributes.forVal, 1, 'Força deve ter valor padrão 1');
        assert.equal(character.combatStats.pv, 12, 'PV deve ter valor padrão 12');
        assert.deepEqual(character.inventory, [], 'Inventário nulo deve ser convertido em array vazio');
    });

    // =========================================================================
    // 2. Transações Atômicas de Transferência de Itens
    // =========================================================================

    QUnit.test('3. Transferência Atômica de Item Total (Caminho Feliz)', function (assert) {
        // Arrange
        const sourceInv = [
            { id: 'item_1', name: 'Poção de Cura', quantity: 1, type: 'consumable' },
            { id: 'item_2', name: 'Tocha', quantity: 3, type: 'consumable' }
        ];
        const targetInv = [
            { id: 'item_3', name: 'Corda', quantity: 1, type: 'other' }
        ];

        // Act: Transferir a Poção de Cura (Qtd 1) do source para o target
        const result = FirestoreService.transferItemTransaction(sourceInv, targetInv, 'item_1', 1);

        // Assert
        assert.true(result.success, 'A transferência deve ser bem sucedida');
        assert.equal(result.sourceInventory.length, 1, 'Origem deve ter apenas 1 item restante');
        assert.notOk(result.sourceInventory.find(i => i.id === 'item_1'), 'Poção deve ser removida da origem');
        assert.equal(result.targetInventory.length, 2, 'Destino deve ter 2 itens agora');
        assert.ok(result.targetInventory.find(i => i.name === 'Poção de Cura'), 'Poção deve constar no destino');
        assert.equal(result.transferredItem.name, 'Poção de Cura', 'Item transferido deve ser retornado no relatório');
    });

    QUnit.test('4. Transferência Parcial de Quantidade e Agrupamento no Destino', function (assert) {
        // Arrange: Origem tem 5 Flechas, Destino já tem 2 Flechas
        const sourceInv = [
            { id: 'item_arrows', name: 'Flecha Élfica', quantity: 5, type: 'weapon' }
        ];
        const targetInv = [
            { id: 'item_arrows_target', name: 'Flecha Élfica', quantity: 2, type: 'weapon' }
        ];

        // Act: Transferir 3 Flechas
        const result = FirestoreService.transferItemTransaction(sourceInv, targetInv, 'item_arrows', 3);

        // Assert
        assert.true(result.success, 'Transferência parcial deve ter sucesso');
        assert.equal(result.sourceInventory[0].quantity, 2, 'Origem deve ficar com 2 flechas (5 - 3)');
        assert.equal(result.targetInventory[0].quantity, 5, 'Destino deve somar para 5 flechas (2 + 3)');
    });

    QUnit.test('5. Tratamento de Erros: Item Inexistente ou Quantidades Inválidas (Tratamento de Exceções)', function (assert) {
        // Arrange
        const sourceInv = [{ id: 'item_gem', name: 'Rubi', quantity: 1, type: 'accessory' }];
        const targetInv = [];

        // Act 1: Tentar transferir item que não existe na origem
        const resMissing = FirestoreService.transferItemTransaction(sourceInv, targetInv, 'item_inexistente', 1);

        // Assert 1
        assert.false(resMissing.success, 'Deve falhar se o item não existir');
        assert.ok(resMissing.error.includes('não encontrado'), 'Mensagem de erro deve ser clara');

        // Act 2: Tentar transferir com inventários nulos
        const resNull = FirestoreService.transferItemTransaction(null, targetInv, 'item_gem', 1);

        // Assert 2
        assert.false(resNull.success, 'Deve falhar com inventário nulo');
        assert.ok(resNull.error.includes('inválidos'), 'Deve reportar inventários inválidos');
    });

    // =========================================================================
    // 3. Grimório Arcana Cloud Payload
    // =========================================================================

    QUnit.test('6. Montagem de Documento do Grimório Arcana', function (assert) {
        // Arrange
        const unlocked = ['fogo_criar', 'fogo_controlar', 'ar_criar'];
        const fusions = [{ name: 'Tempestade de Plasma', paths: ['fogo', 'ar'] }];
        const spentXp = 15;

        // Act
        const grimoire = FirestoreService.buildGrimoirePayload('user_mage_789', unlocked, spentXp, fusions);

        // Assert
        assert.equal(grimoire.ownerUid, 'user_mage_789', 'ownerUid deve ser gravado');
        assert.equal(grimoire.spentXp, 15, 'XP gasto deve ser 15');
        assert.equal(grimoire.unlockedSpells.length, 3, 'Deve conter 3 magias desbloqueadas');
        assert.equal(grimoire.customFusions.length, 1, 'Deve conter 1 fusão personalizada');
        assert.ok(grimoire.updatedAt, 'Timestamp deve estar presente');
    });

});
