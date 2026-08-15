/**
 * @file tactical-grid.js
 * @description Módulo de gerenciamento de Grid Tático 2D, cálculo de distâncias (Metros / Quadrados),
 * snap magnético e manipulação de tokens para VTT de RPG.
 * @module TacticalGrid
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TacticalGrid = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * @typedef {Object} GridConfig
     * @property {number} [cellSize=40] - Tamanho da célula em pixels
     * @property {number} [metersPerSquare=1.5] - Escala de metros por quadrado tático
     * @property {number} [cols=20] - Número de colunas no grid
     * @property {number} [rows=15] - Número de linhas no grid
     */

    /**
     * @typedef {Object} TokenPosition
     * @property {number} x - Posição X em pixels ou unidades
     * @property {number} y - Posição Y em pixels ou unidades
     */

    const TacticalGrid = {

        /**
         * Aplica o alinhamento magnético (Snap-to-Grid) para uma coordenada de pixel.
         * @param {number} coord - Coordenada X ou Y bruta.
         * @param {number} [cellSize=40] - Tamanho da célula do grid em pixels.
         * @returns {number} Coordenada alinhada ao centro ou início da célula mais próxima.
         */
        snapCoordinate(coord, cellSize = 40) {
            return Math.round(coord / cellSize) * cellSize;
        },

        /**
         * Alinha uma posição (X, Y) ao grid.
         * @param {TokenPosition} pos - Posição com { x, y }.
         * @param {number} [cellSize=40] - Tamanho da célula.
         * @returns {TokenPosition} Posição com coordenadas alinhadas.
         */
        snapPosition(pos, cellSize = 40) {
            return {
                x: this.snapCoordinate(pos.x, cellSize),
                y: this.snapCoordinate(pos.y, cellSize)
            };
        },

        /**
         * Calcula a distância euclidiana e em quadrados entre dois pontos.
         * @param {TokenPosition} p1 - Ponto de origem { x, y }
         * @param {TokenPosition} p2 - Ponto de destino { x, y }
         * @param {number} [cellSize=40] - Tamanho da célula em pixels
         * @param {number} [metersPerSquare=1.5] - Metros por quadrado
         * @returns {{ pixelDistance: number, squares: number, meters: number, formatted: string }}
         */
        calculateDistance(p1, p2, cellSize = 40, metersPerSquare = 1.5) {
            const dx = (p2.x - p1.x) / cellSize;
            const dy = (p2.y - p1.y) / cellSize;
            const squares = Math.hypot(dx, dy);
            const meters = squares * metersPerSquare;
            const pixelDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);

            return {
                pixelDistance: Math.round(pixelDistance),
                squares: Math.round(squares * 10) / 10,
                meters: Math.round(meters * 10) / 10,
                formatted: `${(Math.round(meters * 10) / 10).toFixed(1)}m (${Math.round(squares)}q)`
            };
        },

        /**
         * Valida se uma posição está contida dentro dos limites do mapa/grid.
         * @param {TokenPosition} pos - Posição a verificar
         * @param {number} maxCols - Total de colunas
         * @param {number} maxRows - Total de linhas
         * @param {number} [cellSize=40] - Tamanho da célula
         * @returns {boolean} Se a posição é válida
         */
        isWithinBounds(pos, maxCols, maxRows, cellSize = 40) {
            const maxX = maxCols * cellSize;
            const maxY = maxRows * cellSize;
            return pos.x >= 0 && pos.x <= maxX && pos.y >= 0 && pos.y <= maxY;
        }
    };

    return TacticalGrid;
}));
