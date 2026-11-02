/**
 * @file tests/arcane-library-sealing.test.js
 * @description Suíte de Testes Unitários para o Selamento da Biblioteca Arcana (AAA).
 * Valida o estado de selo dos 186 Círculos de Magia, redefinição de descobertas,
 * estatísticas de revelação rúnica e o Enigma Ancestral da Biblioteca Arcana.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const MagicProgressionSystem = require('../src/core/magic-progression-system');
const MagicForgeSystem = require('../src/core/magic-forge-system');
const MagicExplorationSystem = require('../src/core/magic-exploration-system');

const ARVORE_MAGIA_PATH = path.resolve(__dirname, '../public/arvore_magia.html');

QUnit.module('Selamento da Biblioteca Arcana — Mecânicas & Enigmas (AAA)', function () {

    QUnit.test('1. Caminho Feliz: Selamento total da Biblioteca Arcana (186 círculos bloqueados) (AAA)', function (assert) {
        // Arrange
        const mockProgression = MagicProgressionSystem.createProgressionState({
            discovered: { s01: true, s02: true, s03: true, t005: true, t120: true },
            usage: { s01: 4, t005: 8 }
        });

        // Act
        const sealedState = MagicProgressionSystem.sealLibrary(mockProgression);
        const metrics = MagicProgressionSystem.getLibrarySealStatus(sealedState, 186);

        // Assert
        assert.ok(sealedState.isSealed, 'A Biblioteca Arcana deve estar marcada como isSealed');
        assert.ok(sealedState.sealedAt, 'Data e hora do selamento registradas');
        assert.strictEqual(metrics.discoveredCount, 0, 'Zero círculos devem estar descobertos');
        assert.strictEqual(metrics.sealedCount, 186, 'Exatamente 186 círculos devem estar selados');
        assert.strictEqual(metrics.percentageDiscovered, 0, '0% de descoberta');
        assert.ok(metrics.isFullySealed, 'isFullySealed deve retornar verdadeiro');
    });

    QUnit.test('2. Caminho Feliz: Desvelar tomo individual rompe o selo do círculo específico (AAA)', function (assert) {
        // Arrange
        const sealedState = MagicProgressionSystem.sealLibrary(MagicProgressionSystem.createProgressionState());
        assert.notOk(MagicProgressionSystem.isDiscovered(sealedState, 's21'), 's21 começa selado');

        // Act: Encontra e decifra o tomo de Runas & Selos (s21)
        const unsealedOne = MagicProgressionSystem.discoverCircle(sealedState, 's21');
        const metrics = MagicProgressionSystem.getLibrarySealStatus(unsealedOne, 186);

        // Assert
        assert.ok(MagicProgressionSystem.isDiscovered(unsealedOne, 's21'), 'Selo de s21 foi rompido com sucesso');
        assert.strictEqual(metrics.discoveredCount, 1, '1 círculo desvelado');
        assert.strictEqual(metrics.sealedCount, 185, '185 círculos permanecem selados');
        assert.notOk(metrics.isFullySealed, 'Biblioteca não está mais 100% selada');
    });

    QUnit.test('3. Caminho Feliz: Enigma de Masmorra "O Grande Selo da Biblioteca Arcana" (AAA)', function (assert) {
        // Arrange
        const puzzles = MagicForgeSystem.DungeonPuzzleEngine.getPrebuiltDungeonPuzzles();
        const sealPuzzle = puzzles.find(p => p.id === 'puzzle_selo_biblioteca_arcana');

        assert.ok(sealPuzzle, 'Enigma do Selo da Biblioteca Arcana deve existir nos puzzles pré-fabricados');
        assert.strictEqual(sealPuzzle.circleId, 's21', 'Vinculado ao Círculo #21 (Runas & Selos)');
        assert.deepEqual(sealPuzzle.activePaths, ['arkanum'], 'Canal de Arkanum ativo');
        assert.deepEqual(sealPuzzle.missingPaths, ['metamagia'], 'Metamagia é a contra-chave faltante');

        // Act 1: Tentativa com elemento incorreto
        const failAttempt = MagicForgeSystem.DungeonPuzzleEngine.attemptUnlockDoor(sealPuzzle, ['fogo']);
        assert.notOk(failAttempt.success, 'Fogo não resolve o selo arcano da biblioteca');
        assert.ok(failAttempt.triggeredTrap, 'Aciona armadilha de choque elemental');

        // Act 2: Tentativa com o elemento correto (Metamagia)
        const successAttempt = MagicForgeSystem.DungeonPuzzleEngine.attemptUnlockDoor(sealPuzzle, ['metamagia']);
        assert.ok(successAttempt.success, 'Metamagia rompe o selo dos portões da Biblioteca');
        assert.ok(sealPuzzle.isSolved, 'Enigma marcado como superado');
    });

    QUnit.test('4. Caminho Feliz: Travessia até o "Arquivo Proibido da Biblioteca Arcana" na Masmorra (AAA)', function (assert) {
        // Arrange
        const dungeon = MagicExplorationSystem.ArcaneDungeonMapEngine.getPrebuiltDungeon();
        const libraryRoom = dungeon.rooms.find(r => r.id === 'sala_biblioteca_selada');

        assert.ok(libraryRoom, 'Sala da Biblioteca Selada deve existir na masmorra');
        assert.deepEqual(libraryRoom.requiredPaths, ['arkanum', 'metamagia'], 'Requer Arkanum e Metamagia');

        // Act 1: Tenta entrar sem ter Metamagia
        const blocked = MagicExplorationSystem.ArcaneDungeonMapEngine.attemptTraverseRoom(dungeon, 'sala_biblioteca_selada', ['arkanum']);
        assert.notOk(blocked.success, 'Travessia deve ser barrada');
        assert.ok(blocked.reason.includes('metamagia'), 'Explica que falta o conduto de metamagia');

        // Act 2: Tenta entrar possuindo ambos os caminhos requeridos
        const entered = MagicExplorationSystem.ArcaneDungeonMapEngine.attemptTraverseRoom(dungeon, 'sala_biblioteca_selada', ['arkanum', 'metamagia']);
        assert.ok(entered.success, 'Entrada permitida no Arquivo Proibido');
        assert.strictEqual(dungeon.currentRoomId, 'sala_biblioteca_selada', 'Localização atualizada');
        assert.ok(entered.reward.includes('Tomo Perdido'), 'Concede recompensa de tomo para o compêndio');
    });

    QUnit.test('5. Casos de Borda: Interface arvore_magia.html contém todos os controles do Selo (AAA)', function (assert) {
        // Arrange
        const content = fs.readFileSync(ARVORE_MAGIA_PATH, 'utf-8');

        // Assert
        assert.ok(content.includes('sealArcaneLibraryUI'), 'Função sealArcaneLibraryUI presente');
        assert.ok(content.includes('unsealArcaneLibraryUI'), 'Função unsealArcaneLibraryUI presente');
        assert.ok(content.includes('decipherRandomTomeUI'), 'Função decipherRandomTomeUI presente');
        assert.ok(content.includes('updateSealStatusUI'), 'Função updateSealStatusUI presente');
        assert.ok(content.includes('library-seal-status-badge'), 'Badge visual de status do selo presente');
        assert.ok(content.includes('library-seal-progress-fill'), 'Barra de progresso de revelação presente');
        assert.ok(content.includes('circle-sealed-card') || content.includes('Selo Arcano'), 'Estilização de card selado presente');
    });
});
