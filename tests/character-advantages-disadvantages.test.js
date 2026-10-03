/**
 * Testes Unitários: Limites de Vantagens (5 iniciais) e Desvantagens (máx 5 pontos)
 * Padrão: Arrange-Act-Assert (AAA)
 * Cobre: Caminho feliz, casos de borda (limites, coleções vazias, nulos), tratamento de erros e exceções.
 */

const QUnit = require('qunit');
const path = require('path');
const fs = require('fs');

const { CharacterSheetRules, CharacterSheetController } = require('../src/core/character-sheet.js');

QUnit.module('Regras de Criação de Personagem (+2d6): Vantagens & Desvantagens', function () {

    // ========================================================================
    // 1. CAMINHO FELIZ (FLUXO PRINCIPAL)
    // ========================================================================

    QUnit.test('1.1 Caminho Feliz: Cálculo do pool de vantagens com desvantagens até 5 pontos (AAA)', function (assert) {
        // Arrange
        const baseBonusZero = 0;
        const desvantagemDuas = 3;
        const desvantagemCinco = 5;
        const pontosAdicionais = 2;

        // Act
        const poolZero = CharacterSheetRules.calcAdvantagePointsPool(baseBonusZero);
        const poolTres = CharacterSheetRules.calcAdvantagePointsPool(desvantagemDuas);
        const poolCinco = CharacterSheetRules.calcAdvantagePointsPool(desvantagemCinco);
        const poolComExtras = CharacterSheetRules.calcAdvantagePointsPool(desvantagemCinco, pontosAdicionais);

        // Assert
        assert.equal(poolZero, 5, 'Com 0 desvantagens, o pool base de vantagens é 5');
        assert.equal(poolTres, 8, 'Com 3 pontos de desvantagens, o pool é 5 + 3 = 8');
        assert.equal(poolCinco, 10, 'Com 5 pontos de desvantagens, o pool é 5 + 5 = 10');
        assert.equal(poolComExtras, 12, 'Com 5 pontos de desvantagens + 2 pontos de evolução, o pool é 12');
    });

    QUnit.test('1.2 Caminho Feliz: Validação de lista de desvantagens dentro do limite de 5 pontos (AAA)', function (assert) {
        // Arrange
        const desvantagensValidas = [
            { id: 1, nome: 'Inimigo Mortal', bonus: 2 },
            { id: 2, nome: 'Fobia do Escuro', bonus: 2 },
            { id: 3, nome: 'Código de Honra', bonus: 1 }
        ];

        // Act
        const resultado = CharacterSheetRules.validateDisadvantages(desvantagensValidas);

        // Assert
        assert.ok(resultado.isValid, 'Lista com total de 5 pontos de desvantagens é válida');
        assert.equal(resultado.totalPoints, 5, 'Total de pontos deve ser exatamente 5');
        assert.equal(resultado.maxAllowed, 5, 'Limite máximo permitido deve ser 5');
        assert.equal(resultado.error, null, 'Nenhum erro deve ser retornado no caminho feliz');
    });

    QUnit.test('1.3 Caminho Feliz: Validação de lista de vantagens até o limite inicial de 5 vantagens (AAA)', function (assert) {
        // Arrange
        const vantagensValidas = [
            { id: 101, nome: 'Visão Noturna', custo: 1 },
            { id: 102, nome: 'Reflexos Rápidos', custo: 1 },
            { id: 103, nome: 'Ambidestria', custo: 1 },
            { id: 104, nome: 'Sentidos Aguçados', custo: 1 },
            { id: 105, nome: 'Foco em Combate', custo: 1 }
        ];
        const poolDisponivel = 5;

        // Act
        const resultado = CharacterSheetRules.validateAdvantages(vantagensValidas, { pool: poolDisponivel });

        // Assert
        assert.ok(resultado.isValid, 'Exatamente 5 vantagens dentro do pool de 5 pontos é válido');
        assert.equal(resultado.count, 5, 'Quantidade de vantagens deve ser 5');
        assert.equal(resultado.maxCount, 5, 'Limite inicial permitido de vantagens é 5');
        assert.equal(resultado.totalCost, 5, 'Total de pontos gastos é 5');
        assert.equal(resultado.error, null, 'Nenhum erro reportado');
    });

    // ========================================================================
    // 2. CASOS DE BORDA (EDGE CASES: LIMITES, COLEÇÕES VAZIAS, NULOS)
    // ========================================================================

    QUnit.test('2.1 Casos de Borda: Coleções vazias e valores nulos ou indefinidos (AAA)', function (assert) {
        // Arrange & Act
        const resDisVazia = CharacterSheetRules.validateDisadvantages([]);
        const resDisNull = CharacterSheetRules.validateDisadvantages(null);
        const resDisUndefined = CharacterSheetRules.validateDisadvantages(undefined);

        const resAdvVazia = CharacterSheetRules.validateAdvantages([]);
        const resAdvNull = CharacterSheetRules.validateAdvantages(null);
        const resAdvUndefined = CharacterSheetRules.validateAdvantages(undefined);

        // Assert
        assert.ok(resDisVazia.isValid && resDisVazia.totalPoints === 0, 'Array vazio de desvantagens é válido com 0 pontos');
        assert.ok(resDisNull.isValid && resDisNull.totalPoints === 0, 'Desvantagens null é tratado graciosamente como 0 pontos');
        assert.ok(resDisUndefined.isValid && resDisUndefined.totalPoints === 0, 'Desvantagens undefined é tratado graciosamente como 0 pontos');

        assert.ok(resAdvVazia.isValid && resAdvVazia.count === 0, 'Array vazio de vantagens é válido');
        assert.ok(resAdvNull.isValid && resAdvNull.count === 0, 'Vantagens null é tratado graciosamente');
        assert.ok(resAdvUndefined.isValid && resAdvUndefined.count === 0, 'Vantagens undefined é tratado graciosamente');
    });

    QUnit.test('2.2 Casos de Borda: Teto rígido de pontos de desvantagens aplicado no cálculo de pool (AAA)', function (assert) {
        // Arrange: Jogador tenta cadastrar mais de 5 pontos de desvantagens (ex: 8 ou 20)
        const bonusOito = 8;
        const bonusVinte = 20;

        // Act
        const poolComOito = CharacterSheetRules.calcAdvantagePointsPool(bonusOito);
        const poolComVinte = CharacterSheetRules.calcAdvantagePointsPool(bonusVinte);

        // Assert
        assert.equal(poolComOito, 10, 'Mesmo informando 8 pontos de desvantagens, o teto aplicado é 5 (Pool: 5 + 5 = 10)');
        assert.equal(poolComVinte, 10, 'Mesmo informando 20 pontos de desvantagens, o teto aplicado é 5 (Pool: 5 + 5 = 10)');
    });

    QUnit.test('2.3 Casos de Borda: Rejeição ao ultrapassar 5 pontos de desvantagens na validação (AAA)', function (assert) {
        // Arrange: Lista totalizando 6 pontos de desvantagens
        const desvantagensExcessivas = [
            { id: 1, nome: 'Inimigo Mortal', bonus: 3 },
            { id: 2, nome: 'Fobia Severa', bonus: 3 }
        ];

        // Act
        const resultado = CharacterSheetRules.validateDisadvantages(desvantagensExcessivas);

        // Assert
        assert.notOk(resultado.isValid, 'Lista com 6 pontos de desvantagens deve ser inválida');
        assert.equal(resultado.totalPoints, 6, 'Total de pontos detectado é 6');
        assert.equal(resultado.exceeded, 1, 'Excedeu em 1 ponto o limite');
        assert.ok(resultado.error.includes('excede o limite máximo permitido de 5 pontos'), 'Mensagem de erro clara');
    });

    QUnit.test('2.4 Casos de Borda: Rejeição ao tentar colocar mais de 5 vantagens inicialmente (AAA)', function (assert) {
        // Arrange: 6 vantagens (1 a mais do que o limite inicial de 5)
        const seisVantagens = [
            { id: 1, nome: 'Vantagem 1', custo: 1 },
            { id: 2, nome: 'Vantagem 2', custo: 1 },
            { id: 3, nome: 'Vantagem 3', custo: 1 },
            { id: 4, nome: 'Vantagem 4', custo: 1 },
            { id: 5, nome: 'Vantagem 5', custo: 1 },
            { id: 6, nome: 'Vantagem 6', custo: 1 }
        ];

        // Act
        const resultado = CharacterSheetRules.validateAdvantages(seisVantagens, { pool: 10 });

        // Assert
        assert.notOk(resultado.isValid, '6 vantagens inicialmente não é permitido');
        assert.notOk(resultado.isCountValid, 'isCountValid deve ser false');
        assert.equal(resultado.count, 6, 'Detectou 6 vantagens');
        assert.ok(resultado.error.includes('excede o limite inicial permitido de 5 vantagens'), 'Mensagem de erro de limite de vantagens');
    });

    QUnit.test('2.5 Casos de Borda: Custo de vantagens excedendo o pool disponível (AAA)', function (assert) {
        // Arrange: 2 vantagens custando 6 pontos com pool de 5
        const vantagensCaras = [
            { id: 1, nome: 'Poder Mágico Superior', custo: 4 },
            { id: 2, nome: 'Regeneração', custo: 2 }
        ];

        // Act
        const resultado = CharacterSheetRules.validateAdvantages(vantagensCaras, { pool: 5 });

        // Assert
        assert.notOk(resultado.isValid, 'Custo de 6 pontos em pool de 5 deve ser inválido');
        assert.ok(resultado.isCountValid, 'Quantidade de vantagens (2) está dentro do limite de 5');
        assert.notOk(resultado.isCostValid, 'isCostValid deve ser false');
        assert.ok(resultado.error.includes('excedem o pool disponível de 5 pontos'), 'Erro de pool de pontos');
    });

    // ========================================================================
    // 3. TRATAMENTO DE EXCEÇÕES E ERROS (ROBUSTEZ)
    // ========================================================================

    QUnit.test('3.1 Tratamento de Erros: Tipos inválidos fornecidos para validação (AAA)', function (assert) {
        // Arrange & Act & Assert
        assert.throws(
            function () { CharacterSheetRules.validateDisadvantages('string_invalida'); },
            TypeError,
            'Deve lançar TypeError se desvantagens não for array'
        );

        assert.throws(
            function () { CharacterSheetRules.validateAdvantages(12345); },
            TypeError,
            'Deve lançar TypeError se vantagens não for array'
        );
    });

    QUnit.test('3.2 Tratamento de Erros: Valores negativos de custo ou bônus (AAA)', function (assert) {
        // Arrange
        const desvantagemNegativa = [{ nome: 'Trapaça', bonus: -2 }];
        const vantagemNegativa = [{ nome: 'Exploit', custo: -1 }];

        // Act & Assert
        assert.throws(
            function () { CharacterSheetRules.validateDisadvantages(desvantagemNegativa); },
            RangeError,
            'Deve lançar RangeError se pontos de desvantagem forem negativos'
        );

        assert.throws(
            function () { CharacterSheetRules.validateAdvantages(vantagemNegativa); },
            RangeError,
            'Deve lançar RangeError se custo de vantagem for negativo'
        );
    });

    // ========================================================================
    // 4. MOCKS / CONTROLLER: ISOLAMENTO E TESTABILIDADE (CharacterSheetController)
    // ========================================================================

    QUnit.test('4.1 CharacterSheetController: Gestão de vantagens e desvantagens com limites (AAA)', function (assert) {
        // Arrange
        const controller = new CharacterSheetController();
        controller.data.advantages = [];
        controller.data.disadvantages = [];

        // Act: Adiciona 5 desvantagens de 1 ponto (total 5 pontos)
        for (let i = 1; i <= 5; i++) {
            controller.addDisadvantage({ nome: `Desvantagem ${i}`, bonus: 1 });
        }

        // Assert: Bônus de desvantagens e pool resultante
        assert.equal(controller.getDisadvantagesBonus(), 5, 'Total de bônus de desvantagens deve ser 5');
        assert.equal(controller.getAdvantagePointsPool(), 10, 'Pool de vantagens com 5 pontos de desvantagens deve ser 10');

        // Act & Assert: Tentar adicionar mais uma desvantagem deve estourar o limite de 5 pontos
        assert.throws(
            function () {
                controller.addDisadvantage({ nome: 'Desvantagem Extra', bonus: 1 });
            },
            /não pode exceder 5 pontos/,
            'Controller bloqueia adição de desvantagens além de 5 pontos'
        );

        // Act: Adiciona 5 vantagens (limite inicial)
        for (let i = 1; i <= 5; i++) {
            controller.addAdvantage({ nome: `Vantagem ${i}`, custo: 2 });
        }
        assert.equal(controller.data.advantages.length, 5, '5 vantagens adicionadas com sucesso');
        assert.equal(controller.getAdvantagesSpent(), 10, 'Gasto total de 10 pontos em vantagens');

        // Act & Assert: Tentar adicionar a 6ª vantagem deve ser bloqueado
        assert.throws(
            function () {
                controller.addAdvantage({ nome: 'Vantagem 6', custo: 1 });
            },
            /quantidade máxima de vantagens que pode colocar é 5/,
            'Controller bloqueia adição de mais de 5 vantagens inicialmente'
        );

        // Act: Remoção de vantagem e desvantagem
        const removedAdv = controller.removeAdvantage(0);
        assert.equal(removedAdv.nome, 'Vantagem 1', 'Primeira vantagem removida com sucesso');
        assert.equal(controller.data.advantages.length, 4, 'Agora possui 4 vantagens');

        // Após remover, deve permitir adicionar novamente até atingir 5
        controller.addAdvantage({ nome: 'Nova Vantagem Substituta', custo: 1 });
        assert.equal(controller.data.advantages.length, 5, 'Completou novamente 5 vantagens');
    });

    // ========================================================================
    // 5. INTEGRAÇÃO VISUAL & DOM: public/formV6.html
    // ========================================================================

    QUnit.test('5.1 Integração: Elementos de interface e limites no formV6.html (AAA)', function (assert) {
        // Arrange
        const formPath = path.resolve(__dirname, '../public/formV6.html');
        assert.ok(fs.existsSync(formPath), 'public/formV6.html deve existir');

        // Act
        const content = fs.readFileSync(formPath, 'utf-8');

        // Assert
        assert.ok(content.includes('id="advantagePointsValue"'), 'Deve conter elemento contador de Vantagens');
        assert.ok(content.includes('id="disadvantagePointsValue"'), 'Deve conter elemento contador de Desvantagens');
        assert.ok(content.includes('disadvantagesBonus > 5'), 'Deve verificar se pontos de desvantagens excedem 5');
        assert.ok(content.includes('advantages.length > 5'), 'Deve verificar se quantidade de vantagens excede 5');
        assert.ok(content.includes('tempPVDList.length >= 5'), 'Deve conter bloqueio no modal para não exceder 5 vantagens iniciais');
        assert.ok(content.includes('currentBonus + cost > 5'), 'Deve conter bloqueio no modal para não exceder 5 pontos de desvantagens');
        assert.ok(content.includes('Total de Vantagens:'), 'Deve exibir indicador de total de vantagens no modal');
        assert.ok(content.includes('Total de Pontos:'), 'Deve exibir indicador de total de pontos de desvantagens no modal');
    });
});
