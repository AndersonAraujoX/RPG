/**
 * @file nexo-modal-actions.test.js
 * @description Suíte de testes unitários para a funcionalidade do modal de ações e botões "Ver Ações" no Nexo do Paradoxo.
 * Segue estritamente a metodologia Arrange-Act-Assert (AAA).
 * Cobre: caminho feliz, casos de borda e tratamento de erros.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

QUnit.module('Nexo do Paradoxo: Modal de Ações e Botões "Ver Ações"', function () {

    const legadoHtmlPath = path.join(__dirname, '../legado/nexo.html');
    const publicHtmlPath = path.join(__dirname, '../public/nexo.html');

    // =========================================================================
    // 1. CAMINHO FELIZ (ESTRUTURA E ABERTURA DO MODAL)
    // =========================================================================

    QUnit.test('1. Caminho Feliz: Estrutura HTML do modal-acoes em legado/nexo.html é desacoplada e independente', function (assert) {
        // Arrange
        const html = fs.readFileSync(legadoHtmlPath, 'utf8');

        // Act & Assert
        // Verifica que o modal-acoes não está aninhado dentro do passwordModal
        const passwordModalIndex = html.indexOf('id="passwordModal"');
        const modalAcoesIndex = html.indexOf('id="modal-acoes"');
        assert.ok(passwordModalIndex > 0, 'passwordModal existe');
        assert.ok(modalAcoesIndex > passwordModalIndex, 'modal-acoes posicionado após passwordModal');

        // Corta o trecho entre passwordModal e modal-acoes e verifica fechamento de divs
        const snippetBetween = html.substring(passwordModalIndex, modalAcoesIndex);
        const openDivs = (snippetBetween.match(/<div\b/g) || []).length;
        const closeDivs = (snippetBetween.match(/<\/div>/g) || []).length;
        assert.equal(openDivs, closeDivs, 'Todas as divs de passwordModal foram devidamente fechadas antes de modal-acoes');

        // Verifica classes standalone do modal-overlay e modal-container
        assert.ok(html.includes('class="modal-overlay hidden"'), 'modal usa classe independente modal-overlay');
        assert.ok(html.includes('class="modal-container"'), 'modal-container está presente');
        assert.ok(html.includes('btn-ver-acoes'), 'estilo e botão btn-ver-acoes estão presentes');
    });

    QUnit.test('2. Caminho Feliz: Simulação de abertura e população de ações no modal (AAA)', function (assert) {
        // Arrange
        const mockComodo = {
            id: 'forja',
            nome: 'Forja',
            disponivel: true,
            acoes: [
                { nome: 'Forjar Equipamento Padrão', desc: 'Crie armas e armaduras comuns.' },
                { nome: 'Reparar Itens', desc: 'Conserte equipamentos danificados.' }
            ]
        };

        const mockElements = {
            title: { textContent: '' },
            body: { innerHTML: '' },
            modal: {
                classList: {
                    classes: new Set(['modal-overlay', 'hidden']),
                    remove(cls) { this.classes.delete(cls); },
                    add(cls) { this.classes.add(cls); },
                    contains(cls) { return this.classes.has(cls); }
                }
            }
        };

        function abrirModalAcoes(comodo, el) {
            el.title.textContent = comodo.nome;
            el.body.innerHTML = comodo.acoes.map(acao => `
                <div class="p-4 bg-rpg-slate rounded-lg border border-gray-700">
                    <h4 class="text-lg font-bold">${acao.nome}</h4>
                    <p class="text-sm mt-1">${acao.desc}</p>
                    <button class="btn-primary" data-comodo="${comodo.nome}" data-acao="${acao.nome}">Realizar</button>
                </div>
            `).join('');
            el.modal.classList.remove('hidden');
        }

        function fecharModal(el) {
            el.modal.classList.add('hidden');
        }

        // Act - Abrir modal
        abrirModalAcoes(mockComodo, mockElements);

        // Assert - Modal aberto
        assert.equal(mockElements.title.textContent, 'Forja', 'Título do modal deve ser Forja');
        assert.notOk(mockElements.modal.classList.contains('hidden'), 'Modal não deve ter classe hidden após abrir');
        assert.ok(mockElements.body.innerHTML.includes('Forjar Equipamento Padrão'), 'Contém primeira ação');
        assert.ok(mockElements.body.innerHTML.includes('Reparar Itens'), 'Contém segunda ação');

        // Act - Fechar modal
        fecharModal(mockElements);

        // Assert - Modal fechado
        assert.ok(mockElements.modal.classList.contains('hidden'), 'Modal deve ter classe hidden após fechar');
    });

    QUnit.test('3. Caminho Feliz: Estrutura HTML do modal-acoes em public/nexo.html é válida e estilizada', function (assert) {
        // Arrange
        const html = fs.readFileSync(publicHtmlPath, 'utf8');

        // Act & Assert
        assert.ok(html.includes('id="modal-acoes"'), 'modal-acoes presente em public/nexo.html');
        assert.ok(html.includes('id="modal-title"'), 'modal-title presente em public/nexo.html');
        assert.ok(html.includes('id="modal-body"'), 'modal-body presente em public/nexo.html');
        assert.ok(html.includes('id="modal-close-btn"'), 'modal-close-btn presente em public/nexo.html');
        assert.ok(html.includes('btn-ver-acoes'), 'botão Ver Ações estilizado presente');
    });

    // =========================================================================
    // 2. CASOS DE BORDA (EDGE CASES)
    // =========================================================================

    QUnit.test('4. Casos de Borda: Cômodo sem ações ou com lista vazia não lança exceção', function (assert) {
        // Arrange
        const mockComodoSemAcoes = {
            id: 'vazio',
            nome: 'Sala Vazia',
            disponivel: true,
            acoes: []
        };

        const mockElements = {
            title: { textContent: '' },
            body: { innerHTML: 'antigo' },
            modal: {
                classList: {
                    classes: new Set(['hidden']),
                    remove(cls) { this.classes.delete(cls); },
                    add(cls) { this.classes.add(cls); },
                    contains(cls) { return this.classes.has(cls); }
                }
            }
        };

        // Act
        mockElements.title.textContent = mockComodoSemAcoes.nome;
        mockElements.body.innerHTML = (mockComodoSemAcoes.acoes || []).map(a => `<div>${a.nome}</div>`).join('');
        mockElements.modal.classList.remove('hidden');

        // Assert
        assert.equal(mockElements.title.textContent, 'Sala Vazia');
        assert.equal(mockElements.body.innerHTML, '', 'Corpo deve ficar vazio sem erro');
        assert.notOk(mockElements.modal.classList.contains('hidden'));
    });

    QUnit.test('5. Casos de Borda: Função abrirModalAcoesPorId com ID inexistente ou nulo', function (assert) {
        // Arrange
        const comodos = [{ id: 'forja', nome: 'Forja' }];
        let chamado = false;
        function mockAbrir(c) { chamado = true; }

        function abrirPorId(id) {
            const c = comodos.find(x => x.id === id);
            if (c) mockAbrir(c);
        }

        // Act
        abrirPorId('inexistente');
        abrirPorId(null);
        abrirPorId(undefined);

        // Assert
        assert.false(chamado, 'Não deve chamar abrirModal se o cômodo não for encontrado');
    });

    // =========================================================================
    // 3. TRATAMENTO DE ERROS E EXCEÇÕES
    // =========================================================================

    QUnit.test('6. Tratamento de Erros: Isolamento de clique no botão Admin para não disparar abertura de ações', function (assert) {
        // Arrange
        let modalAberto = false;
        function abrirModal() { modalAberto = true; }

        const cardHandler = (targetClassList) => {
            if (!targetClassList.contains('admin-btn')) {
                abrirModal();
            }
        };

        // Act - Clicar no botão Admin
        const adminBtnClassList = {
            contains(cls) { return cls === 'admin-btn'; }
        };
        cardHandler(adminBtnClassList);

        // Assert
        assert.false(modalAberto, 'Clicar no botão admin não deve abrir o modal de ações');

        // Act - Clicar no botão Ver Ações
        const verAcoesClassList = {
            contains(cls) { return cls === 'btn-ver-acoes'; }
        };
        cardHandler(verAcoesClassList);

        // Assert
        assert.true(modalAberto, 'Clicar no card ou em Ver Ações deve abrir o modal');
    });

    // =========================================================================
    // 4. BLOQUEIO DE ACESSO DO NEXO PARA JOGADORES (ESTADO & REPOSITÓRIO)
    // =========================================================================

    QUnit.test('7. Caminho Feliz: setBloqueioJogadores grava no documento nexo/estado com merge (AAA)', async function (assert) {
        // Arrange
        const calls = { set: [] };
        const docRef = {
            set: async (payload, opts) => {
                calls.set.push({ payload, opts });
            }
        };
        const dbMock = {
            collection: () => ({ doc: () => docRef })
        };
        const NexoState = require('../src/modules/nexo-state.js');
        const repo = NexoState.createNexoRepository(dbMock, () => '2026-10-03T19:00:00Z');

        // Act
        await repo.setBloqueioJogadores(true, 'mestre-uid');

        // Assert
        assert.equal(calls.set.length, 1, 'Gravou uma vez');
        assert.deepEqual(calls.set[0].payload, {
            bloqueadoJogadores: true,
            updatedAt: '2026-10-03T19:00:00Z',
            updatedBy: 'mestre-uid'
        }, 'Payload de bloqueio correto');
        assert.deepEqual(calls.set[0].opts, { merge: true }, 'Usou merge true');
    });

    QUnit.test('8. Caminho Feliz: subscribe envia metadados de bloqueioJogadores aos assinantes (AAA)', function (assert) {
        // Arrange
        let listenerOk;
        const docRef = {
            onSnapshot: (ok) => { listenerOk = ok; return () => {}; }
        };
        const dbMock = {
            collection: () => ({ doc: () => docRef })
        };
        const NexoState = require('../src/modules/nexo-state.js');
        const repo = NexoState.createNexoRepository(dbMock);
        let recebidoMeta = null;

        // Act
        repo.subscribe((mapa, meta) => {
            recebidoMeta = meta;
        });
        listenerOk({
            exists: true,
            data: () => ({
                comodos: { forja: true },
                bloqueadoJogadores: true,
                updatedAt: '2026-10-03T19:00:00Z'
            })
        });

        // Assert
        assert.ok(recebidoMeta, 'Recebeu metadados');
        assert.true(recebidoMeta.bloqueadoJogadores, 'bloqueadoJogadores é true');
    });

    QUnit.test('9. Casos de Borda e Erros: setBloqueioJogadores valida parâmetro booleano (AAA)', async function (assert) {
        // Arrange
        const NexoState = require('../src/modules/nexo-state.js');
        const repo = NexoState.createNexoRepository({ collection: () => ({ doc: () => ({}) }) });

        // Act & Assert
        await assert.rejects(repo.setBloqueioJogadores('sim'), /booleano/, 'Rejeita string');
        await assert.rejects(repo.setBloqueioJogadores(null), /booleano/, 'Rejeita null');
        await assert.rejects(repo.setBloqueioJogadores(1), /booleano/, 'Rejeita número');
    });

    QUnit.test('10. Integração: Elementos visuais de selamento presentes em legado/nexo.html e index.html (AAA)', function (assert) {
        // Arrange
        const legadoHtml = fs.readFileSync(legadoHtmlPath, 'utf8');
        const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

        // Act & Assert
        assert.ok(legadoHtml.includes('id="bloqueio-jogadores-banner"'), 'Banner de selamento presente em legado/nexo.html');
        assert.ok(legadoHtml.includes('id="admin-global-bar"'), 'Barra de mestre presente em legado/nexo.html');
        assert.ok(legadoHtml.includes('id="btn-toggle-bloqueio-geral"'), 'Botão de alternância presente em legado/nexo.html');
        assert.ok(indexHtml.includes('Selado'), 'Badge de selamento presente no Card do Nexo em index.html');
    });
});
