/**
 * Suíte de Testes Unitários — Sistema de Forja Arcana, Rituais Cooperativos & Puzzles
 * Padrão: Arrange-Act-Assert (AAA)
 * 
 * Cobertura Completa:
 * 1. Forja & Encantamento de Itens (Receitas, Materiais Canônicos, Sucesso, Falha, Crítico, Casos de Borda).
 * 2. Rituais Cooperativos (Validação de Caminhos, Divisão Justa de PE, Rolagem Cooperativa com Sinergia, Falhas).
 * 3. Puzzles & Masmorras Arcanas (Geração de Portas Seladas, Resolução Correta, Armadilhas em Erro, Puzzles Pré-fabricados).
 */

const QUnit = require('qunit');
const MagicForgeSystem = require('../src/core/magic-forge-system');
const { ForgeEngine, RitualsEngine, DungeonPuzzleEngine, PATH_ESSENCES, BASE_ITEMS } = MagicForgeSystem;

QUnit.module('Forja Arcana & Encantamento de Itens (ForgeEngine)', function () {

    const sampleSecundus = {
        id: 's03',
        name: 'Magma & Vulcanismo',
        tier: 'SECUNDUS',
        paths: ['fogo', 'terra'],
        forms: {
            Criar: { spell: 'Lança de Magma Incandescente', cd: 11, pe: 4 }
        }
    };

    const sampleTerceirus = {
        id: 't005',
        name: 'CATACLISMO',
        tier: 'TERCEIRUS',
        paths: ['fogo', 'ar', 'terra'],
        forms: {
            Criar: { spell: 'Chuva Sísmica de Plasma', cd: 14, pe: 8 }
        }
    };

    QUnit.test('1. Caminho Feliz: createForgeRecipe gera receita canônica para Espada de Magma (#03)', function (assert) {
        // Arrange
        const circle = sampleSecundus;
        const itemType = 'espada';

        // Act
        const recipe = ForgeEngine.createForgeRecipe(circle, itemType);

        // Assert
        assert.equal(recipe.circleId, 's03');
        assert.equal(recipe.tier, 'SECUNDUS');
        assert.equal(recipe.forgeCD, 11);
        assert.equal(recipe.peCost, 4);
        assert.ok(recipe.title.includes('Espada'), 'Título do item contém Espada');
        assert.equal(recipe.requiredMaterials.length, 3, '1 Material Base + 2 Essências (Fogo e Terra)');
        assert.equal(recipe.requiredMaterials[1].name, 'Essência Ígnea');
        assert.equal(recipe.requiredMaterials[2].name, 'Núcleo Telúrico de Adamante');
        assert.ok(recipe.magicalEffects.length >= 2, 'Contém propriedades mágicas dos dois caminhos');
    });

    QUnit.test('2. Caminho Feliz: craftItem realiza a forja com sucesso (+2d6 >= CD)', function (assert) {
        // Arrange
        const recipe = ForgeEngine.createForgeRecipe(sampleSecundus, 'espada');
        const totalRoll = 13; // vs CD 11

        // Act
        const result = ForgeEngine.craftItem(recipe, totalRoll, 8);

        // Assert
        assert.ok(result.success, 'Forja bem-sucedida');
        assert.notOk(result.isCritical, 'Não foi crítico');
        assert.ok(result.item, 'Item gerado');
        assert.equal(result.item.circleName, 'Magma & Vulcanismo');
        assert.deepEqual(result.item.paths, ['fogo', 'terra']);
    });

    QUnit.test('3. Caminho Feliz: craftItem em Sucesso Crítico (12 no dado) concede Obra-Prima Lendária', function (assert) {
        // Arrange
        const recipe = ForgeEngine.createForgeRecipe(sampleTerceirus, 'cajado');
        const totalRoll = 18;
        const diceSum = 12;

        // Act
        const result = ForgeEngine.craftItem(recipe, totalRoll, diceSum);

        // Assert
        assert.ok(result.success, 'Forja concluída');
        assert.ok(result.isCritical, 'Detectou crítico');
        assert.ok(result.item.name.includes('★'), 'Nome recebe estrela de obra-prima');
        assert.ok(result.item.isMasterwork, 'Marcado como obra-prima');
        assert.ok(result.item.properties.some(p => p.includes('Redução permanente de 1 PE')), 'Bônus de PE concedido');
    });

    QUnit.test('4. Casos de Borda: Falha na rolagem não forja o item e detalha o motivo', function (assert) {
        // Arrange
        const recipe = ForgeEngine.createForgeRecipe(sampleSecundus, 'espada');
        const totalRoll = 9; // vs CD 11

        // Act
        const result = ForgeEngine.craftItem(recipe, totalRoll, 6);

        // Assert
        assert.notOk(result.success, 'Forja falhou');
        assert.strictEqual(result.item, null);
        assert.ok(result.reason.includes('não atingiu a CD'));
    });

    QUnit.test('5. Casos de Borda: Falha Crítica (2 no dado) aciona dano crítico no processo', function (assert) {
        // Arrange
        const recipe = ForgeEngine.createForgeRecipe(sampleSecundus, 'espada');
        const totalRoll = 6;
        const diceSum = 2; // Falha crítica

        // Act
        const result = ForgeEngine.craftItem(recipe, totalRoll, diceSum);

        // Assert
        assert.notOk(result.success);
        assert.ok(result.isFumble, 'Marcado como falha crítica');
        assert.ok(result.reason.includes('Falha Crítica'));
    });

    QUnit.test('6. Tratamento de Exceções: Entradas nulas ou inválidas lançam erro explicativo', function (assert) {
        assert.throws(() => ForgeEngine.createForgeRecipe(null), /Círculo de magia inválido/);
        assert.throws(() => ForgeEngine.createForgeRecipe({ paths: 'invalido' }), /Círculo de magia inválido/);
        assert.throws(() => ForgeEngine.craftItem(null, 10), /Receita de forja inválida/);
        assert.throws(() => ForgeEngine.craftItem({}, NaN), /Rolagem de teste de forja inválida/);
    });
});

QUnit.module('Rituais Cooperativos (RitualsEngine)', function () {

    const sampleTerceirus = {
        id: 't005',
        name: 'CATACLISMO',
        tier: 'TERCEIRUS',
        paths: ['fogo', 'ar', 'terra'],
        forms: {
            Criar: { spell: 'Chuva Sísmica de Plasma', cd: 14, pe: 8 }
        }
    };

    QUnit.test('1. Caminho Feliz: validateTeamPaths confirma equipe que junta Fogo + (Ar + Terra)', function (assert) {
        // Arrange
        const mages = [
            { name: 'Mago Ignis', paths: ['fogo'], peAvailable: 6, bonus: 3 },
            { name: 'Maga Zephira', paths: ['ar', 'terra'], peAvailable: 6, bonus: 2 }
        ];

        // Act
        const check = RitualsEngine.validateTeamPaths(mages, sampleTerceirus.paths);

        // Assert
        assert.ok(check.valid, 'Equipe cobre todos os 3 caminhos');
        assert.equal(check.missingPaths.length, 0);
        assert.equal(check.totalMages, 2);
    });

    QUnit.test('2. Caminho Feliz: calculatePEDistribution divide os 8 PE igualmente entre os conjuradores', function (assert) {
        // Arrange
        const mages = [
            { name: 'Mago A', peAvailable: 10 },
            { name: 'Mago B', peAvailable: 10 }
        ];

        // Act
        const plan = RitualsEngine.calculatePEDistribution(mages, 8);

        // Assert
        assert.ok(plan.possible, 'Divisão de PE é viável');
        assert.equal(plan.distribution[0].peAssigned, 4);
        assert.equal(plan.distribution[1].peAssigned, 4);
        assert.equal(plan.distribution[0].peRemaining, 6);
    });

    QUnit.test('3. Caminho Feliz: performCooperativeRitual executa ritual com bônus de sinergia e sucesso', function (assert) {
        // Arrange
        const mages = [
            { name: 'Ignis', paths: ['fogo'], peAvailable: 5, bonus: 3 },
            { name: 'Zephira', paths: ['ar', 'terra'], peAvailable: 5, bonus: 3 }
        ];

        // Act (d1=5, d2=5 -> 10 + avgBonus 3 + synergy 1 = 14 vs CD 14)
        const result = RitualsEngine.performCooperativeRitual(mages, sampleTerceirus, 5, 5);

        // Assert
        assert.ok(result.success, 'Ritual cooperativo bem-sucedido');
        assert.equal(result.synergyBonus, 1, 'Bônus de sinergia para 2 magos');
        assert.equal(result.finalRoll, 14);
        assert.ok(result.message.includes('sucesso triunfal'));
    });

    QUnit.test('4. Casos de Borda: Falta de caminho impede o ritual antes de consumir PE', function (assert) {
        // Arrange (Falta o caminho terra)
        const mages = [
            { name: 'Ignis', paths: ['fogo'], peAvailable: 10 },
            { name: 'Aero', paths: ['ar'], peAvailable: 10 }
        ];

        // Act
        const result = RitualsEngine.performCooperativeRitual(mages, sampleTerceirus);

        // Assert
        assert.notOk(result.success);
        assert.ok(result.reason.includes('faltam os caminhos [terra]'));
    });

    QUnit.test('5. Casos de Borda: Falta de PE coletivo aborta o ritual com clareza', function (assert) {
        // Arrange (Total 4 PE vs 8 PE exigidos)
        const mages = [
            { name: 'Mago Cansado 1', paths: ['fogo'], peAvailable: 2 },
            { name: 'Mago Cansado 2', paths: ['ar', 'terra'], peAvailable: 2 }
        ];

        // Act
        const result = RitualsEngine.performCooperativeRitual(mages, sampleTerceirus);

        // Assert
        assert.notOk(result.success);
        assert.ok(result.reason.includes('Energia insuficiente'));
    });

    QUnit.test('6. Tratamento de Exceções: Equipe vazia ou círculo nulo lançam exceção', function (assert) {
        assert.throws(() => RitualsEngine.calculatePEDistribution([], 4), /Lista de magos inválida/);
        assert.throws(() => RitualsEngine.calculatePEDistribution([{ peAvailable: 5 }], -1), /Custo de PE total deve ser um número positivo/);
        assert.throws(() => RitualsEngine.performCooperativeRitual([], null), /Círculo de ritual inválido/);
    });
});

QUnit.module('Puzzles & Masmorras Arcanas (DungeonPuzzleEngine)', function () {

    const sampleTerceirus = {
        id: 't005',
        name: 'CATACLISMO',
        tier: 'TERCEIRUS',
        paths: ['fogo', 'ar', 'terra']
    };

    QUnit.test('1. Caminho Feliz: createDoorPuzzle gera porta com 2 caminhos ativos e 1 faltando', function (assert) {
        // Arrange & Act
        const puzzle = DungeonPuzzleEngine.createDoorPuzzle(sampleTerceirus, 1);

        // Assert
        assert.ok(puzzle.id.startsWith('puzzle_t005'));
        assert.deepEqual(puzzle.activePaths, ['fogo', 'ar']);
        assert.deepEqual(puzzle.missingPaths, ['terra']);
        assert.ok(puzzle.doorDescription.includes('Cataclismo') || puzzle.doorDescription.includes('CATACLISMO'));
        assert.notOk(puzzle.isSolved, 'Inicia não resolvido');
    });

    QUnit.test('2. Caminho Feliz: attemptUnlockDoor com o caminho correto abre o portal', function (assert) {
        // Arrange
        const puzzle = DungeonPuzzleEngine.createDoorPuzzle(sampleTerceirus, 1);

        // Act
        const result = DungeonPuzzleEngine.attemptUnlockDoor(puzzle, ['terra']);

        // Assert
        assert.ok(result.success, 'Desafio resolvido com sucesso');
        assert.ok(result.doorOpened, 'Porta aberta');
        assert.ok(puzzle.isSolved, 'Estado do puzzle atualizado para resolvido');
        assert.ok(result.message.includes('ressoam em harmonia'));
    });

    QUnit.test('3. Casos de Borda: Injeção de caminho incorreto ativa armadilha elemental', function (assert) {
        // Arrange
        const puzzle = DungeonPuzzleEngine.createDoorPuzzle(sampleTerceirus, 1);

        // Act (Injeta luz em vez de terra)
        const result = DungeonPuzzleEngine.attemptUnlockDoor(puzzle, ['luz']);

        // Assert
        assert.notOk(result.success, 'Falha na resposta');
        assert.notOk(result.doorOpened);
        assert.ok(result.triggeredTrap, 'Armadilha ativada');
        assert.ok(result.message.includes('Choque Elemental'));
    });

    QUnit.test('4. Casos de Borda: Catálogo getPrebuiltDungeonPuzzles possui masmorras prontas', function (assert) {
        // Act
        const puzzles = DungeonPuzzleEngine.getPrebuiltDungeonPuzzles();

        // Assert
        assert.ok(Array.isArray(puzzles) && puzzles.length >= 3, 'Ao menos 3 masmorras pré-construídas');
        puzzles.forEach(p => {
            assert.ok(p.id && p.title && p.missingPaths.length > 0, `Masmorra ${p.id} válida`);
        });
    });

    QUnit.test('5. Tratamento de Exceções: Argumentos inválidos lançam erro', function (assert) {
        assert.throws(() => DungeonPuzzleEngine.createDoorPuzzle(null), /Círculo inválido/);
        assert.throws(() => DungeonPuzzleEngine.createDoorPuzzle({ paths: ['fogo'] }), /ao menos 2 caminhos/);
        assert.throws(() => DungeonPuzzleEngine.attemptUnlockDoor(null, ['terra']), /Puzzle inválido/);
        assert.throws(() => DungeonPuzzleEngine.attemptUnlockDoor({ missingPaths: ['terra'] }, null), /array/);
    });
});
