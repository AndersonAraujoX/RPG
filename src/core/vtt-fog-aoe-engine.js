/**
 * @file src/core/vtt-fog-aoe-engine.js
 * @description Motor Matemático e Lógico para Névoa de Guerra Dinâmica (Brush & Tochas)
 * e Modelos de Área de Efeito (AoE: Círculo, Cone e Linha) para a Mesa Virtual (VTT 2D).
 * @module VttFogAoeEngine
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.VttFogAoeEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const VttFogAoeEngine = {
        DEFAULT_METER_PER_CELL: 1.5,
        DEFAULT_CELL_SIZE: 40,

        // =====================================================================
        // 1. NÉVOA DE GUERRA DINÂMICA (BRUSH TOOL & REVELAÇÃO)
        // =====================================================================

        /**
         * Gera a chave padronizada de coordenada de célula no grid.
         */
        toCellKey(col, row) {
            return `${col},${row}`;
        },

        parseCellKey(key) {
            const parts = String(key || '').split(',');
            return {
                col: parseInt(parts[0]) || 0,
                row: parseInt(parts[1]) || 0
            };
        },

        /**
         * Aplica o pincel de revelação ou ocultação de névoa no grid.
         * @param {Object} params
         * @param {number} params.gridCols - Número de colunas no tabuleiro.
         * @param {number} params.gridRows - Número de linhas no tabuleiro.
         * @param {number} params.centerCol - Coluna central do clique/pincel.
         * @param {number} params.centerRow - Linha central do clique/pincel.
         * @param {number} [params.brushRadius=1] - Raio em células (1 = 1 célula, 2 = 3x3, etc.).
         * @param {'reveal'|'hide'} [params.mode='reveal'] - Modo da operação.
         * @param {Array<string>|Set<string>} params.currentRevealed - Chaves de células atualmente reveladas.
         * @returns {Array<string>} Array ordenado das chaves de células reveladas resultantes.
         */
        applyBrush(params = {}) {
            const {
                gridCols = 50,
                gridRows = 50,
                centerCol = 0,
                centerRow = 0,
                brushRadius = 1,
                mode = 'reveal',
                currentRevealed = []
            } = params;

            const revealedSet = new Set(currentRevealed);
            const r = Math.max(0, parseInt(brushRadius) || 1) - 1;

            for (let c = centerCol - r; c <= centerCol + r; c++) {
                for (let row = centerRow - r; row <= centerRow + r; row++) {
                    if (c >= 0 && c < gridCols && row >= 0 && row < gridRows) {
                        // Distância euclidiana para pincel circular
                        const dist = Math.sqrt(Math.pow(c - centerCol, 2) + Math.pow(row - centerRow, 2));
                        if (dist <= r + 0.5) {
                            const key = this.toCellKey(c, row);
                            if (mode === 'reveal') {
                                revealedSet.add(key);
                            } else {
                                revealedSet.delete(key);
                            }
                        }
                    }
                }
            }

            return Array.from(revealedSet);
        },

        /**
         * Calcula o raio de visão de tocha / visão no escuro a partir da posição de um Token.
         * @param {Object} params
         * @param {number} params.tokenX - Posição X em pixels.
         * @param {number} params.tokenY - Posição Y em pixels.
         * @param {number} [params.cellSize=40] - Tamanho da célula em pixels.
         * @param {number} [params.radiusMeters=6.0] - Alcance da tocha em metros (padrão 6m = 4 células).
         * @param {number} [params.meterPerCell=1.5] - Razão metros por célula.
         * @param {number} [params.gridCols=50] - Limite de colunas.
         * @param {number} [params.gridRows=50] - Limite de linhas.
         * @returns {Array<string>} Células reveladas pelo campo de visão.
         */
        calculateVisionCells(params = {}) {
            const {
                tokenX = 0,
                tokenY = 0,
                cellSize = this.DEFAULT_CELL_SIZE,
                radiusMeters = 6.0,
                meterPerCell = this.DEFAULT_METER_PER_CELL,
                gridCols = 50,
                gridRows = 50
            } = params;

            const centerCol = Math.floor(tokenX / cellSize);
            const centerRow = Math.floor(tokenY / cellSize);
            const cellRadius = Math.ceil(radiusMeters / meterPerCell);

            const visibleCells = [];

            for (let c = centerCol - cellRadius; c <= centerCol + cellRadius; c++) {
                for (let r = centerRow - cellRadius; r <= centerRow + cellRadius; r++) {
                    if (c >= 0 && c < gridCols && r >= 0 && r < gridRows) {
                        const distCells = Math.sqrt(Math.pow(c - centerCol, 2) + Math.pow(r - centerRow, 2));
                        const distMeters = distCells * meterPerCell;
                        if (distMeters <= radiusMeters + (meterPerCell * 0.4)) {
                            visibleCells.push(this.toCellKey(c, r));
                        }
                    }
                }
            }

            return visibleCells;
        },

        // =====================================================================
        // 2. MODELOS DE ÁREA DE EFEITO (AoE TEMPLATES)
        // =====================================================================

        /**
         * Calcula células afetadas por uma explosão/área circular (AoE Círculo).
         * @param {number} originX - Ponto de impacto central X (pixels).
         * @param {number} originY - Ponto de impacto central Y (pixels).
         * @param {number} radiusMeters - Raio da explosão em metros (ex: 3m, 6m).
         * @param {number} [cellSize=40]
         * @param {number} [meterPerCell=1.5]
         * @returns {Array<string>} Chaves das células cobertas pelo círculo.
         */
        calculateCircleAoE(originX, originY, radiusMeters, cellSize = this.DEFAULT_CELL_SIZE, meterPerCell = this.DEFAULT_METER_PER_CELL) {
            const centerCol = Math.floor(originX / cellSize);
            const centerRow = Math.floor(originY / cellSize);
            const cellRadius = Math.ceil(radiusMeters / meterPerCell);

            const cells = [];
            for (let c = centerCol - cellRadius; c <= centerCol + cellRadius; c++) {
                for (let r = centerRow - cellRadius; r <= centerRow + cellRadius; r++) {
                    const dist = Math.sqrt(Math.pow(c - centerCol, 2) + Math.pow(r - centerRow, 2)) * meterPerCell;
                    if (dist <= radiusMeters) {
                        cells.push(this.toCellKey(c, r));
                    }
                }
            }
            return cells;
        },

        /**
         * Calcula células afetadas por um cone de chamas/sopro (AoE Cone).
         * @param {number} originX - Origem X (pixels).
         * @param {number} originY - Origem Y (pixels).
         * @param {number} angleDeg - Direção central do cone em graus (0° = Direita, 90° = Baixo, 180° = Esquerda, 270° = Cima).
         * @param {number} lengthMeters - Comprimento do cone em metros (ex: 6m).
         * @param {number} [spreadDeg=60] - Ângulo de abertura do cone (padrão 60°).
         * @param {number} [cellSize=40]
         * @param {number} [meterPerCell=1.5]
         * @returns {Array<string>} Chaves das células cobertas pelo cone.
         */
        calculateConeAoE(originX, originY, angleDeg, lengthMeters, spreadDeg = 60, cellSize = this.DEFAULT_CELL_SIZE, meterPerCell = this.DEFAULT_METER_PER_CELL) {
            const startCol = Math.floor(originX / cellSize);
            const startRow = Math.floor(originY / cellSize);
            const maxCellRange = Math.ceil(lengthMeters / meterPerCell);

            const targetAngleRad = (angleDeg * Math.PI) / 180;
            const halfSpreadRad = ((spreadDeg / 2) * Math.PI) / 180;

            const cells = [];

            for (let c = startCol - maxCellRange; c <= startCol + maxCellRange; c++) {
                for (let r = startRow - maxCellRange; r <= startRow + maxCellRange; r++) {
                    const dx = c - startCol;
                    const dy = r - startRow;
                    if (dx === 0 && dy === 0) {
                        cells.push(this.toCellKey(c, r)); // Origem sempre inclusa
                        continue;
                    }

                    const distMeters = Math.sqrt(dx * dx + dy * dy) * meterPerCell;
                    if (distMeters <= lengthMeters) {
                        const cellAngleRad = Math.atan2(dy, dx);
                        // Normaliza a diferença de ângulos entre -PI e PI
                        let diff = Math.abs(cellAngleRad - targetAngleRad);
                        while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);

                        if (diff <= halfSpreadRad) {
                            cells.push(this.toCellKey(c, r));
                        }
                    }
                }
            }

            return cells;
        },

        /**
         * Calcula células afetadas por uma linha / raio de energia (AoE Linha).
         * @param {number} startX - Origem X em pixels.
         * @param {number} startY - Origem Y em pixels.
         * @param {number} endX - Destino X em pixels.
         * @param {number} endY - Destino Y em pixels.
         * @param {number} [widthMeters=1.5] - Largura da linha em metros.
         * @param {number} [cellSize=40]
         * @param {number} [meterPerCell=1.5]
         * @returns {Array<string>} Chaves das células cruzadas pela linha.
         */
        calculateLineAoE(startX, startY, endX, endY, widthMeters = 1.5, cellSize = this.DEFAULT_CELL_SIZE, meterPerCell = this.DEFAULT_METER_PER_CELL) {
            const c0 = Math.floor(startX / cellSize);
            const r0 = Math.floor(startY / cellSize);
            const c1 = Math.floor(endX / cellSize);
            const r1 = Math.floor(endY / cellSize);

            const cells = new Set();
            const widthCells = Math.max(0, Math.floor((widthMeters / meterPerCell) / 2));

            // Algoritmo de Linha de Bresenham
            let dx = Math.abs(c1 - c0);
            let dy = Math.abs(r1 - r0);
            let sx = (c0 < c1) ? 1 : -1;
            let sy = (r0 < r1) ? 1 : -1;
            let err = dx - dy;

            let curC = c0;
            let curR = r0;

            while (true) {
                // Adiciona a célula principal e sua largura
                for (let oc = curC - widthCells; oc <= curC + widthCells; oc++) {
                    for (let or = curR - widthCells; or <= curR + widthCells; or++) {
                        cells.add(this.toCellKey(oc, or));
                    }
                }

                if (curC === c1 && curR === r1) break;
                const e2 = 2 * err;
                if (e2 > -dy) {
                    err -= dy;
                    curC += sx;
                }
                if (e2 < dx) {
                    err += dx;
                    curR += sy;
                }
            }

            return Array.from(cells);
        },

        /**
         * Identifica quais tokens estão posicionados dentro das células cobertas por um AoE.
         * @param {Array<Object>} tokens - Lista de tokens do VTT ({ id, name, x, y, ... }).
         * @param {Array<string>} aoeCells - Chaves de células da área afetada.
         * @param {number} [cellSize=40]
         * @returns {Array<Object>} Lista de tokens que foram atingidos pela área.
         */
        getTokensInAoE(tokens = [], aoeCells = [], cellSize = this.DEFAULT_CELL_SIZE) {
            const tokenList = Array.isArray(tokens) ? tokens : Object.values(tokens || {});
            const cellSet = new Set(Array.isArray(aoeCells) ? aoeCells : []);
            const hitTokens = [];

            tokenList.forEach(tok => {
                if (!tok) return;
                const col = Math.floor((tok.x || 0) / cellSize);
                const row = Math.floor((tok.y || 0) / cellSize);
                const key = this.toCellKey(col, row);

                if (cellSet.has(key)) {
                    hitTokens.push(tok);
                }
            });

            return hitTokens;
        }
    };

    return VttFogAoeEngine;
}));
