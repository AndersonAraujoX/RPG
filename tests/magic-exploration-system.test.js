/**
 * ============================================================================
 * Suíte de Testes Unitários — Sistema de Exploração e Puzzles Arcanos (AAA)
 * 
 * Cobertura:
 * 1. Portas com Mais de Um Selo (Acendimento Sequencial e Armadilhas)
 * 2. Enigmas por Dedução & Gerador de Puzzles Aleatórios
 * 3. Mapa de Masmorra com Salas Mágicas (Travessia baseada em Caminhos)
 * ============================================================================
 */

const QUnit = require('qunit');
const MagicExplorationSystem = require('../src/core/magic-exploration-system');

const { MultiSealDoorEngine, DeductionPuzzleEngine, ArcaneDungeonMapEngine } = MagicExplorationSystem;

QUnit.module('Exploração: Portas com Múltiplos Selos (AAA)', function () {

    QUnit.test('1. Caminho Feliz: Acendimento sequencial correto dos selos até destravar o portal', function (assert) {
        // Arrange
        const sequence = [
            { id: 's03', name: 'Magma' },
            { id: 's62', name: 'Necromancia' },
            { id: 't005', name: 'Cataclismo' }
        ];
        const door = MultiSealDoorEngine.createMultiSealDoor('door_01', 'Portal dos Três Selos', sequence);

        // Act: Ativa selo 1 (Magma)
        const step1 = MultiSealDoorEngine.activateSealStep(door, 's03');
        // Act: Ativa selo 2 (Necromancia)
        const step2 = MultiSealDoorEngine.activateSealStep(door, 's62');
        // Act: Ativa selo 3 (Cataclismo)
        const step3 = MultiSealDoorEngine.activateSealStep(door, 't005');

        // Assert
        assert.ok(step1.success && !step1.doorOpened, 'Selo 1 aceso sem abrir a porta ainda');
        assert.strictEqual(step1.currentStep, 1, 'Passo 1 concluído com sucesso');
        assert.ok(step2.success && !step2.doorOpened, 'Selo 2 aceso com sucesso');
        assert.strictEqual(step2.currentStep, 2, 'Passo 2 concluído com sucesso');
        assert.ok(step3.success && step3.doorOpened, 'Selo 3 abre a porta totalmente');
        assert.ok(door.isUnlocked, 'Estado da porta deve ser destrancado');
    });

    QUnit.test('2. Casos de Borda: Selo fora de ordem aciona armadilha e reseta o progresso', function (assert) {
        // Arrange
        const sequence = [
            { id: 's03', name: 'Magma' },
            { id: 's62', name: 'Necromancia' }
        ];
        const door = MultiSealDoorEngine.createMultiSealDoor('door_02', 'Portal Protetor', sequence, { trapDamage: '3d6 de Fogo' });

        // Act: Acende selo 1 corretamente
        MultiSealDoorEngine.activateSealStep(door, 's03');
        // Act: Tenta selo incorreto (esperava s62, mandou t005)
        const wrongAttempt = MultiSealDoorEngine.activateSealStep(door, 't005');

        // Assert
        assert.notOk(wrongAttempt.success, 'Tentativa errada deve falhar');
        assert.ok(wrongAttempt.triggeredTrap, 'Armadilha deve ser disparada');
        assert.strictEqual(wrongAttempt.trapDamage, '3d6 de Fogo', 'Dano da armadilha reportado');
        assert.strictEqual(door.currentStep, 0, 'Progresso é resetado para 0');
    });

    QUnit.test('3. Tratamento de Exceções: Criação com menos de 2 selos ou dados nulos lança erro', function (assert) {
        assert.throws(() => MultiSealDoorEngine.createMultiSealDoor('d', 't', [{ id: 's01' }]), /pelo menos 2 círculos/);
        assert.throws(() => MultiSealDoorEngine.activateSealStep(null, 's01'), /Estado de porta inválido/);
    });
});

QUnit.module('Exploração: Enigmas por Dedução e Gerador Aleatório (AAA)', function () {

    const mockCatalog = [
        { id: 's03', name: 'Magma', tier: 'SECUNDUS', paths: ['fogo', 'terra'] },
        { id: 's02', name: 'Plasma', tier: 'SECUNDUS', paths: ['fogo', 'ar'] },
        { id: 't005', name: 'Cataclismo', tier: 'TERCEIRUS', paths: ['fogo', 'ar', 'terra'] }
    ];

    QUnit.test('1. Caminho Feliz: Geração de puzzle dedutivo com pistas do caminho oculto', function (assert) {
        // Arrange: Mock determinístico de RNG
        const mockRng = () => 0.1; // Escolhe o primeiro círculo e caminhos previsíveis

        // Act
        const puzzle = DeductionPuzzleEngine.generateRandomDeductionPuzzle(mockCatalog, { missingCount: 1, rng: mockRng });

        // Assert
        assert.ok(puzzle.id.startsWith('deduction_'), 'Gera ID de puzzle válido');
        assert.ok(puzzle.title.includes('Magma') || puzzle.title.includes('Cataclismo'), 'Título temático');
        assert.equal(puzzle.missingPaths.length, 1, 'Exatamente 1 caminho oculto');
        assert.equal(puzzle.clues.length, 1, 'Gera 1 pista temática');
        assert.ok(puzzle.clues[0].length > 10, 'A pista possui texto descritivo');
    });

    QUnit.test('2. Caminho Feliz & Bordas: Avaliação de dedução correta e incorreta', function (assert) {
        // Arrange
        const puzzle = {
            id: 'p_test',
            circleName: 'Magma',
            allPaths: ['fogo', 'terra'],
            activePaths: ['fogo'],
            missingPaths: ['terra'],
            isSolved: false
        };

        // Act: Palpite correto
        const goodAttempt = DeductionPuzzleEngine.evaluateDeduction(puzzle, ['terra']);
        // Act: Palpite errado
        const badAttempt = DeductionPuzzleEngine.evaluateDeduction(puzzle, ['ar']);

        // Assert
        assert.ok(goodAttempt.success, 'Palpite correto resolve o enigma');
        assert.ok(puzzle.isSolved, 'Puzzle marcado como resolvido');
        assert.notOk(badAttempt.success, 'Palpite incorreto falha');
    });

    QUnit.test('3. Tratamento de Exceções: Catálogo vazio ou argumentos nulos', function (assert) {
        assert.throws(() => DeductionPuzzleEngine.generateRandomDeductionPuzzle([]), /Lista de círculos inválida/);
        assert.throws(() => DeductionPuzzleEngine.evaluateDeduction(null, []), /Puzzle dedutivo inválido/);
        assert.throws(() => DeductionPuzzleEngine.evaluateDeduction({ missingPaths: ['terra'] }, null), /Palpites devem ser um array/);
    });
});

QUnit.module('Exploração: Mapa de Masmorra com Salas Mágicas (AAA)', function () {

    QUnit.test('1. Caminho Feliz: Travessia entre salas conectadas com caminhos requeridos satisfeitos', function (assert) {
        // Arrange
        const dungeon = ArcaneDungeonMapEngine.getPrebuiltDungeon();

        // Act: Move da entrada (sala_entrada) para a câmara do fogo (sala_forja) possuindo 'fogo'
        const move1 = ArcaneDungeonMapEngine.attemptTraverseRoom(dungeon, 'sala_forja', ['fogo']);

        // Assert
        assert.ok(move1.success, 'Travessia permitida para a sala do fogo');
        assert.strictEqual(dungeon.currentRoomId, 'sala_forja', 'Localização atualizada');
        assert.ok(move1.reward, 'Recebe recompensa da sala');
    });

    QUnit.test('2. Casos de Borda: Travessia bloqueada se faltar o caminho elemental exigido', function (assert) {
        // Arrange
        const dungeon = ArcaneDungeonMapEngine.getPrebuiltDungeon();

        // Act: Tenta entrar na câmara do fogo sem ter 'fogo'
        const blockedMove = ArcaneDungeonMapEngine.attemptTraverseRoom(dungeon, 'sala_forja', ['ar', 'agua']);

        // Assert
        assert.notOk(blockedMove.success, 'Travessia bloqueada por falta de caminho');
        assert.ok(blockedMove.reason.includes('fogo'), 'Aponta o caminho faltante');
        assert.ok(blockedMove.hazard, 'Alerta do perigo elemental');
    });

    QUnit.test('3. Casos de Borda: Tentativa de pular para sala não conectada', function (assert) {
        // Arrange: Estamos na entrada e tentamos pular direto para o santuário final
        const dungeon = ArcaneDungeonMapEngine.getPrebuiltDungeon();

        // Act
        const disconnectedMove = ArcaneDungeonMapEngine.attemptTraverseRoom(dungeon, 'sala_santuario_cataclismo', ['fogo', 'ar', 'terra']);

        // Assert
        assert.notOk(disconnectedMove.success, 'Bloqueia salas sem conexão direta');
        assert.ok(disconnectedMove.reason.includes('não está conectada'), 'Explica falta de conexão');
    });
});
