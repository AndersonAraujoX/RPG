/**
 * @file tests/vtt-bestiary-engine.test.js
 * @description Suíte de Testes Unitários: VttBestiaryEngine (Bestiário & Turn Tracker +2d6)
 * Padrão: Arrange-Act-Assert (AAA)
 */

const QUnit = require('qunit');
const VttBestiaryEngine = require('../src/core/vtt-bestiary-engine');

QUnit.module('VttBestiaryEngine — Bestiário & Rastreador de Turnos (+2d6)', function () {

    // -------------------------------------------------------------
    // 1. Caminho Feliz: Catálogo e Busca de Criaturas
    // -------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: Obter catálogo completo e buscar por ID (AAA)', function (assert) {
        // Arrange
        const expectedCount = 8;

        // Act
        const creatures = VttBestiaryEngine.getAllCreatures();
        const cultist = VttBestiaryEngine.getCreatureById('cultista_sombrio');

        // Assert
        assert.ok(Array.isArray(creatures), 'Deve retornar array de criaturas');
        assert.ok(creatures.length >= expectedCount, `Deve conter ao menos ${expectedCount} monstros catalogados`);
        assert.equal(cultist.name, 'Cultista do Vazio', 'Nome da criatura recuperada');
        assert.equal(cultist.hp, 14, 'PV do cultista');
        assert.equal(cultist.category, 'Conjuradores', 'Categoria correta');
        assert.ok(cultist.attacks.length >= 2, 'Possui ataques corpo a corpo e magia');
    });

    QUnit.test('2. Caminho Feliz: Filtragem por termo e categoria (AAA)', function (assert) {
        // Arrange
        const optionsCat = { category: 'Construtos' };
        const optionsSearch = { search: 'Abismo' };

        // Act
        const construtos = VttBestiaryEngine.filterCreatures(optionsCat);
        const boss = VttBestiaryEngine.filterCreatures(optionsSearch);

        // Assert
        assert.equal(construtos.length, 1, 'Encontra o guardião rúnico');
        assert.equal(construtos[0].id, 'automato_runico', 'ID do construto');
        assert.equal(boss.length, 1, 'Encontra o arauto do abismo');
        assert.equal(boss[0].tier, 'Chefe', 'Tier de chefe');
    });

    QUnit.test('3. Caminho Feliz: Geração de Token Inimigo para o VTT (createEnemyToken) (AAA)', function (assert) {
        // Arrange
        const creatureId = 'lobo_abissal';
        const overrides = { x: 320, y: 440, name: 'Lobo Alfa do Bando' };

        // Act
        const token = VttBestiaryEngine.createEnemyToken(creatureId, overrides);

        // Assert
        assert.ok(token.id.startsWith('enemy_lobo_abissal_'), 'Gera ID único de token');
        assert.equal(token.name, 'Lobo Alfa do Bando', 'Aplica nome sobrescrito');
        assert.equal(token.team, 'enemies', 'Pertence ao time inimigo');
        assert.equal(token.hp, 16, 'PV inicial total');
        assert.equal(token.maxHp, 16, 'PV máximo');
        assert.equal(token.x, 320, 'Posição X correta');
        assert.equal(token.y, 440, 'Posição Y correta');
        assert.ok(token.attacks.length > 0, 'Possui ataques formatados');
    });

    // -------------------------------------------------------------
    // 2. Caminho Feliz: Rastreador de Turnos e Iniciativa
    // -------------------------------------------------------------
    QUnit.test('4. Caminho Feliz: Inicialização do Combate e Ordenação de Iniciativa (AAA)', function (assert) {
        // Arrange
        const tokens = [
            { id: 'hero1', name: 'Guerreiro', team: 'heroes', des: 2, initiative: 2, hp: 20, maxHp: 20 },
            { id: 'hero2', name: 'Ladino', team: 'heroes', des: 4, initiative: 4, hp: 16, maxHp: 16 },
            { id: 'enemy1', name: 'Cultista', team: 'enemies', des: 3, initiative: 3, hp: 14, maxHp: 14 }
        ];

        // Act
        const tracker = VttBestiaryEngine.initCombatTracker(tokens);

        // Assert
        assert.ok(tracker.isActive, 'Combate fica ativo');
        assert.equal(tracker.round, 1, 'Inicia na rodada 1');
        assert.equal(tracker.currentTurnIndex, 0, 'Inicia no primeiro da ordem');
        assert.equal(tracker.order[0].id, 'hero2', 'Ladino (iniciativa 4) age primeiro');
        assert.equal(tracker.order[1].id, 'enemy1', 'Cultista (iniciativa 3) age em segundo');
        assert.equal(tracker.order[2].id, 'hero1', 'Guerreiro (iniciativa 2) age em terceiro');
    });

    QUnit.test('5. Caminho Feliz: Avanço de Turnos e Ciclo de Rodadas (AAA)', function (assert) {
        // Arrange
        const tokens = [
            { id: 't1', name: 'Alfa', team: 'heroes', initiative: 4, hp: 20, conditions: [] },
            { id: 't2', name: 'Beta', team: 'enemies', initiative: 2, hp: 15, conditions: [] }
        ];
        const initialTracker = VttBestiaryEngine.initCombatTracker(tokens);

        // Act - Passo 1: Avançar para o segundo combatente (mesma rodada)
        const step1 = VttBestiaryEngine.advanceTurn(initialTracker, tokens);

        // Act - Passo 2: Avançar além do último combatente (deve iniciar Rodada 2)
        const step2 = VttBestiaryEngine.advanceTurn(step1.trackerState, step1.tokens);

        // Assert
        assert.equal(step1.trackerState.currentTurnIndex, 1, 'Avançou para o combatente 2');
        assert.equal(step1.trackerState.round, 1, 'Ainda na rodada 1');
        assert.equal(step2.trackerState.currentTurnIndex, 0, 'Voltou para o primeiro combatente');
        assert.equal(step2.trackerState.round, 2, 'Avançou para a Rodada 2');
        assert.ok(step2.log.some(l => l.includes('Rodada 2')), 'Registrou início da rodada 2 no log');
    });

    // -------------------------------------------------------------
    // 3. Casos de Borda: Condições Ativas (Sangramento & Inconsciência)
    // -------------------------------------------------------------
    QUnit.test('6. Casos de Borda: Dano Automático de Sangramento no Início do Turno (AAA)', function (assert) {
        // Arrange
        const bleedingToken = {
            id: 'bleeder',
            name: 'Vítima Ferida',
            team: 'heroes',
            hp: 5,
            maxHp: 20,
            initiative: 5,
            conditions: ['sangrando']
        };
        const otherToken = { id: 'other', name: 'Espectador', team: 'enemies', hp: 10, initiative: 1, conditions: [] };
        
        // Simular que o turno anterior acabou e é a vez do token sangrando
        const trackerState = {
            isActive: true,
            round: 1,
            currentTurnIndex: 1, // Atualmente em "other"
            order: [
                { id: 'bleeder', name: 'Vítima Ferida', hp: 5 },
                { id: 'other', name: 'Espectador', hp: 10 }
            ],
            log: []
        };

        // Act
        const result = VttBestiaryEngine.advanceTurn(trackerState, [bleedingToken, otherToken]);
        const updatedBleeder = result.tokens.find(t => t.id === 'bleeder');

        // Assert
        assert.ok(updatedBleeder.hp < 5, 'HP deve ter sido reduzido pelo dano contínuo de sangramento');
        assert.ok(result.log.some(l => l.includes('sangra e perde')), 'Log deve registrar o dano de sangramento');
        if (updatedBleeder.hp === 0) {
            assert.ok(updatedBleeder.conditions.includes('inconsciente'), 'Fica inconsciente se HP zerar');
        }
    });

    QUnit.test('7. Casos de Borda: Adicionar e Remover Combatentes em Combate Ativo (AAA)', function (assert) {
        // Arrange
        const initialTracker = VttBestiaryEngine.initCombatTracker([
            { id: 'h1', name: 'Herói', team: 'heroes', hp: 20, initiative: 3 }
        ]);
        const reinforcement = { id: 'm1', name: 'Monstro Reforço', team: 'enemies', hp: 15, initiative: 5 };

        // Act - Adicionar reforço
        const trackerWithNew = VttBestiaryEngine.addTokenToTracker(initialTracker, reinforcement);
        // Act - Remover herói caído
        const trackerAfterRemoval = VttBestiaryEngine.removeTokenFromTracker(trackerWithNew, 'h1');

        // Assert
        assert.equal(trackerWithNew.order.length, 2, 'Possui 2 combatentes após reforço');
        assert.equal(trackerWithNew.order[0].id, 'm1', 'Reforço com iniciativa 5 assume primeira posição');
        assert.equal(trackerAfterRemoval.order.length, 1, 'Possui 1 combatente após remoção');
        assert.equal(trackerAfterRemoval.order[0].id, 'm1', 'Apenas o monstro permanece');
    });

    // -------------------------------------------------------------
    // 4. Tratamento de Exceções e Resiliência
    // -------------------------------------------------------------
    QUnit.test('8. Tratamento de Exceções: Entradas nulas e IDs inexistentes (AAA)', function (assert) {
        // Arrange & Act
        const nullCreature = VttBestiaryEngine.getCreatureById(null);
        const unknownCreature = VttBestiaryEngine.getCreatureById('dragao_inexistente_xyz');
        const emptyTracker = VttBestiaryEngine.advanceTurn(null, []);

        // Assert
        assert.equal(nullCreature, null, 'Retorna null para ID nulo');
        assert.equal(unknownCreature, null, 'Retorna null para ID inexistente');
        assert.equal(emptyTracker.trackerState.isActive, false, 'Combate inativo para tracker nulo');

        assert.throws(
            () => VttBestiaryEngine.createEnemyToken(null),
            /inválida/i,
            'createEnemyToken deve lançar exceção tratável para criatura nula'
        );
    });
});
