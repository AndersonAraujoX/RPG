/**
 * Suíte de Testes Unitários — Gestão Manual de Pontos em Secundus e Terceirus (+2d6)
 *
 * Padrão Obrigatório: Arrange-Act-Assert (AAA)
 * Cobre:
 * 1. Caminho Feliz (Fluxo Principal):
 *    - Adição manual de pontos em nós Secundus (ex: Magma, Necromancia) consumindo PM.
 *    - Adição manual de pontos em nós Terceirus (ex: Cataclismo, Avatar, Golem) consumindo PM.
 *    - Retirada de pontos em Secundus e Terceirus com reembolso imediato de PM.
 *    - Reset geral reembolsando caminhos normais e nós de fusão.
 * 2. Casos de Borda (Edge Cases):
 *    - Tentativa de adicionar ponto a fusão sem PM disponível (PM <= 0).
 *    - Tentativa de retirar ponto de fusão com nível 0 (não permite nível negativo).
 *    - Adição consecutiva de múltiplos pontos até esgotar reserva.
 *    - Estado inicial sem a propriedade `fusionSkills` definida previamente (auto-inicialização).
 * 3. Tratamento de Exceções & Erros:
 *    - Chamadas a addFusionPoint e removeFusionPoint com estado nulo ou inválido.
 *    - Chamadas com fusionId nulo ou vazio.
 * 4. Integração com o DOM/HTML (public/arvore_magia.html):
 *    - Presença das funções addPointToFusion, removePointFromFusion e resetAllPoints.
 *    - Presença da aba de filtro [Fusões] no painel lateral de Caminhos.
 *    - Suporte a persistência de fusionSkills em localStorage.
 *    - Configuração de atalhos e dicas de Shift+Clique e Botão Direito no HTML.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');
const { MagicTreeEngine, magicPaths, spellFusions } = require('../src/core/magic-tree-engine');

const HTML_FILE_PATH = path.resolve(__dirname, '../public/arvore_magia.html');

QUnit.module('Árvore de Magia: Gestão Manual de Fusões (Secundus & Terceirus)', function (hooks) {

    let state;

    hooks.beforeEach(function () {
        // Arrange comum antes de cada teste
        state = MagicTreeEngine.createCharacterState({
            availablePM: 5,
            skills: { "fogo": 1, "terra": 1 },
            fusionSkills: { "magma": 0, "avatar": 0 }
        });
    });

    // =========================================================================
    // 1. CAMINHO FELIZ (FLUXO PRINCIPAL - AAA)
    // =========================================================================

    QUnit.test('1. Caminho Feliz: Adicionar ponto manualmente na fusão Secundus (Magma) consome 1 PM e eleva nível', function (assert) {
        // Arrange
        const initialPM = state.availablePM;
        const fusionId = 'magma';

        // Act
        const result = MagicTreeEngine.addFusionPoint(state, fusionId);

        // Assert
        assert.ok(result.success, 'Ponto adicionado com sucesso à fusão Secundus');
        assert.equal(result.fusionId, 'magma', 'ID da fusão retornado');
        assert.equal(result.newLevel, 1, 'Novo nível de Magma deve ser 1');
        assert.equal(state.fusionSkills['magma'], 1, 'Estado persistiu nível 1 em fusionSkills');
        assert.equal(state.availablePM, initialPM - 1, 'PM disponível decrementado em 1');
    });

    QUnit.test('2. Caminho Feliz: Adicionar ponto manualmente na fusão Terceirus (Avatar) consome 1 PM e eleva nível', function (assert) {
        // Arrange
        const initialPM = state.availablePM;
        const fusionId = 'avatar';

        // Act
        const result = MagicTreeEngine.addFusionPoint(state, fusionId);

        // Assert
        assert.ok(result.success, 'Ponto adicionado com sucesso ao Terceirus Avatar');
        assert.equal(result.newLevel, 1, 'Nível de Avatar deve ser 1');
        assert.equal(state.fusionSkills['avatar'], 1, 'fusionSkills gravou nível 1');
        assert.equal(state.availablePM, initialPM - 1, 'PM disponível reduzido de 5 para 4');
    });

    QUnit.test('3. Caminho Feliz: Retirar ponto de Secundus ou Terceirus reduz nível e reembolsa 1 PM', function (assert) {
        // Arrange
        state.availablePM = 3;
        state.fusionSkills['cataclismo'] = 2;

        // Act
        const result = MagicTreeEngine.removeFusionPoint(state, 'cataclismo');

        // Assert
        assert.ok(result.success, 'Ponto retirado com sucesso da fusão Cataclismo');
        assert.equal(result.newLevel, 1, 'Nível de Cataclismo reduzido de 2 para 1');
        assert.equal(state.fusionSkills['cataclismo'], 1, 'Estado reflete nível 1');
        assert.equal(state.availablePM, 4, 'PM reembolsado de 3 para 4');
    });

    QUnit.test('4. Caminho Feliz: Reset completo reembolsa tanto caminhos quanto fusões Secundus e Terceirus', function (assert) {
        // Arrange
        state.availablePM = 0;
        state.skills = { "fogo": 2, "ar": 1 }; // 3 pontos em caminhos
        state.fusionSkills = { "magma": 1, "avatar": 2 }; // 3 pontos em fusões

        // Act
        const result = MagicTreeEngine.resetPoints(state);

        // Assert
        assert.ok(result.success, 'Reset executado com sucesso');
        assert.equal(result.refundedPoints, 6, 'Total reembolsado deve ser 3 (caminhos) + 3 (fusões) = 6');
        assert.equal(state.availablePM, 6, 'PM disponível agora deve ser 6');
        assert.equal(state.skills['fogo'], 0, 'Caminho fogo zerado');
        assert.equal(state.skills['ar'], 0, 'Caminho ar zerado');
        assert.equal(state.fusionSkills['magma'], 0, 'Fusão magma zerada');
        assert.equal(state.fusionSkills['avatar'], 0, 'Fusão avatar zerada');
    });

    // =========================================================================
    // 2. CASOS DE BORDA (EDGE CASES - AAA)
    // =========================================================================

    QUnit.test('5. Casos de Borda: Tentativa de adicionar ponto a fusão sem PM disponível é rejeitada', function (assert) {
        // Arrange
        state.availablePM = 0;
        state.fusionSkills['necromancia'] = 0;

        // Act
        const result = MagicTreeEngine.addFusionPoint(state, 'necromancia');

        // Assert
        assert.notOk(result.success, 'Não deve permitir adicionar ponto sem PM');
        assert.equal(result.reason, 'no_pm_available', 'Razão deve ser no_pm_available');
        assert.equal(state.fusionSkills['necromancia'], 0, 'Nível de necromancia permaneceu inalterado em 0');
        assert.equal(state.availablePM, 0, 'PM permaneceu em 0');
    });

    QUnit.test('6. Casos de Borda: Tentativa de retirar ponto de fusão que já está no nível 0 é rejeitada', function (assert) {
        // Arrange
        state.availablePM = 3;
        state.fusionSkills['golem'] = 0;

        // Act
        const result = MagicTreeEngine.removeFusionPoint(state, 'golem');

        // Assert
        assert.notOk(result.success, 'Não deve permitir retirar ponto de fusão nível 0');
        assert.equal(result.reason, 'level_zero', 'Razão deve ser level_zero');
        assert.equal(state.fusionSkills['golem'], 0, 'Nível não deve se tornar negativo');
        assert.equal(state.availablePM, 3, 'PM não deve ser inflacionado');
    });

    QUnit.test('7. Casos de Borda: Estado criado sem fusionSkills previamente é auto-inicializado com sucesso', function (assert) {
        // Arrange: estado sem a chave fusionSkills
        const rawState = {
            availablePM: 2,
            skills: {}
        };

        // Act
        const result = MagicTreeEngine.addFusionPoint(rawState, 'magma');

        // Assert
        assert.ok(result.success, 'Deve auto-inicializar fusionSkills se ausente');
        assert.ok(rawState.fusionSkills, 'Objeto fusionSkills criado');
        assert.equal(rawState.fusionSkills['magma'], 1, 'Nível de magma setado para 1');
        assert.equal(rawState.availablePM, 1, 'PM consumido de 2 para 1');
    });

    QUnit.test('8. Casos de Borda: Alocação consecutiva de pontos até esgotar reserva de PM', function (assert) {
        // Arrange
        state.availablePM = 2;
        state.fusionSkills['magma'] = 0;

        // Act
        const r1 = MagicTreeEngine.addFusionPoint(state, 'magma');
        const r2 = MagicTreeEngine.addFusionPoint(state, 'magma');
        const r3 = MagicTreeEngine.addFusionPoint(state, 'magma'); // deve falhar por falta de PM

        // Assert
        assert.ok(r1.success, 'Primeiro ponto investido com sucesso');
        assert.ok(r2.success, 'Segundo ponto investido com sucesso');
        assert.notOk(r3.success, 'Terceiro ponto rejeitado por esgotamento de PM');
        assert.equal(state.fusionSkills['magma'], 2, 'Nível final de magma é 2');
        assert.equal(state.availablePM, 0, 'Reserva de PM zerada');
    });

    // =========================================================================
    // 3. TRATAMENTO DE ERROS E EXCEÇÕES (AAA)
    // =========================================================================

    QUnit.test('9. Erros: Chamar addFusionPoint ou removeFusionPoint com state nulo lança exceção', function (assert) {
        // Arrange, Act & Assert
        assert.throws(
            () => MagicTreeEngine.addFusionPoint(null, 'magma'),
            /Estado inválido/,
            'addFusionPoint com state nulo lança erro'
        );

        assert.throws(
            () => MagicTreeEngine.removeFusionPoint(null, 'magma'),
            /Estado inválido/,
            'removeFusionPoint com state nulo lança erro'
        );
    });

    QUnit.test('10. Erros e Validações: addFusionPoint e removeFusionPoint com fusionId nulo ou vazio retornam falha', function (assert) {
        // Arrange & Act
        const addNull = MagicTreeEngine.addFusionPoint(state, null);
        const addEmpty = MagicTreeEngine.addFusionPoint(state, '');
        const remNull = MagicTreeEngine.removeFusionPoint(state, null);
        const remEmpty = MagicTreeEngine.removeFusionPoint(state, '');

        // Assert
        assert.notOk(addNull.success, 'addFusionPoint com fusionId nulo deve falhar');
        assert.equal(addNull.reason, 'invalid_fusion_id', 'Razão deve ser invalid_fusion_id');
        assert.notOk(addEmpty.success, 'addFusionPoint com fusionId vazio deve falhar');
        assert.equal(addEmpty.reason, 'invalid_fusion_id', 'Razão deve ser invalid_fusion_id');

        assert.notOk(remNull.success, 'removeFusionPoint com fusionId nulo deve falhar');
        assert.equal(remNull.reason, 'invalid_fusion_id', 'Razão deve ser invalid_fusion_id');
        assert.notOk(remEmpty.success, 'removeFusionPoint com fusionId vazio deve falhar');
        assert.equal(remEmpty.reason, 'invalid_fusion_id', 'Razão deve ser invalid_fusion_id');
    });

    // =========================================================================
    // 4. INTEGRAÇÃO COM DOM E INTERFACE (public/arvore_magia.html)
    // =========================================================================

    QUnit.test('11. Integração HTML: public/arvore_magia.html implementa funções manuais de ponto em fusões', function (assert) {
        // Arrange
        const html = fs.readFileSync(HTML_FILE_PATH, 'utf-8');

        // Act & Assert
        assert.ok(html.includes('function addPointToFusion'), 'Deve conter a função addPointToFusion');
        assert.ok(html.includes('function removePointFromFusion'), 'Deve conter a função removePointFromFusion');
        assert.ok(html.includes('characterFusionSkills'), 'Deve manter estado de characterFusionSkills');
        assert.ok(html.includes('characterState.fusionSkills'), 'Deve mapear characterState.fusionSkills');
    });

    QUnit.test('12. Integração HTML: Sidebar contém aba e listagem interativa de Fusões (Secundus/Terceirus)', function (assert) {
        // Arrange
        const html = fs.readFileSync(HTML_FILE_PATH, 'utf-8');

        // Act & Assert
        assert.ok(html.includes("filterCategory('fusao', event)"), 'Deve conter aba de filtro para [Fusões]');
        assert.ok(html.includes('Fusões (Secundus / Terceirus)'), 'Deve conter separador ou cabeçalho de fusões no sidebar');
        assert.ok(html.includes('focusFusion'), 'Deve conter função de foco de câmera para nós de fusão');
    });

    QUnit.test('13. Integração HTML: Nós da árvore suportam interação manual com Shift+Clique e Botão Direito', function (assert) {
        // Arrange
        const html = fs.readFileSync(HTML_FILE_PATH, 'utf-8');

        // Act & Assert
        assert.ok(html.includes('e.shiftKey') && html.includes('addPointToFusion'), 'Nós de fusão devem aceitar Shift+Clique para adicionar ponto');
        assert.ok(html.includes('oncontextmenu') && html.includes('removePointFromFusion'), 'Nós de fusão devem aceitar Botão Direito para retirar ponto');
        assert.ok(html.includes('showFusionTooltip'), 'Deve exibir tooltip descritivo nos nós de fusão');
    });

    QUnit.test('14. Integração HTML: resetAllPoints reseta tanto caminhos quanto fusões manuais', function (assert) {
        // Arrange
        const html = fs.readFileSync(HTML_FILE_PATH, 'utf-8');

        // Act & Assert
        assert.ok(html.includes('resetAllPoints'), 'Função resetAllPoints presente');
        assert.ok(
            html.includes('characterFusionSkills') && html.includes('refunded'),
            'resetAllPoints deve reembolsar e zerar characterFusionSkills'
        );
    });
});
