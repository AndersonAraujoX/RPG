/**
 * Suíte de Testes Unitários: Árvore Cósmica Ancestral Bioluminescente (arvore_magia.html)
 * Padrão: Arrange-Act-Assert (AAA)
 * Cobertura: Estrutura da Árvore Ancestral, Raízes e Tronco Bioluminescentes, Galhos Orgânicos SVG,
 *            Nó Central NEXO • 2D6, Nós de Fusão Secundus e Terceirus, e Integridade do DOM.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const ARVORE_HTML_PATH = path.resolve(__dirname, '../public/arvore_magia.html');

QUnit.module('Biblioteca Arcana: Árvore Cósmica Ancestral Bioluminescente (AAA)', function () {

    // -------------------------------------------------------------
    // 1. Caminho Feliz: Presença dos Elementos da Grande Árvore Ancestral
    // -------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: Estrutura SVG da Árvore, Raízes e Galhos Orgânicos (AAA)', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(ARVORE_HTML_PATH), 'public/arvore_magia.html deve existir');
        const html = fs.readFileSync(ARVORE_HTML_PATH, 'utf-8');

        // Act & Assert: Tronco e Raízes
        assert.ok(html.includes('tree-roots-group') || html.includes('tree-roots'), 'Grupo de raízes bioluminescentes presente');
        assert.ok(html.includes('tree-branches-group') || html.includes('tree-branches'), 'Grupo de galhos orgânicos presente');
        assert.ok(html.includes('tree-glow'), 'Filtro de bioluminescência/glow presente no SVG');
    });

    // -------------------------------------------------------------
    // 2. Caminho Feliz: Nó Central NEXO • 2D6 com Duplo Hexágono
    // -------------------------------------------------------------
    QUnit.test('2. Caminho Feliz: Nó Central NEXO • 2D6 com Duplo Hexágono e Efeito Núcleo (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(ARVORE_HTML_PATH, 'utf-8');

        // Act & Assert
        assert.ok(html.includes('NEXO') && (html.includes('2D6') || html.includes('+2d6') || html.includes('+2D6')), 'Rótulo do NEXO 2D6 presente no centro');
        assert.ok(html.includes('nexus-core'), 'Classe do nó central nexus-core presente');
        assert.ok(html.includes('hex-shape'), 'Forma hexagonal renderizada');
    });

    // -------------------------------------------------------------
    // 3. Caminho Feliz: Nós de Fusão na Árvore (Secundus e Terceirus)
    // -------------------------------------------------------------
    QUnit.test('3. Caminho Feliz: Nós de Fusão Secundus e Terceirus com Molduras Ornamentadas (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(ARVORE_HTML_PATH, 'utf-8');

        // Act & Assert: Secundus e Terceirus
        assert.ok(html.includes('SECUNDUS') || html.includes('Secundus'), 'Etiqueta de nós SECUNDUS presente');
        assert.ok(html.includes('TERCEIRUS') || html.includes('Terceirus'), 'Etiqueta de nós TERCEIRUS presente');
        assert.ok(html.includes('CATACLISMO') || html.includes('Cataclismo'), 'Nó mestre Cataclismo presente');
        assert.ok(html.includes('AVATAR') || html.includes('Avatar'), 'Nó mestre Avatar presente no topo');
        assert.ok(html.includes('GOLEM') || html.includes('Golem'), 'Nó mestre Golem presente');
        assert.ok(html.includes('MAGMA') || html.includes('Magma'), 'Nó de fusão Magma presente');
    });

    // -------------------------------------------------------------
    // 4. Casos de Borda: 12 Caminhos Primários e Suporte a Cores
    // -------------------------------------------------------------
    QUnit.test('4. Casos de Borda: 12 Caminhos Místicos com Seiva e Conexão Orgânica (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(ARVORE_HTML_PATH, 'utf-8');
        const requiredPaths = ['fogo', 'agua', 'ar', 'terra', 'luz', 'trevas', 'animais', 'humanos', 'plantas', 'spiritum', 'arkanum', 'metamagia'];

        // Act & Assert
        requiredPaths.forEach(k => {
            assert.ok(html.includes(`"${k}"`) || html.includes(`'${k}'`), `Caminho ${k} registrado no catálogo de nós`);
        });
        assert.ok(html.includes('tree-leaf') || html.includes('folha'), 'Elementos de folhas bioluminescentes presentes');
    });

    // -------------------------------------------------------------
    // 5. Tratamento de Exceções & Integridade: Canvas, Sem CDNs Bloqueados
    // -------------------------------------------------------------
    QUnit.test('5. Integridade do Sistema: Compatibilidade de Scripts e Sem CDNs Externos Proibidos (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(ARVORE_HTML_PATH, 'utf-8');

        // Act & Assert
        assert.notOk(html.includes('cdn.tailwindcss.com'), 'Nenhum CDN bloqueado permitido');
        assert.ok(html.includes('stars-canvas'), 'Canvas estelar preservado');
        assert.ok(html.includes('magicPaths'), 'Objeto magicPaths intacto para retrocompatibilidade');
        assert.ok(html.includes('magicForms'), 'Objeto magicForms intacto para retrocompatibilidade');
        assert.ok(html.includes('spellFusions'), 'Objeto spellFusions intacto para retrocompatibilidade');
    });
});
