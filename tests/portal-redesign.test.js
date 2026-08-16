/**
 * Testes Unitários para o Redesign do Portal de Kuar-Tor e Integração dos Cards da Campanha
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const INDEX_HTML_PATH = path.resolve(__dirname, '../index.html');

QUnit.module('Portal de Kuar-Tor: Redesign & Cards da Campanha', function () {

    QUnit.test('1. Estrutura Visual: Background Atmosférico, Tipografia Cinzel e Glassmorphism', function (assert) {
        assert.ok(fs.existsSync(INDEX_HTML_PATH), 'index.html existe');
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('font-cinzel'), 'Tipografia Cinzel presente');
        assert.ok(content.includes('glass-panel'), 'Painéis com efeito Glassmorphism presentes');
        assert.ok(content.includes('resource-card'), 'Cards ricos de recursos (.resource-card) presentes');
        assert.ok(content.includes('background-image:'), 'Background atmosférico estilizado presente');
    });

    QUnit.test('2. Super Card Hero: Mesa Virtual (Kuar-Tor VTT 2D) com Destaque Épico', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('href="public/mesa_virtual.html"'), 'Link direto para Mesa Virtual 2D');
        assert.ok(content.includes('Multiplayer P2P'), 'Badge de Multiplayer P2P');
        assert.ok(content.includes('ENTRAR NA BATALHA (VTT 2D)'), 'Botão com texto de chamada heróico');
    });

    QUnit.test('3. Grade Completa dos 10 Tomos & Recursos da Campanha', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('legado/Site/siteV1.1.html'), '1. O Mundo de Kuar-Tor presente');
        assert.ok(content.includes('legado/Forms/formV6.html'), '2. Gerador de Fichas presente');
        assert.ok(content.includes('public/arvore_magia.html'), '3. Biblioteca Arcana presente');
        assert.ok(content.includes('legado/Dados/dados.html'), '4. Tomo dos Dados presente');
        assert.ok(content.includes('public/items.html'), '5. Gerenciador de Itens presente');
        assert.ok(content.includes('legado/nexo.html'), '6. O Nexo presente');
        assert.ok(content.includes('legado/diario.html'), '7. Diário de Expedição presente');
        assert.ok(content.includes('legado/computador_de_kuar_tor.html'), '8. Computador de Kuar-Tor presente');
        assert.ok(content.includes('public/puzzles/index.html'), '9. Salão de Puzzles presente');
        assert.ok(content.includes('public/login.html'), '10. Login & Sessão presente');
    });

    QUnit.test('4. Header Limpo, Controle de Sessão e Status do Firebase', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('id="user-info"'), 'Container de perfil do usuário presente');
        assert.ok(content.includes('id="login-link"'), 'Botão de login/perfil presente');
        assert.ok(content.includes('id="firebase-status-badge"'), 'Badge de status do Firebase presente');
        assert.ok(content.includes('id="auth-modal"'), 'Modal de autenticação (Google, E-mail, Convidado) presente');
    });
});
