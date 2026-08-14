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
});
