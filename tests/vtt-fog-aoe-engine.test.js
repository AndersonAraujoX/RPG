/**
 * @file tests/vtt-fog-aoe-engine.test.js
 * @description Suíte de Testes Unitários: VttFogAoeEngine (Névoa Dinâmica & Modelos AoE +2d6)
 * Padrão: Arrange-Act-Assert (AAA)
 */

const QUnit = require('qunit');
const VttFogAoeEngine = require('../src/core/vtt-fog-aoe-engine');

QUnit.module('VttFogAoeEngine — Névoa Dinâmica & Áreas de Efeito (AoE)', function () {

    // -------------------------------------------------------------
    // 1. Caminho Feliz: Pincel de Névoa de Guerra
    // -------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: Pincel de Revelar e Ocultar Células de Névoa (AAA)', function (assert) {
        // Arrange
        const initialRevealed = ['0,0', '0,1'];

        // Act - Revelar 3x3 em torno de (5,5) com raio 2
        const revealed = VttFogAoeEngine.applyBrush({
            gridCols: 20,
            gridRows: 20,
            centerCol: 5,
            centerRow: 5,
            brushRadius: 2,
            mode: 'reveal',
            currentRevealed: initialRevealed
        });

        // Act - Ocultar célula (5,5) com raio 1
        const afterHide = VttFogAoeEngine.applyBrush({
            gridCols: 20,
            gridRows: 20,
            centerCol: 5,
            centerRow: 5,
            brushRadius: 1,
            mode: 'hide',
            currentRevealed: revealed
        });

        // Assert
        assert.ok(revealed.includes('5,5'), 'Célula central revelada');
        assert.ok(revealed.includes('5,6'), 'Célula adjacente no raio revelada');
        assert.ok(revealed.includes('0,0'), 'Células pré-existentes preservadas');
        assert.notOk(afterHide.includes('5,5'), 'Célula central ocultada com sucesso');
    });

    QUnit.test('2. Caminho Feliz: Visão de Tocha Revela Células em Raio (calculateVisionCells) (AAA)', function (assert) {
        // Arrange
        const tokenX = 40 * 10; // Coluna 10 (400px)
        const tokenY = 40 * 10; // Linha 10 (400px)
        const radiusMeters = 4.5; // 3 células (4.5m / 1.5m = 3 células)

        // Act
        const visionCells = VttFogAoeEngine.calculateVisionCells({
            tokenX,
            tokenY,
            cellSize: 40,
            radiusMeters,
            meterPerCell: 1.5,
            gridCols: 30,
            gridRows: 30
        });

        // Assert
        assert.ok(visionCells.length > 1, 'Gera múltiplas células visíveis');
        assert.ok(visionCells.includes('10,10'), 'Inclui a própria célula do token');
        assert.ok(visionCells.includes('10,12'), 'Inclui célula a 3m de distância');
        assert.notOk(visionCells.includes('10,20'), 'Não inclui célula muito distante');
    });

    // -------------------------------------------------------------
    // 2. Caminho Feliz: Modelos de Área de Efeito (Circle, Cone, Line)
    // -------------------------------------------------------------
    QUnit.test('3. Caminho Feliz: AoE Circular (Explosão Mágica) (AAA)', function (assert) {
        // Arrange
        const originX = 200; // Col 5
        const originY = 200; // Row 5
        const radiusMeters = 3.0; // 2 células

        // Act
        const circleCells = VttFogAoeEngine.calculateCircleAoE(originX, originY, radiusMeters, 40, 1.5);

        // Assert
        assert.ok(circleCells.includes('5,5'), 'Inclui o epicentro');
        assert.ok(circleCells.includes('5,6'), 'Inclui adjacente no raio');
        assert.ok(circleCells.includes('5,7'), 'Inclui limite de 3m');
        assert.notOk(circleCells.includes('5,9'), 'Exclui célula fora do raio');
    });

    QUnit.test('4. Caminho Feliz: AoE Cônico (Sopro de Chamas / Vento) (AAA)', function (assert) {
        // Arrange
        const originX = 200; // Col 5
        const originY = 200; // Row 5
        const angleDeg = 0; // Direcionado para a Direita (+X)
        const lengthMeters = 6.0; // 4 células
        const spreadDeg = 60;

        // Act
        const coneCells = VttFogAoeEngine.calculateConeAoE(originX, originY, angleDeg, lengthMeters, spreadDeg, 40, 1.5);

        // Assert
        assert.ok(coneCells.includes('5,5'), 'Inclui origem');
        assert.ok(coneCells.includes('7,5'), 'Inclui célula em frente na direção do cone (coluna 7)');
        assert.notOk(coneCells.includes('3,5'), 'NÃO inclui célula atrás da origem (coluna 3)');
    });

    QUnit.test('5. Caminho Feliz: AoE Linha (Relâmpago / Disparo Perfurante) (AAA)', function (assert) {
        // Arrange
        const startX = 40;  // Col 1, Row 1
        const startY = 40;
        const endX = 200;   // Col 5, Row 1
        const endY = 40;

        // Act
        const lineCells = VttFogAoeEngine.calculateLineAoE(startX, startY, endX, endY, 1.5, 40, 1.5);

        // Assert
        assert.ok(lineCells.includes('1,1'), 'Inclui ponto inicial');
        assert.ok(lineCells.includes('3,1'), 'Inclui ponto médio');
        assert.ok(lineCells.includes('5,1'), 'Inclui ponto final');
        assert.notOk(lineCells.includes('3,5'), 'Não inclui ponto fora da trajetória');
    });

    // -------------------------------------------------------------
    // 3. Casos de Borda: Detecção de Tokens Atingidos em AoE
    // -------------------------------------------------------------
    QUnit.test('6. Casos de Borda: Detecção de Tokens Atingidos por AoE (getTokensInAoE) (AAA)', function (assert) {
        // Arrange
        const tokens = [
            { id: 'hero', name: 'Guerreiro', x: 200, y: 200 }, // Col 5, Row 5
            { id: 'enemy_in', name: 'Cultista 1', x: 240, y: 200 }, // Col 6, Row 5
            { id: 'enemy_out', name: 'Cultista 2', x: 400, y: 400 } // Col 10, Row 10
        ];
        const aoeCells = ['5,5', '6,5'];

        // Act
        const hit = VttFogAoeEngine.getTokensInAoE(tokens, aoeCells, 40);

        // Assert
        assert.equal(hit.length, 2, 'Detecta exatamente os 2 tokens dentro da área');
        assert.ok(hit.some(t => t.id === 'hero'), 'Guerreiro atingido');
        assert.ok(hit.some(t => t.id === 'enemy_in'), 'Cultista 1 atingido');
        assert.notOk(hit.some(t => t.id === 'enemy_out'), 'Cultista 2 fora da área');
    });

    QUnit.test('7. Casos de Borda: Pincel nos Limites do Tabuleiro (Clamping) (AAA)', function (assert) {
        // Arrange
        const gridCols = 10;
        const gridRows = 10;

        // Act - Pincel no canto superior esquerdo (0,0) com raio 3
        const cornerCells = VttFogAoeEngine.applyBrush({
            gridCols,
            gridRows,
            centerCol: 0,
            centerRow: 0,
            brushRadius: 3,
            mode: 'reveal',
            currentRevealed: []
        });

        // Assert
        assert.ok(cornerCells.every(key => {
            const parsed = VttFogAoeEngine.parseCellKey(key);
            return parsed.col >= 0 && parsed.col < gridCols && parsed.row >= 0 && parsed.row < gridRows;
        }), 'Nenhuma célula fora dos limites do grid foi gerada');
    });
});
