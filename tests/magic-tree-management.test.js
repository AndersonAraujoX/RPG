/**
 * Suíte de Testes Unitários — Gestão da Árvore de Magia, Retirada de Pontos e Grimório de Fusão (+2d6)
 *
 * Padrão: Arrange-Act-Assert (AAA)
 * Cobre:
 * 1. Caminho Feliz:
 *    - Adição de pontos em caminhos (consome PM, eleva nível).
 *    - Retirada de pontos em caminhos (reduz nível, reembolsa PM).
 *    - Síntese de fusão e adição de habilidade ao Grimório do personagem.
 *    - Listagem e remoção de habilidades do Grimório.
 *    - Rolagens de teste +2d6 com a habilidade fundida.
 * 2. Casos de Borda (Edge Cases):
 *    - Retirar ponto quando nível já é 0 (não permite nível negativo nem duplica PM).
 *    - Adicionar ponto sem PM disponível (PM <= 0).
 *    - Caminhos inexistentes, nulos ou strings inválidas.
 *    - Fusão com caminhos na ordem inversa (p1+p2 vs p2+p1).
 *    - Adição de habilidade sem nome ou com campos padrão/vazios.
 *    - Reset de pontos com reembolso total de PM.
 * 3. Tratamento de Exceções & Validações:
 *    - Estado nulo ou inválido lança erro ou trata graciosamente.
 *    - Suporte a UMD e conformidade com arquivos HTML da árvore.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');
const { MagicTreeEngine, magicPaths, magicForms, spellFusions } = require('../src/core/magic-tree-engine');

const PUBLIC_TREE_PATH = path.resolve(__dirname, '../public/arvore_magia.html');

QUnit.module('Árvore de Habilidades & Fusão: Gestão de Pontos e Grimório (MagicTreeEngine)', function (hooks) {

    let state;

    hooks.beforeEach(function () {
        // Arrange comum antes de cada teste
        state = MagicTreeEngine.createCharacterState({
            availablePM: 4,
            skills: { "fogo": 2, "luz": 1, "metamagia": 0 },
            learnedAbilities: []
        });
    });

    // =========================================================================
    // 1. CAMINHO FELIZ (FLUXO PRINCIPAL - AAA)
    // =========================================================================

    QUnit.test('1. Caminho Feliz: Adicionar ponto consome 1 PM e incrementa nível do caminho', function (assert) {
        // Arrange
        const initialPM = state.availablePM;
        const initialLevel = state.skills['fogo'];

        // Act
        const result = MagicTreeEngine.addPoint(state, 'fogo');

        // Assert
        assert.ok(result.success, 'Adição de ponto concluída com sucesso');
        assert.equal(state.skills['fogo'], initialLevel + 1, 'Nível de fogo deve aumentar em 1');
        assert.equal(state.availablePM, initialPM - 1, 'PM disponível deve diminuir em 1');
        assert.equal(result.newLevel, initialLevel + 1, 'Resultado deve reportar o novo nível');
    });

    QUnit.test('2. Caminho Feliz: Retirar ponto reduz nível e reembolsa 1 PM para a reserva', function (assert) {
        // Arrange: fogo começa no nível 2 e PM em 4
        const initialPM = state.availablePM;
        const initialLevel = state.skills['fogo'];

        // Act: retirar ponto de fogo
        const result = MagicTreeEngine.removePoint(state, 'fogo');

        // Assert
        assert.ok(result.success, 'Retirada de ponto concluída com sucesso');
        assert.equal(state.skills['fogo'], initialLevel - 1, 'Nível de fogo deve diminuir em 1');
        assert.equal(state.availablePM, initialPM + 1, 'PM disponível deve ser reembolsado (+1)');
        assert.equal(result.newLevel, initialLevel - 1, 'Resultado deve reportar novo nível');
    });

    QUnit.test('3. Caminho Feliz: Fusão entre dois caminhos e adição da habilidade ao Grimório', function (assert) {
        // Arrange: sintetizar fusão entre Fogo e Terra na forma Criar
        const fusion = MagicTreeEngine.getFusion('fogo', 'terra', 'Criar', state.skills);
        assert.ok(fusion, 'Fusão deve ser gerada');
        assert.equal(fusion.spell, 'Lança de Magma', 'Nome oficial da magia de Fogo+Terra (Criar)');

        // Act: adicionar ao Grimório
        const addResult = MagicTreeEngine.addLearnedAbility(state, fusion);

        // Assert
        assert.ok(addResult.success, 'Habilidade deve ser adicionada com sucesso');
        assert.equal(state.learnedAbilities.length, 1, 'Grimório deve conter 1 habilidade');
        assert.equal(state.learnedAbilities[0].spell, 'Lança de Magma', 'Magia salva corretamente');
        assert.equal(state.learnedAbilities[0].forma, 'Criar', 'Forma registrada');
        assert.equal(state.learnedAbilities[0].cd, 11, 'CD registrada');
        assert.equal(state.learnedAbilities[0].pe, 4, 'Custo de PE registrado');
    });

    QUnit.test('4. Caminho Feliz: Remoção de habilidade aprendida do Grimório', function (assert) {
        // Arrange
        const fusion = MagicTreeEngine.getFusion('agua', 'ar', 'Criar', state.skills);
        MagicTreeEngine.addLearnedAbility(state, fusion);
        const abilityId = state.learnedAbilities[0].id;
        assert.equal(state.learnedAbilities.length, 1);

        // Act
        const removeResult = MagicTreeEngine.removeLearnedAbility(state, abilityId);

        // Assert
        assert.ok(removeResult.success, 'Habilidade deve ser removida com sucesso');
        assert.equal(state.learnedAbilities.length, 0, 'Grimório deve ficar vazio');
        assert.equal(removeResult.removedId, abilityId, 'ID removido deve ser reportado');
    });

    QUnit.test('5. Caminho Feliz: Resolução matemática de rolagem +2d6 com a habilidade', function (assert) {
        // Arrange & Act
        const critRoll = MagicTreeEngine.resolveRoll(6, 6, 2, 10);
        const fumbleRoll = MagicTreeEngine.resolveRoll(1, 1, 10, 5);
        const normalSuccess = MagicTreeEngine.resolveRoll(4, 5, 2, 11);
        const normalFail = MagicTreeEngine.resolveRoll(2, 3, 1, 10);

        // Assert
        assert.ok(critRoll.isCritical && critRoll.isSuccess, '6+6 = 12 é acerto crítico');
        assert.ok(fumbleRoll.isFumble && !fumbleRoll.isSuccess, '1+1 = 2 é falha crítica');
        assert.ok(normalSuccess.isSuccess, '4+5+2 = 11 vs CD 11 é sucesso normal');
        assert.notOk(normalFail.isSuccess, '2+3+1 = 6 vs CD 10 é falha');
    });

    // =========================================================================
    // 2. CASOS DE BORDA (EDGE CASES)
    // =========================================================================

    QUnit.test('6. Borda: Retirar ponto de caminho com nível 0 não deve permitir negativos nem duplicar PM', function (assert) {
        // Arrange: metamagia tem nível 0
        assert.equal(state.skills['metamagia'], 0);
        const initialPM = state.availablePM;

        // Act
        const result = MagicTreeEngine.removePoint(state, 'metamagia');

        // Assert
        assert.notOk(result.success, 'Não deve permitir retirar ponto de nível 0');
        assert.equal(result.reason, 'level_zero', 'Razão deve ser level_zero');
        assert.equal(state.skills['metamagia'], 0, 'Nível deve permanecer 0');
        assert.equal(state.availablePM, initialPM, 'PM não deve ser alterado');
    });

    QUnit.test('7. Borda: Adicionar ponto sem PM disponível deve falhar graciosamente', function (assert) {
        // Arrange: zerar PM
        state.availablePM = 0;
        const initialLevel = state.skills['fogo'];

        // Act
        const result = MagicTreeEngine.addPoint(state, 'fogo');

        // Assert
        assert.notOk(result.success, 'Não deve adicionar ponto sem PM');
        assert.equal(result.reason, 'no_pm_available', 'Razão deve ser no_pm_available');
        assert.equal(state.skills['fogo'], initialLevel, 'Nível de fogo não deve alterar');
    });

    QUnit.test('8. Borda: Caminho inválido, nulo ou inexistente em addPoint e removePoint', function (assert) {
        // Arrange & Act
        const resAddNull = MagicTreeEngine.addPoint(state, null);
        const resAddFake = MagicTreeEngine.addPoint(state, 'caminho_inexistente');
        const resRemNull = MagicTreeEngine.removePoint(state, null);
        const resRemFake = MagicTreeEngine.removePoint(state, 'caminho_inexistente');

        // Assert
        assert.notOk(resAddNull.success, 'addPoint com null deve falhar');
        assert.notOk(resAddFake.success, 'addPoint com caminho inexistente deve falhar');
        assert.notOk(resRemNull.success, 'removePoint com null deve falhar');
        assert.notOk(resRemFake.success, 'removePoint com caminho inexistente deve falhar');
    });

    QUnit.test('9. Borda: Fusão é comutativa (ordem p1+p2 e p2+p1 produzem mesmo resultado)', function (assert) {
        // Arrange & Act
        const fusao1 = MagicTreeEngine.getFusion('fogo', 'ar', 'Criar', state.skills);
        const fusao2 = MagicTreeEngine.getFusion('ar', 'fogo', 'Criar', state.skills);

        // Assert
        assert.equal(fusao1.spell, fusao2.spell, 'Fogo+Ar e Ar+Fogo produzem a mesma magia');
        assert.equal(fusao1.cd, fusao2.cd, 'CDs devem ser idênticas');
        assert.equal(fusao1.pe, fusao2.pe, 'PEs devem ser idênticos');
    });

    QUnit.test('10. Borda: Adicionar habilidade vazia ou sem nome deve retornar erro', function (assert) {
        // Arrange & Act
        const resNull = MagicTreeEngine.addLearnedAbility(state, null);
        const resEmpty = MagicTreeEngine.addLearnedAbility(state, { spell: '   ' });

        // Assert
        assert.notOk(resNull.success, 'Habilidade nula rejeitada');
        assert.notOk(resEmpty.success, 'Habilidade sem nome rejeitada');
        assert.equal(state.learnedAbilities.length, 0, 'Nenhuma habilidade adicionada');
    });

    QUnit.test('11. Borda: Reset de pontos devolve todos os pontos investidos para a reserva', function (assert) {
        // Arrange: fogo=2, luz=1 (total 3 investidos), PM=4 -> total 7
        const totalExpected = state.availablePM + state.skills['fogo'] + state.skills['luz'];

        // Act
        const resetRes = MagicTreeEngine.resetPoints(state);

        // Assert
        assert.ok(resetRes.success, 'Reset com sucesso');
        assert.equal(resetRes.refundedPoints, 3, '3 pontos devolvidos');
        assert.equal(state.availablePM, totalExpected, 'PM total deve ser 7');
        assert.equal(state.skills['fogo'], 0, 'Fogo zerado');
        assert.equal(state.skills['luz'], 0, 'Luz zerada');
    });

    // =========================================================================
    // 3. CÁLCULO DE PM POR POD E SINCRONIZAÇÃO COM FICHA DE PERSONAGEM (AAA)
    // =========================================================================

    QUnit.test('14. Caminho Feliz: calculatePMFromPOD calcula PMs baseados no atributo POD (+2d6)', function (assert) {
        // Arrange
        const podValues = [1, 2, 3, 4, 5];

        // Act & Assert
        podValues.forEach(pod => {
            const calculatedPM = MagicTreeEngine.calculatePMFromPOD(pod);
            assert.equal(calculatedPM, pod * 2, `POD ${pod} deve conceder ${pod * 2} PMs`);
        });
    });

    QUnit.test('15. Caminho Feliz: syncWithSheet sincroniza atributos e caminhos da ficha com a árvore', function (assert) {
        // Arrange
        const mockSheet = {
            charName: 'Elidor o Feiticeiro',
            pod: 3,
            caminhosMagia: [
                { nome: 'Magia (Fogo)', nivel: 2 },
                { nome: 'Magia (Luz)', nivel: 1 }
            ]
        };

        // Act
        const syncResult = MagicTreeEngine.syncWithSheet(state, mockSheet);

        // Assert
        assert.ok(syncResult.success, 'Sincronização com ficha bem-sucedida');
        assert.equal(syncResult.charName, 'Elidor o Feiticeiro', 'Nome do personagem importado');
        assert.equal(syncResult.pod, 3, 'POD 3 importado');
        assert.equal(syncResult.totalPM, 6, 'Total de PM deve ser 3 * 2 = 6');
        assert.equal(syncResult.pointsSpent, 3, 'Pontos gastos: 2 em fogo + 1 em luz = 3');
        assert.equal(syncResult.availablePM, 3, 'PMs restantes disponíveis: 6 - 3 = 3');
        assert.equal(state.skills['fogo'], 2, 'Nível de fogo sincronizado para 2');
        assert.equal(state.skills['luz'], 1, 'Nível de luz sincronizado para 1');
        assert.equal(state.availablePM, 3, 'Estado da árvore atualizado com PMs disponíveis');
    });

    QUnit.test('16. Casos de Borda: normalizePathKey trata acentos, formatos irregulares e maiúsculas', function (assert) {
        // Arrange & Act
        const fogo1 = MagicTreeEngine.normalizePathKey('Magia (Fogo)');
        const fogo2 = MagicTreeEngine.normalizePathKey('fogo');
        const agua = MagicTreeEngine.normalizePathKey('Magia (Água)');
        const arkanum = MagicTreeEngine.normalizePathKey('arkanum');
        const invalido = MagicTreeEngine.normalizePathKey('Magia (Inexistente)');
        const nulo = MagicTreeEngine.normalizePathKey(null);

        // Assert
        assert.equal(fogo1, 'fogo', 'Magia (Fogo) normalizado para fogo');
        assert.equal(fogo2, 'fogo', 'fogo normalizado para fogo');
        assert.equal(agua, 'agua', 'Magia (Água) normalizado para agua sem acento');
        assert.equal(arkanum, 'arkanum', 'arkanum normalizado para arkanum');
        assert.equal(invalido, null, 'Caminho inexistente retorna null');
        assert.equal(nulo, null, 'Entrada nula retorna null');
    });

    QUnit.test('17. Casos de Borda: Ficha com dados mínimos, POD nulo, negativo ou sem caminhos', function (assert) {
        // Arrange: Ficha vazia ou com tipos heterogêneos
        const emptySheet = {};
        const negativePodSheet = { pod: -2 };
        const stringPodSheet = { pod: '4' };

        // Act
        const emptyRes = MagicTreeEngine.calculatePMFromSheet(emptySheet);
        const negRes = MagicTreeEngine.calculatePMFromSheet(negativePodSheet);
        const strRes = MagicTreeEngine.calculatePMFromSheet(stringPodSheet);

        // Assert
        assert.equal(emptyRes.pod, 2, 'Fallback padrão para POD em ficha vazia é 2');
        assert.equal(emptyRes.totalPM, 4, 'Total de PM para POD padrão é 4');
        assert.equal(negRes.pod, 0, 'POD negativo é normalizado para 0');
        assert.equal(negRes.totalPM, 0, 'Total de PM para POD 0 é 0');
        assert.equal(strRes.pod, 4, 'String numérica "4" é convertida para 4');
        assert.equal(strRes.totalPM, 8, 'Total de PM para POD 4 é 8');
    });

    // =========================================================================
    // 4. TRATAMENTO DE ERROS E INTEGRAÇÃO DOM / HTML
    // =========================================================================

    QUnit.test('18. Erros: calculatePMFromSheet e syncWithSheet lançam erro com argumentos nulos', function (assert) {
        assert.throws(() => MagicTreeEngine.calculatePMFromSheet(null), /sheetData inválido/, 'sheetData nulo lança erro');
        assert.throws(() => MagicTreeEngine.syncWithSheet(null, {}), /Estado inválido/, 'state nulo em sync lança erro');
        assert.throws(() => MagicTreeEngine.addPoint(null, 'fogo'), /Estado inválido/, 'addPoint com state nulo lança erro');
        assert.throws(() => MagicTreeEngine.removePoint(null, 'fogo'), /Estado inválido/, 'removePoint com state nulo lança erro');
        assert.throws(() => MagicTreeEngine.resetPoints(null), /Estado inválido/, 'resetPoints com state nulo lança erro');
    });

    QUnit.test('19. Integração HTML: public/arvore_magia.html contém botões de gestão de pontos, grimório e vincular ficha', function (assert) {
        const html = fs.readFileSync(PUBLIC_TREE_PATH, 'utf-8');

        assert.ok(html.includes('MagicTreeEngine') || html.includes('removePointFromPath'), 'Deve conter suporte a remoção de pontos');
        assert.ok(html.includes('learnActiveFusionAbility') || html.includes('Grimório'), 'Deve conter suporte a adicionar habilidades de fusão');
        assert.ok(html.includes('adjustPMTotal') || html.includes('pm-display'), 'Deve conter controle de ajuste de PM total');
    });
});
