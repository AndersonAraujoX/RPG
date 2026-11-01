/**
 * ============================================================================
 * Suíte de Testes Unitários — Sistema de Cooperação e Mesa Arcano (AAA)
 * 
 * Cobertura:
 * 1. Rituais com Papéis (Condutor, Estabilizador, Canalizador)
 * 2. Mana Compartilhada (Reservatório Comum e Transferências)
 * 3. Sala em Tempo Real (Broadcasts de Eventos Mestre-Jogadores)
 * ============================================================================
 */

const QUnit = require('qunit');
const MagicCooperationSystem = require('../src/core/magic-cooperation-system');

const { CooperativeRolesEngine, SharedManaPool, TabletopSyncEngine } = MagicCooperationSystem;

const cataclismoCircle = {
    id: 't005',
    name: 'CATACLISMO',
    tier: 'TERCEIRUS',
    paths: ['fogo', 'ar', 'terra'],
    forms: {
        Criar: { cd: 16, pe: 9, spell: 'Chuva de Meteoros Cataclísmica' }
    }
};

QUnit.module('Cooperação: Rituais com Papéis (AAA)', function () {

    QUnit.test('1. Caminho Feliz: Formação completa com Condutor, Estabilizador e Canalizador cobrindo os caminhos', function (assert) {
        // Arrange
        const participants = [
            { name: 'Mago Ígneo', role: 'condutor', paths: ['fogo'], bonus: 3 },
            { name: 'Mago dos Ventos', role: 'estabilizador', paths: ['ar'], bonus: 2 },
            { name: 'Mago Telúrico', role: 'canalizador', paths: ['terra'], bonus: 2 }
        ];

        // Act
        const validation = CooperativeRolesEngine.validateRoleFormation(participants, cataclismoCircle);

        // Assert
        assert.ok(validation.valid, 'A formação deve ser válida');
        assert.equal(validation.missingPaths.length, 0, 'Nenhum caminho ausente');
        assert.equal(validation.roleCounts.condutor, 1, 'Tem 1 condutor');
        assert.equal(validation.roleCounts.estabilizador, 1, 'Tem 1 estabilizador');
        assert.equal(validation.roleCounts.canalizador, 1, 'Tem 1 canalizador');
    });

    QUnit.test('2. Caminho Feliz: Execução com sucesso do ritual aplicando bônus e redução de CD e PE', function (assert) {
        // Arrange: Mocks determinísticos de rolagens (sem aleatoriedade)
        const participants = [
            { name: 'Ignis', role: 'condutor', paths: ['fogo'], bonus: 3 },
            { name: 'Zephyr', role: 'estabilizador', paths: ['ar'], bonus: 2 },
            { name: 'Terrax', role: 'canalizador', paths: ['terra'], bonus: 2 }
        ];
        const mockRolls = {
            condutor: [5, 5],      // 10 + 3 = 13
            estabilizador: [5, 4], // 9 + 2 = 11 (estabiliza, reduz CD em 1, anula surto)
            canalizador: [4, 4]    // 8 + 2 = 10 (canaliza, reduz PE em 1, confere +2 bônus)
        };

        // Act
        const result = CooperativeRolesEngine.executeRoleRitual(participants, cataclismoCircle, mockRolls);

        // Assert
        assert.ok(result.success, 'O ritual deve ser bem-sucedido');
        assert.strictEqual(result.finalCD, 15, 'CD base 16 reduzida em 1 para 15 pelo Estabilizador');
        assert.strictEqual(result.finalPECost, 8, 'PE base 9 reduzido em 1 para 8 pelo Canalizador');
        assert.ok(result.surgePrevented, 'Surto arcano deve ser evitado pelo Estabilizador');
        assert.equal(result.roleResults.length, 3, 'Deve conter resultados dos 3 participantes');
    });

    QUnit.test('3. Casos de Borda: Falha crítica do Estabilizador (2 no dado) colapsa o ritual', function (assert) {
        // Arrange
        const participants = [
            { name: 'Ignis', role: 'condutor', paths: ['fogo'], bonus: 5 },
            { name: 'Zephyr', role: 'estabilizador', paths: ['ar'], bonus: 1 },
            { name: 'Terrax', role: 'canalizador', paths: ['terra'], bonus: 2 }
        ];
        const mockRolls = {
            condutor: [6, 6],      // Acerto Crítico do condutor
            estabilizador: [1, 1], // Fumble do estabilizador (2 no dado)
            canalizador: [4, 4]
        };

        // Act
        const result = CooperativeRolesEngine.executeRoleRitual(participants, cataclismoCircle, mockRolls);

        // Assert
        assert.notOk(result.success, 'O ritual deve colapsar se o estabilizador falhar criticamente');
        assert.ok(result.stabilizerFumble, 'Identifica fumble do estabilizador');
        assert.ok(result.message.toLowerCase().includes('colapsou'), 'Mensagem reporta colapso do ritual');
    });

    QUnit.test('4. Tratamento de Erros: Falta de caminhos ou ausência de Condutor invalida formação', function (assert) {
        // Arrange: Falta caminho terra e falta papel condutor
        const incompleteParticipants = [
            { name: 'Zephyr', role: 'estabilizador', paths: ['ar'], bonus: 1 },
            { name: 'Aero', role: 'canalizador', paths: ['ar'], bonus: 1 }
        ];

        // Act
        const validation = CooperativeRolesEngine.validateRoleFormation(incompleteParticipants, cataclismoCircle);

        // Assert
        assert.notOk(validation.valid, 'Formação incompleta deve ser rejeitada');
        assert.ok(validation.reason.includes('Condutor'), 'Aponta ausência de Condutor');

        // Assert: Exceção com entradas nulas
        assert.throws(() => CooperativeRolesEngine.validateRoleFormation([], null), /Círculo de ritual inválido/);
    });
});

QUnit.module('Cooperação: Mana Compartilhada (Party Pool) (AAA)', function () {

    QUnit.test('1. Caminho Feliz: Criação do pool e doação com sucesso de PE', function (assert) {
        // Arrange
        const pool = SharedManaPool.createPool(40, 10);

        // Act
        const donationResult = SharedManaPool.donateToPool(pool, 'Arquimago Lucas', 15, 20);

        // Assert
        assert.ok(donationResult.success, 'Doação deve ser bem-sucedida');
        assert.strictEqual(donationResult.donated, 15, 'Doou exatamente 15 PE');
        assert.strictEqual(donationResult.playerRemainingPE, 5, 'Restam 5 PE para o jogador');
        assert.strictEqual(donationResult.pool.currentPE, 25, 'Pool agora possui 25 PE');
    });

    QUnit.test('2. Casos de Borda: Respeito à capacidade máxima e saque de PE', function (assert) {
        // Arrange: Pool com capacidade 20 e 18 já preenchido
        const pool = SharedManaPool.createPool(20, 18);

        // Act: Tenta doar 10, mas só cabem 2
        const donation = SharedManaPool.donateToPool(pool, 'Mago', 10, 15);
        // Act: Saque de 5 PE do pool atualizado
        const withdrawal = SharedManaPool.withdrawFromPool(donation.pool, 'Guerreiro Mágico', 5);

        // Assert
        assert.ok(donation.success, 'Doação parcial aceita');
        assert.strictEqual(donation.donated, 2, 'Doa apenas 2 para atingir limite máximo de 20');
        assert.ok(withdrawal.success, 'Saque bem-sucedido');
        assert.strictEqual(withdrawal.withdrawn, 5, 'Retirou 5 PE');
        assert.strictEqual(withdrawal.pool.currentPE, 15, 'Pool restante fica com 15 PE');
    });

    QUnit.test('3. Tratamento de Erros e Exceções: Doação sem saldo ou valores inválidos', function (assert) {
        // Arrange
        const pool = SharedManaPool.createPool(30, 5);

        // Act & Assert: Doação com saldo insuficiente
        const poorDonation = SharedManaPool.donateToPool(pool, 'Aprendiz', 10, 4);
        assert.notOk(poorDonation.success, 'Não permite doar mais do que possui');

        // Act & Assert: Saque maior que o saldo do pool
        const overdraft = SharedManaPool.withdrawFromPool(pool, 'Ladrão de Mana', 20);
        assert.notOk(overdraft.success, 'Não permite sacar além do saldo do pool');

        // Act & Assert: Exceções para argumentos inválidos
        assert.throws(() => SharedManaPool.donateToPool(null, 'Mago', 5, 10), /Reservatório inválido/);
        assert.throws(() => SharedManaPool.donateToPool(pool, 'Mago', -5, 10), /maior que zero/);
    });

    QUnit.test('4. Caminho Feliz: Transferência direta de PE entre jogadores', function (assert) {
        // Arrange & Act
        const transfer = SharedManaPool.transferBetweenPlayers('Clérigo', 'Mago', 4, 10);

        // Assert
        assert.ok(transfer.success, 'Transferência direta deve ter sucesso');
        assert.strictEqual(transfer.transferred, 4, 'Transfere 4 PE');
        assert.strictEqual(transfer.fromNewPE, 6, 'Doador fica com 6 PE');
    });
});

QUnit.module('Cooperação: Sincronização em Tempo Real (Broadcasts) (AAA)', function () {

    QUnit.test('1. Caminho Feliz: Criação de broadcast de puzzle liberado pelo Mestre', function (assert) {
        // Arrange
        const mockPuzzle = {
            id: 'pz_01',
            title: 'Porta de Fogo e Ar',
            doorDescription: 'Portal gravado com chamas.',
            circleId: 's02',
            circleName: 'Plasma',
            tier: 'SECUNDUS',
            activePaths: ['fogo'],
            missingPaths: ['ar']
        };

        // Act
        const broadcast = TabletopSyncEngine.createPuzzleBroadcast(mockPuzzle, 'sala_kuar_tor');

        // Assert
        assert.equal(broadcast.type, 'PUZZLE_RELEASED', 'Tipo de evento de broadcast correto');
        assert.equal(broadcast.roomCode, 'sala_kuar_tor', 'Código de sala preservado');
        assert.equal(broadcast.puzzle.circleName, 'Plasma', 'Dados do puzzle inclusos');
    });

    QUnit.test('2. Caminho Feliz: Criação de broadcast de conjuração e evento global', function (assert) {
        // Arrange & Act
        const conjure = TabletopSyncEngine.createConjureActionBroadcast('Arthur', 's03', 'estabilizador', 11);
        const globalEvent = TabletopSyncEngine.createArcaneEventBroadcast('tempestade_mana', 'Tempestade de Fogo', 'Fogo ganha +1', { fogo: 1 });

        // Assert
        assert.equal(conjure.type, 'COOPERATIVE_CONJURE_ACTION');
        assert.equal(conjure.action.playerName, 'Arthur');
        assert.equal(globalEvent.type, 'ARCANE_GLOBAL_EVENT');
        assert.equal(globalEvent.event.key, 'tempestade_mana');
    });
});
