/**
 * Testes unitários para o Portal Principal em index.html
 * Valida a conexão com todas as páginas do sistema e o link em destaque para a Mesa Virtual (VTT).
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const INDEX_HTML_PATH = path.resolve(__dirname, '../index.html');
const ROOT_DIR = path.resolve(__dirname, '..');

QUnit.module('Portal Principal Hub (index.html)', function () {

    QUnit.test('Arquivo index.html deve existir e atuar como Hub de navegação', function (assert) {
        assert.ok(fs.existsSync(INDEX_HTML_PATH), 'index.html deve existir na raiz');
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('Portal de Kuar-Tor'), 'Título do portal presente');
        assert.ok(content.includes('public/tailwind.css'), 'Deve referenciar o tailwind.css local');
    });

    QUnit.test('Deve conter link de destaque supremo para a Mesa Virtual (VTT)', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('href="public/mesa_virtual.html"'), 'Link para public/mesa_virtual.html presente');
        assert.ok(content.includes('Mesa Virtual (Kuar-Tor VTT 2D)'), 'Título da Mesa Virtual presente');
        assert.ok(content.includes('Multiplayer P2P'), 'Tag de Multiplayer P2P presente');

        // Validar que o arquivo de destino existe
        const vttPath = path.join(ROOT_DIR, 'public/mesa_virtual.html');
        assert.ok(fs.existsSync(vttPath), `Arquivo ${vttPath} deve existir`);
    });

    QUnit.test('Deve conter links válidos para todas as páginas da campanha', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        const expectedLinks = [
            { name: 'Mesa Virtual (VTT)', href: 'public/mesa_virtual.html' },
            { name: 'O Mundo de Kuar-Tor', href: 'legado/Site/siteV1.1.html' },
            { name: 'Gerador de Fichas', href: 'legado/Forms/formV6.html' },
            { name: 'Biblioteca Arcana', href: 'public/arvore_magia.html' },
            { name: 'Tomo dos Dados', href: 'legado/Dados/dados.html' },
            { name: 'Gerenciador de Itens', href: 'public/items.html' },
            { name: 'O Nexo', href: 'legado/nexo.html' },
            { name: 'Diário de Expedição', href: 'legado/diario.html' },
            { name: 'Computador de Kuar-Tor', href: 'legado/computador_de_kuar_tor.html' },
            { name: 'Salão de Puzzles', href: 'public/puzzles/index.html' },
            { name: 'Login', href: 'public/login.html' }
        ];

        expectedLinks.forEach(({ name, href }) => {
            assert.ok(content.includes(`href="${href}"`), `Link para ${name} (${href}) deve estar presente no index.html`);
            const targetPath = path.join(ROOT_DIR, href);
            assert.ok(fs.existsSync(targetPath), `Arquivo alvo ${href} para ${name} deve existir no disco`);
        });
    });

    QUnit.test('Deve conter autenticação e elementos de sessão', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('id="login-link"'), 'Botão de login presente');
        assert.ok(content.includes('id="user-info"'), 'Container de info de usuário presente');
        assert.ok(content.includes('id="logout-button"'), 'Botão de logout presente');
        assert.ok(content.includes('id="nickname-modal"'), 'Modal de codinome presente');
    });
});
