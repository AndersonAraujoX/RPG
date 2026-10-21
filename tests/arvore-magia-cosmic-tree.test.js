/**
 * Suíte de Testes Unitários: Árvore Cósmica Ancestral Bioluminescente (arvore_magia.html)
 * Padrão: Arrange-Act-Assert (AAA)
 * Cobertura: Estrutura da Árvore Ancestral, Raízes e Tronco Bioluminescentes, Galhos Orgânicos SVG,
 *            Espaçamento Sem Sobreposição (Geometria Limpa), Painel Retrátil, Nós de Fusão Secundus e Terceirus, e Integridade do DOM.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const ARVORE_HTML_PATH = path.resolve(__dirname, '../public/arvore_magia.html');

QUnit.module('Biblioteca Arcana: Árvore Cósmica Ancestral Bioluminescente (AAA)', function () {

    // -------------------------------------------------------------
    // 1. Caminho Feliz: Estrutura da Árvore Ancestral, Raízes e Galhos Orgânicos
    // -------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: Estrutura SVG da Árvore, Raízes e Galhos Orgânicos (AAA)', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(ARVORE_HTML_PATH), 'public/arvore_magia.html deve existir');
        const html = fs.readFileSync(ARVORE_HTML_PATH, 'utf-8');

        // Act & Assert: Tronco e Raízes
        assert.ok(html.includes('tree-roots-group') || html.includes('tree-roots'), 'Grupo de raízes bioluminescentes presente');
        assert.ok(html.includes('tree-branches-group') || html.includes('tree-branches'), 'Grupo de galhos orgânicos presente');
        assert.ok(html.includes('tree-glow'), 'Filtro de bioluminescência/glow presente no SVG');
        assert.ok(html.includes('mana-spore'), 'Esporos mágicos flutuantes presentes no SVG');
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
    // 4. Geometria e Casos de Borda: Espaçamento Seguro Sem Sobreposição de Nós
    // -------------------------------------------------------------
    QUnit.test('4. Casos de Borda: Geometria da Árvore e Espaçamento Seguro (Sem Sobreposições) (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(ARVORE_HTML_PATH, 'utf-8');

        // Extrair treePositions do HTML
        const posMatch = html.match(/const treePositions = ({[\s\S]*?});/);
        assert.ok(posMatch, 'Objeto treePositions deve estar definido no HTML');
        const treePositions = eval('(' + posMatch[1] + ')');

        // Extrair fusionNodes do HTML
        const fusMatch = html.match(/const fusionNodes = (\[[\s\S]*?\]);/);
        assert.ok(fusMatch, 'Array fusionNodes deve estar definido no HTML');
        const fusionNodes = eval('(' + fusMatch[1] + ')');

        // Compilar todos os pontos: { id, x, y }
        const allPoints = [];
        allPoints.push({ id: 'nexus_core', x: 0, y: 0 });
        Object.keys(treePositions).forEach(k => allPoints.push({ id: k, x: treePositions[k].x, y: treePositions[k].y }));
        fusionNodes.forEach(f => allPoints.push({ id: f.id, x: f.x, y: f.y }));

        // Act & Assert: Verificar que nenhuma dupla de nós está colidindo (distância mínima >= 105px)
        const collisions = [];
        for (let i = 0; i < allPoints.length; i++) {
            for (let j = i + 1; j < allPoints.length; j++) {
                const p1 = allPoints[i];
                const p2 = allPoints[j];
                const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                if (dist < 105) {
                    collisions.push(`${p1.id} e ${p2.id} colidem com distância de apenas ${dist.toFixed(1)}px`);
                }
            }
        }

        assert.equal(collisions.length, 0, `Nenhum nó deve colidir. Encontradas: ${collisions.join('; ')}`);
    });

    // -------------------------------------------------------------
    // 5. Casos de Borda: Painel Retrátil e Responsividade do HUD
    // -------------------------------------------------------------
    QUnit.test('5. Casos de Borda: Painel Retrátil dos 12 Caminhos e Conexões Ativas (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(ARVORE_HTML_PATH, 'utf-8');

        // Act & Assert
        assert.ok(html.includes('sidebar-toggle-btn'), 'Botão de recolher/expandir sidebar presente');
        assert.ok(html.includes('toggleSidebarCollapse'), 'Função de alternância de recolhimento presente');
        assert.ok(html.includes('floating-sidebar.collapsed') || html.includes('.collapsed'), 'CSS de estado recolhido presente');
        assert.ok(html.includes('.tree-branch-path.active'), 'Classe CSS de galho ativo com fluxo de mana presente');
    });

    // -------------------------------------------------------------
    // 6. Tratamento de Exceções & Integridade: Canvas, Sem CDNs Bloqueados
    // -------------------------------------------------------------
    QUnit.test('6. Integridade do Sistema: Compatibilidade de Scripts e Sem CDNs Externos Proibidos (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(ARVORE_HTML_PATH, 'utf-8');

        // Act & Assert
        assert.notOk(html.includes('cdn.tailwindcss.com'), 'Nenhum CDN bloqueado permitido');
        assert.ok(html.includes('stars-canvas'), 'Canvas estelar preservado');
        assert.ok(html.includes('magicPaths'), 'Objeto magicPaths intacto para retrocompatibilidade');
        assert.ok(html.includes('magicForms'), 'Objeto magicForms intacto para retrocompatibilidade');
        assert.ok(html.includes('spellFusions'), 'Objeto spellFusions intacto para retrocompatibilidade');
    });

    // -------------------------------------------------------------
    // 7. Caminho Feliz e Borda: Anéis Concêntricos de Círculos de Magia, Altar de 3 Slots e Compêndio 186 (AAA)
    // -------------------------------------------------------------
    QUnit.test('7. Caminho Feliz e Borda: Anéis de Círculos de Magia (Primário, 66 Secundus, 120 Terceirus) e Altar de 3 Slots (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(ARVORE_HTML_PATH, 'utf-8');

        // Act & Assert: Gerador de Círculos e Catálogo 186 carregados
        assert.ok(html.includes('magic-circle-generator.js'), 'Carrega gerador determinístico de Círculos de Magia');
        assert.ok(html.includes('circulos_magia_data.js'), 'Carrega catálogo dos 66 Secundus e 120 Terceirus');
        assert.ok(html.includes('generatePrimaryCircleSVG'), 'Renderiza Círculos de Magia para os 12 Caminhos Primários');
        assert.ok(html.includes('generateCircleSVG'), 'Renderiza Círculos de Magia para Secundus e Terceirus');

        // Act & Assert: Altar de Fusão com 3 Slots (Primário, Secundus, Terceirus) e Filtro Orbital
        assert.ok(html.includes('id="slot-1"') && html.includes('id="slot-2"') && html.includes('id="slot-3"'), 'Altar possui 3 slots de fusão para suportar Secundus e Terceirus');
        assert.ok(html.includes('id="orbit-filter-bar"'), 'Barra de filtro orbital por caminho presente');
        assert.ok(html.includes('id="modal-circles-grid"'), 'Galeria modal dos 186 Círculos de Magia presente');
        assert.ok(html.includes('drawMagicCirclesMandalaSVG'), 'Mandala de Anéis Concêntricos de Magia substitui a árvore orgânica');
    });

    // -------------------------------------------------------------
    // 8. Caminho Feliz e Borda: Foco nos 12 Círculos Básicos e Utilidades (Forja, Rituais e Puzzles) (AAA)
    // -------------------------------------------------------------
    QUnit.test('8. Caminho Feliz e Borda: Foco nos Círculos Básicos, Forja Arcana, Rituais Cooperativos e Puzzles (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(ARVORE_HTML_PATH, 'utf-8');

        // Act & Assert: Módulo de Forja e Utilidades Carregado
        assert.ok(html.includes('magic-forge-system.js'), 'Carrega o módulo central MagicForgeSystem');

        // Act & Assert: Botões no Header HUD
        assert.ok(html.includes('openForgeModal()'), 'Botão de abertura da Forja Arcana presente no HUD');
        assert.ok(html.includes('openRitualsModal()'), 'Botão de Rituais Cooperativos presente no HUD');
        assert.ok(html.includes('openPuzzlesModal()'), 'Botão de Puzzles de Masmorra presente no HUD');

        // Act & Assert: Modais Estruturais no DOM
        assert.ok(html.includes('id="modal-forge-overlay"'), 'Modal de Forja Arcana presente no DOM');
        assert.ok(html.includes('id="modal-rituals-overlay"'), 'Modal de Rituais Cooperativos presente no DOM');
        assert.ok(html.includes('id="modal-puzzles-overlay"'), 'Modal de Puzzles & Portas Seladas presente no DOM');

        // Act & Assert: Foco no primeiro círculo básico por padrão
        assert.ok(html.includes('12 Círculos Básicos (Padrão)'), 'Opção de foco nos 12 círculos básicos ativa no tabuleiro');
        assert.ok(html.includes('performForgeItem()'), 'Função de execução de forja com +2d6 presente');
        assert.ok(html.includes('performCooperativeRitualAction()'), 'Função de conjuração de rituais cooperativos presente');
        assert.ok(html.includes('attemptSolveDoor()'), 'Função de resolução de enigmas de portas seladas presente');
    });

    // -------------------------------------------------------------
    // 9. Caminho Feliz e Borda: Animação de Convergência quando Junta os Círculos (AAA)
    // -------------------------------------------------------------
    QUnit.test('9. Caminho Feliz e Borda: Animação de Convergência ao Juntar Círculos e Acessibilidade prefers-reduced-motion (AAA)', function (assert) {
        // Arrange
        const html = fs.readFileSync(ARVORE_HTML_PATH, 'utf-8');

        // Act & Assert: Keyframes e classes compositor-friendly (transform e opacity)
        assert.ok(html.includes('generateConvergenceAnimationHTML'), 'Integra gerador de animação de convergência no Nexo, Altar e Forja');
        assert.ok(html.includes('@keyframes mcFragmentConverge'), 'Keyframe de convergência orbital dos círculos primários presente');
        assert.ok(html.includes('@keyframes mcShockwaveBurst'), 'Keyframe de onda de choque da síntese rúnica presente');
        assert.ok(html.includes('@keyframes mcFusedCoreMaterialize'), 'Keyframe de materialização do selo fundido presente');
        assert.ok(html.includes('convergence-beam'), 'Feixes de convergência de mana dos círculos selecionados até o Nexo');
        assert.ok(html.includes('replayConvergenceAnimation'), 'Função para reproduzir novamente a animação de junção presente');
        assert.ok(html.includes('prefers-reduced-motion: reduce'), 'Respeita preferência de acessibilidade @media (prefers-reduced-motion: reduce)');
    });
});


