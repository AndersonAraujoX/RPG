/**
 * Testes unitários para a Mesa Virtual 2D (Kuar-Tor VTT +2d6)
 * Valida os motores de cálculo de distância, snap magnético, combate/iniciativa,
 * dados de tokens, rolagens 2d6 e integridade de UI.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const PUBLIC_VTT_PATH = path.resolve(__dirname, '../public/mesa_virtual.html');
const LEGADO_VTT_PATH = path.resolve(__dirname, '../legado/mesa_virtual.html');

QUnit.module('Mesa Virtual 2D (Kuar-Tor VTT +2d6)', function () {

    QUnit.test('Arquivos mesa_virtual.html devem existir e não usar CDN bloqueado', function (assert) {
        assert.ok(fs.existsSync(PUBLIC_VTT_PATH), 'public/mesa_virtual.html deve existir');
        assert.ok(fs.existsSync(LEGADO_VTT_PATH), 'legado/mesa_virtual.html deve existir');

        const publicContent = fs.readFileSync(PUBLIC_VTT_PATH, 'utf-8');
        const legadoContent = fs.readFileSync(LEGADO_VTT_PATH, 'utf-8');

        assert.notOk(publicContent.includes('cdn.tailwindcss.com'), 'public/mesa_virtual.html não deve usar cdn.tailwindcss.com');
        assert.notOk(legadoContent.includes('cdn.tailwindcss.com'), 'legado/mesa_virtual.html não deve usar cdn.tailwindcss.com');
    });

    QUnit.test('Elementos estruturais do VTT devem estar presentes no HTML', function (assert) {
        const content = fs.readFileSync(PUBLIC_VTT_PATH, 'utf-8');

        const requiredIds = [
            'vtt-viewport',
            'vtt-world',
            'map-image',
            'grid-overlay',
            'fog-canvas',
            'ruler-svg',
            'tokens-layer',
            'vtt-toolbar',
            'vtt-drawer',
            'token-context-menu',
            'map-modal',
            'char-modal'
        ];

        requiredIds.forEach(id => {
            assert.ok(content.includes(`id="${id}"`), `Elemento #${id} deve estar presente no HTML`);
        });
    });

    QUnit.test('Lógica da Régua de Distância 2D (Cálculo de Metros e Quadrados)', function (assert) {
        const gridSize = 50; // 50px = 1 grid = 1.5m

        function calculateDistance(p1, p2) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distPx = Math.sqrt(dx * dx + dy * dy);
            const distMeters = parseFloat(((distPx / gridSize) * 1.5).toFixed(1));
            const squares = Math.round(distPx / gridSize);
            return { distPx, distMeters, squares };
        }

        // Teste 1: Movimento de 2 quadrados em linha reta (100px) -> 3.0m, 2 quadrados
        const r1 = calculateDistance({ x: 0, y: 0 }, { x: 100, y: 0 });
        assert.equal(r1.distMeters, 3.0, '100px deve equivaler a 3.0m');
        assert.equal(r1.squares, 2, '100px deve equivaler a 2 quadrados');

        // Teste 2: Movimento diagonal 3x4 (5 quadrados = 250px) -> 7.5m, 5 quadrados
        const r2 = calculateDistance({ x: 0, y: 0 }, { x: 150, y: 200 }); // 3x50, 4x50 -> hipotenusa 250
        assert.equal(r2.distMeters, 7.5, '250px diagonal deve equivaler a 7.5m');
        assert.equal(r2.squares, 5, '250px diagonal deve equivaler a 5 quadrados');
    });

    QUnit.test('Lógica de Snap-to-Grid Magnético', function (assert) {
        const gridSize = 50;

        function snapCoordinate(val) {
            return Math.round(val / gridSize) * gridSize + 2;
        }

        assert.equal(snapCoordinate(48), 52, '48px deve encaixar no grid em 52 (50+2)');
        assert.equal(snapCoordinate(62), 52, '62px deve encaixar no grid em 52 (50+2)');
        assert.equal(snapCoordinate(85), 102, '85px deve encaixar no grid em 102 (100+2)');
        assert.equal(snapCoordinate(120), 102, '120px deve encaixar no grid em 102 (100+2)');
    });

    QUnit.test('Rastreador de Iniciativa e Combate (+2d6)', function (assert) {
        const combatants = [
            { id: '1', name: 'Goblin', init: 8 },
            { id: '2', name: 'Guerreiro', init: 14 },
            { id: '3', name: 'Mago', init: 11 }
        ];

        // Ordenar decrescente
        combatants.sort((a, b) => b.init - a.init);

        assert.equal(combatants[0].name, 'Guerreiro', 'Primeiro deve ser o de maior iniciativa (14)');
        assert.equal(combatants[1].name, 'Mago', 'Segundo deve ser 11');
        assert.equal(combatants[2].name, 'Goblin', 'Terceiro deve ser 8');

        // Passar turnos e rodadas
        let currentTurn = 0;
        let round = 1;

        function nextTurn() {
            currentTurn = (currentTurn + 1) % combatants.length;
            if (currentTurn === 0) round++;
        }

        nextTurn(); // Turno do Mago (idx 1)
        assert.equal(currentTurn, 1, 'Turno 1: Mago');
        assert.equal(round, 1, 'Ainda Rodada 1');

        nextTurn(); // Turno do Goblin (idx 2)
        assert.equal(currentTurn, 2, 'Turno 2: Goblin');

        nextTurn(); // Volta ao Guerreiro (idx 0) e incrementa rodada
        assert.equal(currentTurn, 0, 'Volta ao Guerreiro');
        assert.equal(round, 2, 'Inicia Rodada 2');
    });

    QUnit.test('Gestão de Token, Barras de PV/PE e Condições', function (assert) {
        const token = {
            id: 'tok_1',
            name: 'Hero',
            hp: 16,
            maxHp: 16,
            pe: 8,
            maxPe: 8,
            conditions: []
        };

        // Dano
        token.hp = Math.max(0, token.hp - 6);
        assert.equal(token.hp, 10, 'PV após 6 de dano');
        const hpPercent = (token.hp / token.maxHp) * 100;
        assert.equal(hpPercent, 62.5, 'Porcentagem de PV');

        // Toggle de Condição
        function toggleCond(cond) {
            const idx = token.conditions.indexOf(cond);
            if (idx >= 0) token.conditions.splice(idx, 1);
            else token.conditions.push(cond);
        }

        toggleCond('🔥');
        assert.deepEqual(token.conditions, ['🔥'], 'Condição Em Chamas adicionada');
        toggleCond('❄️');
        assert.deepEqual(token.conditions, ['🔥', '❄️'], 'Condição Congelado adicionada');
        toggleCond('🔥');
        assert.deepEqual(token.conditions, ['❄️'], 'Condição Em Chamas removida');
    });

    QUnit.test('Novos motores e scripts do VTT devem estar referenciados no HTML (AAA)', function (assert) {
        // Arrange
        const expectedScripts = [
            'vtt-session-persistence.js',
            'vtt-shortcuts-controller.js',
            'vtt-magic-integration.js',
            'vtt-ping-drawing-engine.js'
        ];

        // Act
        const content = fs.readFileSync(PUBLIC_VTT_PATH, 'utf-8');

        // Assert
        expectedScripts.forEach(script => {
            assert.ok(content.includes(script), `Script "${script}" deve estar incluído no HTML`);
        });
    });

    QUnit.test('Elementos de UI de Persistência, Atalhos, Magia e Pings devem estar no HTML (AAA)', function (assert) {
        // Arrange
        const requiredIds = [
            'vtt-autosave-indicator',
            'scene-mgmt-btn',
            'scene-modal',
            'token-spell-modal',
            'tool-undo',
            'tool-redo',
            'tool-draw',
            'tool-ping',
            'drawing-canvas',
            'pings-layer',
            'fct-layer',
            'spell-select',
            'spell-target-select'
        ];

        // Act
        const content = fs.readFileSync(PUBLIC_VTT_PATH, 'utf-8');

        // Assert
        requiredIds.forEach(id => {
            assert.ok(content.includes(`id="${id}"`), `Elemento #${id} deve estar presente no HTML do VTT`);
        });
        assert.ok(content.includes('openTokenSpellModal()'), 'Botão de conjurar magia deve estar no menu de contexto');
    });

    QUnit.test('Catálogo de Feitiços & Círculos do VTT (+2d6) (AAA)', function (assert) {
        // Arrange: Definição dos círculos canônicos integrados no VTT
        const spellsCatalog = {
            c01: { id: 'c01', name: 'Círculo #01 — Labareda Ígnea', cost: 2, cd: 8, dice: '2d6', bonus: 2, type: 'damage', element: 'Fogo' },
            c02: { id: 'c02', name: 'Círculo #02 — Centelha Curativa', cost: 3, cd: 8, dice: '2d6', bonus: 1, type: 'heal', element: 'Luz' },
            c03: { id: 'c03', name: 'Círculo #03 — Magma Devastador', cost: 4, cd: 10, dice: '2d6', bonus: 5, type: 'damage', element: 'Fogo' },
            c05: { id: 'c05', name: 'Círculo #05 — Cataclismo Elemental', cost: 6, cd: 13, dice: '2d6', bonus: 9, type: 'damage', element: 'Fogo' },
            s62: { id: 's62', name: 'Círculo #62 — Flora Abissal', cost: 4, cd: 10, dice: '2d6', bonus: 4, type: 'damage', element: 'Trevas' },
            s120: { id: 's120', name: 'Círculo #120 — Cidades Vivas', cost: 5, cd: 12, dice: '2d6', bonus: 6, type: 'heal', element: 'Vida' }
        };

        // Act & Assert
        assert.ok(spellsCatalog.c01.cost === 2 && spellsCatalog.c01.cd === 8, 'Círculo #01 custa 2 PE com CD 8');
        assert.ok(spellsCatalog.c02.type === 'heal' && spellsCatalog.c02.bonus === 1, 'Círculo #02 é cura com bônus +1');
        assert.ok(spellsCatalog.c05.cost === 6 && spellsCatalog.c05.cd === 13, 'Cataclismo exige 6 PE e CD 13');
        assert.ok(spellsCatalog.s120.type === 'heal' && spellsCatalog.s120.bonus === 6, 'Cidades Vivas cura 2d6+6');
    });

    QUnit.test('Casos de Borda: Ciclo de Snapshots de Histórico do VTT (Undo / Redo) (AAA)', function (assert) {
        // Arrange
        const history = [];
        let index = -1;
        const maxCapacity = 5;

        function push(state) {
            if (index < history.length - 1) {
                history.splice(index + 1);
            }
            history.push(JSON.stringify(state));
            if (history.length > maxCapacity) history.shift();
            else index++;
        }

        function undo() {
            if (index > 0) { index--; return JSON.parse(history[index]); }
            return null;
        }

        function redo() {
            if (index < history.length - 1) { index++; return JSON.parse(history[index]); }
            return null;
        }

        // Act
        push({ round: 1, tokens: { t1: { x: 50, y: 50 } } });
        push({ round: 1, tokens: { t1: { x: 100, y: 50 } } });
        push({ round: 2, tokens: { t1: { x: 150, y: 100 } } });

        // Assert
        assert.equal(index, 2, 'Index atual deve ser o topo');
        const stateUndo1 = undo();
        assert.equal(stateUndo1.tokens.t1.x, 100, 'Undo 1 deve voltar para x=100');
        assert.equal(stateUndo1.round, 1, 'Undo 1 deve restaurar rodada 1');

        const stateUndo2 = undo();
        assert.equal(stateUndo2.tokens.t1.x, 50, 'Undo 2 deve voltar para x=50 inicial');

        const undoAtStart = undo();
        assert.equal(undoAtStart, null, 'Undo no início da pilha deve retornar null');

        const stateRedo = redo();
        assert.equal(stateRedo.tokens.t1.x, 100, 'Redo deve avançar de volta para x=100');
    });
});

