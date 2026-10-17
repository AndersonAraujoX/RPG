/**
 * Suíte de Testes Unitários: Novo Design Épico do Menu Principal / Portal de Kuar-Tor
 * Padrão: Arrange-Act-Assert (AAA)
 * Cobertura: Hierarquia Visual, Carved Gold Title, Banner do VTT com Joia, Grade de 10 Tomos,
 *            Acentos Temáticos, Responsividade, Integridade dos Links e Casos de Borda.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const INDEX_HTML_PATH = path.resolve(__dirname, '../index.html');

QUnit.module('Menu Principal: Design Épico Dark Fantasy (index.html)', function () {

    // -------------------------------------------------------------
    // 1. Caminho Feliz: Fundo Escuro, Fontes e Cabeçalho Épico
    // -------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: Tema Escuro, Textura Cartográfica e Título Dourado em Relevo (AAA)', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(INDEX_HTML_PATH), 'index.html deve existir no diretório raiz');
        const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        // Act & Assert
        assert.ok(html.includes('#04070d'), 'Fundo escuro principal (#04070d) configurado');
        assert.ok(html.includes('font-cinzel'), 'Tipografia Cinzel para títulos e botões épicos');
        assert.ok(html.includes('Cinzel:wght@600;700;800;900'), 'Pesos da família Cinzel carregados');
        assert.ok(html.includes('PORTAL DE KUAR-TOR'), 'Título principal presente');
        assert.ok(html.includes('gold-engraved-title') || html.includes('drop-shadow'), 'Efeito de relevo dourado radiante aplicado ao título');
        assert.ok(html.includes('A Última Expedição'), 'Subtítulo da campanha presente');
    });

    // -------------------------------------------------------------
    // 2. Caminho Feliz: Barra de Perfil Centralizada e Placa de Metal
    // -------------------------------------------------------------
    QUnit.test('2. Caminho Feliz: Placa de Perfil do Jogador, Avatar Chanfrado e Status UID (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        // Act & Assert
        assert.ok(html.includes('id="user-info"'), 'Container de informações do usuário presente');
        assert.ok(html.includes('id="user-avatar"'), 'Avatar do usuário presente');
        assert.ok(html.includes('id="user-name"'), 'Elemento para nome do usuário presente');
        assert.ok(html.includes('id="logout-button"'), 'Botão de logout presente');
        assert.ok(html.includes('id="firebase-status-badge"'), 'Badge de status/UID presente');
        assert.ok(html.includes('id="login-link"'), 'Botão de login/perfil alternativo para deslogados');
    });

    // -------------------------------------------------------------
    // 3. Caminho Feliz: Super Banner de Destaque VTT (Mesa Virtual)
    // -------------------------------------------------------------
    QUnit.test('3. Caminho Feliz: Banner VTT com Moldura Ferro Forjado, Joia Central e CTA (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        // Act & Assert
        assert.ok(html.includes('href="public/mesa_virtual.html"'), 'Link direto para a Mesa Virtual 2D');
        assert.ok(html.includes('MESA VIRTUAL (KUAR-TOR VTT 2D)'), 'Título em destaque da Mesa Virtual');
        assert.ok(html.includes('MULTIPLAYER P2P') || html.includes('Multiplayer P2P'), 'Badge Multiplayer P2P');
        assert.ok(html.includes('ENTRAR NA BATALHA (VTT 2D)'), 'Texto do botão de chamada à ação primária');
        assert.ok(html.includes('ruby-gem') || html.includes('rotate-45'), 'Joia/rubi central de ornamento no topo do banner');
    });

    // -------------------------------------------------------------
    // 4. Caminho Feliz: Grade de 10 Tomos e Acentos Temáticos
    // -------------------------------------------------------------
    QUnit.test('4. Caminho Feliz: 10 Tomos da Campanha com Paletas e Ícones Temáticos (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        // Lista dos 10 destinos obrigatórios
        const expectedLinks = [
            'legado/Site/siteV1.1.html',           // 1. O Mundo de Kuar-Tor
            'public/formV6.html',                  // 2. Gerador de Fichas
            'public/arvore_magia.html',            // 3. Biblioteca Arcana
            'legado/Dados/dados.html',              // 4. Tomo dos Dados
            'public/items.html',                   // 5. Gerenciador de Itens
            'legado/nexo.html',                    // 6. O Nexo
            'legado/diario.html',                  // 7. Diário de Expedição
            'legado/computador_de_kuar_tor.html',  // 8. Computador de Kuar-Tor
            'public/puzzles/index.html',           // 9. Salão de Puzzles
            'public/login.html'                    // 10. Login & Sessão
        ];

        // Act & Assert
        expectedLinks.forEach((link, idx) => {
            assert.ok(html.includes(link), `Tomo ${idx + 1} contém link correto: ${link}`);
        });

        // Verificação dos botões temáticos
        assert.ok(html.includes('EXPLORAR A CAMPANHA'), 'Botão Explorar a Campanha presente');
        assert.ok(html.includes('CRIAR PERSONAGEM'), 'Botão Criar Personagem presente');
        assert.ok(html.includes('ABRIR GRIMÓRIO ARCANO'), 'Botão Abrir Grimório Arcana presente');
        assert.ok(html.includes('ROLAR OS DADOS'), 'Botão Rolar os Dados presente');
        assert.ok(html.includes('ACESSAR INVENTÁRIO'), 'Botão Acessar Inventário presente');
        assert.ok(html.includes('ENTRAR NO NEXO (RESTRITO)'), 'Botão Nexo Restrito presente');
        assert.ok(html.includes('ABRIR DIÁRIO'), 'Botão Abrir Diário presente');
        assert.ok(html.includes('ACESSAR COMPUTADOR'), 'Botão Acessar Computador presente');
        assert.ok(html.includes('ENTRAR NO SALÃO'), 'Botão Entrar no Salão presente');
        assert.ok(html.includes('AUTENTICAR'), 'Botão Autenticar presente');
    });

    // -------------------------------------------------------------
    // 5. Casos de Borda: Selo do Nexo, PDFs e Responsividade (Grid)
    // -------------------------------------------------------------
    QUnit.test('5. Casos de Borda: Selo do Nexo, Sub-bar de PDFs e Classes Responsivas (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        // Act & Assert: Nexo Selado
        assert.ok(html.includes('SELADO') || html.includes('Selado'), 'Badge do Nexo Selado deve estar visível');

        // Act & Assert: Links de PDFs no Gerador de Fichas
        const pdfFiles = [
            'medieval2d6-livreto.pdf',
            'Sistema.pdf',
            'Vantagens.pdf',
            'desvantagens.pdf'
        ];
        pdfFiles.forEach(pdf => {
            assert.ok(html.includes(pdf), `Link de download para ${pdf} presente`);
        });

        // Act & Assert: Grid Responsivo (mobile -> tablet -> desktop)
        assert.ok(html.includes('grid-cols-1') && html.includes('lg:grid-cols-3'), 'Grid responsivo configurado para 1 a 3 colunas');
    });

    // -------------------------------------------------------------
    // 6. Tratamento de Exceções & Integridade: Fechamento de Tags e CSS
    // -------------------------------------------------------------
    QUnit.test('6. Integridade Estrutural: Tags Balanceadas e Classes de Efeito Bevel (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        // Act: Contagem de tags essenciais
        const openDivs = (html.match(/<div\b/g) || []).length;
        const closeDivs = (html.match(/<\/div>/g) || []).length;
        const openSections = (html.match(/<section\b/g) || []).length;
        const closeSections = (html.match(/<\/section>/g) || []).length;

        // Assert
        assert.equal(openSections, closeSections, 'Todas as seções <section> devem ser devidamente fechadas');
        assert.equal(openDivs, closeDivs, 'Todas as divs <div> devem ter fechamento correspondente');
        assert.ok(html.includes('tome-card') || html.includes('resource-card'), 'Classe base de cards presente');
    });
});
