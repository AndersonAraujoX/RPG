/**
 * @file tests/vtt-ping-drawing-engine.test.js
 * @description Suíte de Testes Unitários para o Motor de Pings Táticos e Desenho do VTT.
 * Padrão: Arrange-Act-Assert (AAA)
 */

const QUnit = require('qunit');
const VttPingDrawingEngine = require('../src/core/vtt-ping-drawing-engine');

QUnit.module('VttPingDrawingEngine: Pings Táticos & Desenho no VTT (AAA)', function () {

    // -------------------------------------------------------------------------
    // 1. Caminho Feliz: Criação de Ping e Verificação de Tempo de Vida
    // -------------------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: Criação de Ping, expiração e geração de SVG (AAA)', function (assert) {
        // Arrange
        const baseTime = 1000000;
        const ping = VttPingDrawingEngine.createPing(150, 250, {
            color: '#fbbf24',
            sender: 'Mestre',
            durationMs: 2000,
            now: baseTime
        });

        // Act & Assert: Criação e atributos
        assert.equal(ping.x, 150, 'Coordenada X preservada');
        assert.equal(ping.y, 250, 'Coordenada Y preservada');
        assert.equal(ping.color, '#fbbf24', 'Cor personalizada preservada');
        assert.equal(ping.sender, 'Mestre', 'Nome do remetente preservado');

        // Act & Assert: Expiração temporal
        assert.notOk(ping.isExpired(baseTime + 1000), 'Não deve estar expirado após 1000ms (duração 2000ms)');
        assert.ok(ping.isExpired(baseTime + 2001), 'Deve estar expirado após 2001ms');

        // Act & Assert: Renderização de SVG
        const svg = VttPingDrawingEngine.generatePingSVG(ping);
        assert.ok(svg.includes('vtt-ping-marker'), 'HTML contém marcador de ping');
        assert.ok(svg.includes('Mestre'), 'Nome do remetente exibido no SVG');
        assert.ok(svg.includes('#fbbf24'), 'Cor do ping aplicada');
    });

    // -------------------------------------------------------------------------
    // 2. Caminho Feliz: Traço de Desenho e Renderização no Canvas
    // -------------------------------------------------------------------------
    QUnit.test('2. Caminho Feliz: Cria traço, adiciona pontos e renderiza em Canvas Mock (AAA)', function (assert) {
        // Arrange
        const stroke = VttPingDrawingEngine.createStroke('pen', '#ef4444', 4);
        VttPingDrawingEngine.addPointToStroke(stroke, 10, 10);
        VttPingDrawingEngine.addPointToStroke(stroke, 20, 25);
        VttPingDrawingEngine.addPointToStroke(stroke, 30, 40);

        let beginPathCalled = false;
        let strokeCalled = false;
        const lineCoords = [];

        const mockCtx = {
            save() {},
            restore() {},
            beginPath() { beginPathCalled = true; },
            moveTo(x, y) { lineCoords.push({ move: [x, y] }); },
            lineTo(x, y) { lineCoords.push({ line: [x, y] }); },
            stroke() { strokeCalled = true; },
            lineWidth: 0,
            lineCap: '',
            lineJoin: '',
            globalCompositeOperation: '',
            strokeStyle: ''
        };

        // Act
        const renderOk = VttPingDrawingEngine.renderStrokeToCanvas(mockCtx, stroke);

        // Assert
        assert.ok(renderOk, 'Renderização do traço concluída com sucesso');
        assert.ok(beginPathCalled, 'beginPath chamado');
        assert.ok(strokeCalled, 'stroke chamado');
        assert.equal(mockCtx.lineWidth, 4, 'Espessura da linha configurada para 4');
        assert.equal(mockCtx.strokeStyle, '#ef4444', 'Cor da linha configurada para #ef4444');
        assert.equal(lineCoords.length, 3, '1 moveTo e 2 lineTo registrados');
    });

    // -------------------------------------------------------------------------
    // 3. Casos de Borda: Ferramenta Borracha (Eraser Composite Operation)
    // -------------------------------------------------------------------------
    QUnit.test('3. Casos de Borda: Ferramenta borracha aplica destination-out no canvas (AAA)', function (assert) {
        // Arrange
        const eraserStroke = VttPingDrawingEngine.createStroke('eraser');
        VttPingDrawingEngine.addPointToStroke(eraserStroke, 0, 0);
        VttPingDrawingEngine.addPointToStroke(eraserStroke, 50, 50);

        const mockCtx = {
            save() {},
            restore() {},
            beginPath() {},
            moveTo() {},
            lineTo() {},
            stroke() {},
            globalCompositeOperation: ''
        };

        // Act
        VttPingDrawingEngine.renderStrokeToCanvas(mockCtx, eraserStroke);

        // Assert
        assert.equal(mockCtx.globalCompositeOperation, 'destination-out', 'Modo de borracha deve usar destination-out');
    });

    // -------------------------------------------------------------------------
    // 4. Casos de Borda & Tratamento de Exceções: Traço com menos de 2 pontos e Coordenadas Inválidas
    // -------------------------------------------------------------------------
    QUnit.test('4. Tratamento de Exceções: Traço com <2 pontos não desenha e coordenadas inválidas disparam erro (AAA)', function (assert) {
        // Arrange & Act: Traço com apenas 1 ponto
        const singlePointStroke = VttPingDrawingEngine.createStroke();
        VttPingDrawingEngine.addPointToStroke(singlePointStroke, 5, 5);
        const result = VttPingDrawingEngine.renderStrokeToCanvas({}, singlePointStroke);

        // Assert
        assert.notOk(result, 'Traço com apenas 1 ponto não deve ser desenhado');

        // Coordenadas NaN ou não numéricas no Ping
        assert.throws(() => {
            VttPingDrawingEngine.createPing(NaN, 100);
        }, /Coordenadas X e Y inválidas/, 'Coordenada NaN deve disparar erro');

        assert.throws(() => {
            VttPingDrawingEngine.createPing(100, undefined);
        }, /Coordenadas X e Y inválidas/, 'Coordenada undefined deve disparar erro');
    });
});
