/**
 * @file src/core/vtt-ping-drawing-engine.js
 * @description Motor de Pings Táticos Visuais e Camada de Desenho Rápido para a Mesa Virtual (Kuar-Tor VTT).
 * @module VttPingDrawingEngine
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.VttPingDrawingEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const VttPingDrawingEngine = {
        DEFAULT_PING_DURATION_MS: 2400,

        /**
         * Cria um novo objeto de Ping Tático.
         * @param {number} x - Coordenada X no espaço do mundo.
         * @param {number} y - Coordenada Y no espaço do mundo.
         * @param {Object} [options={}] - Configurações extras (cor, remetente, duração).
         * @returns {Object} Dados do ping estruturado.
         */
        createPing(x, y, options = {}) {
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                throw new Error('Coordenadas X e Y inválidas para o ping.');
            }

            const id = 'ping_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
            const color = options.color || '#66FCF1';
            const sender = options.sender || 'Jogador';
            const createdAt = options.now || Date.now();
            const durationMs = options.durationMs || this.DEFAULT_PING_DURATION_MS;

            return {
                id,
                x,
                y,
                color,
                sender,
                createdAt,
                durationMs,
                isExpired(currentTime = Date.now()) {
                    return (currentTime - createdAt) >= durationMs;
                }
            };
        },

        /**
         * Gera a representação HTML/SVG de um ping pulsante concêntrico.
         * @param {Object} ping - Objeto do ping.
         * @returns {string} String HTML/SVG renderizável.
         */
        generatePingSVG(ping) {
            if (!ping) return '';
            const c = ping.color || '#66FCF1';
            const senderName = ping.sender || '';

            return `
                <div class="vtt-ping-marker" id="${ping.id}" style="left:${ping.x}px; top:${ping.y}px;">
                    <div class="ping-wave ping-wave-1" style="border-color:${c};"></div>
                    <div class="ping-wave ping-wave-2" style="border-color:${c};"></div>
                    <div class="ping-core" style="background:${c}; box-shadow:0 0 12px ${c};"></div>
                    ${senderName ? `<div class="ping-label font-cinzel" style="color:${c};">${senderName}</div>` : ''}
                </div>
            `;
        },

        /**
         * Cria um novo traço de desenho tático.
         * @param {string} [tool='pen'] - Tipo de ferramenta ('pen', 'eraser', 'line').
         * @param {string} [color='#fbbf24'] - Cor do traço.
         * @param {number} [width=3] - Espessura do traço em pixels.
         */
        createStroke(tool = 'pen', color = '#fbbf24', width = 3) {
            return {
                id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                tool,
                color,
                width: Math.max(1, Number(width) || 3),
                points: []
            };
        },

        /**
         * Adiciona um ponto ao traço em andamento.
         * @param {Object} stroke - Traço criado por createStroke.
         * @param {number} x - Posição X.
         * @param {number} y - Posição Y.
         */
        addPointToStroke(stroke, x, y) {
            if (!stroke || !Array.isArray(stroke.points)) return;
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            stroke.points.push({ x, y });
        },

        /**
         * Renderiza um traço em um contexto 2D de Canvas.
         * @param {CanvasRenderingContext2D} ctx - Contexto gráfico.
         * @param {Object} stroke - Traço com lista de pontos.
         */
        renderStrokeToCanvas(ctx, stroke) {
            if (!ctx || !stroke || !Array.isArray(stroke.points) || stroke.points.length < 2) {
                return false;
            }

            ctx.save();
            ctx.beginPath();
            ctx.lineWidth = stroke.width || 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (stroke.tool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = stroke.color || '#fbbf24';
            }

            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
            ctx.restore();

            return true;
        }
    };

    return VttPingDrawingEngine;
}));
