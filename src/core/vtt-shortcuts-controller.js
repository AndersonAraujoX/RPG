/**
 * @file src/core/vtt-shortcuts-controller.js
 * @description Controlador de Atalhos de Teclado e Ergonomia para a Mesa Virtual (Kuar-Tor VTT).
 * Isola a captura de eventos de teclado, protegendo formulários e inputs, e acionando
 * ações semânticas como Undo, Redo, Delete, Pan temporário com Space, e ciclo de tokens.
 * @module VttShortcutsController
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.VttShortcutsController = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const VttShortcutsController = {

        /**
         * Verifica se o elemento com foco é um campo de texto ou formulário que requer digitação.
         * @param {Element|Object} target - Elemento alvo do evento.
         * @returns {boolean} True se estiver digitando em campo de texto.
         */
        isEditableElement(target) {
            if (!target || typeof target !== 'object') return false;

            const tagName = String(target.tagName || '').toUpperCase();
            if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
                return true;
            }
            if (target.isContentEditable === true) {
                return true;
            }
            return false;
        },

        /**
         * Avalia um evento de teclado e retorna a ação canônica correspondente.
         * @param {KeyboardEvent|Object} event - Evento de teclado.
         * @returns {string|null} Nome da ação correspondente ('UNDO', 'REDO', 'DELETE_TOKEN', etc.) ou null.
         */
        resolveKeyAction(event) {
            if (!event || typeof event !== 'object') return null;

            // Se o usuário estiver digitando em um input, não intercepta
            if (this.isEditableElement(event.target)) {
                return null;
            }

            const key = event.key || '';
            const code = event.code || '';
            const ctrlOrMeta = Boolean(event.ctrlKey || event.metaKey);
            const shift = Boolean(event.shiftKey);

            // 1. Desfazer (Ctrl+Z ou Cmd+Z sem Shift)
            if (ctrlOrMeta && !shift && (key === 'z' || key === 'Z' || code === 'KeyZ')) {
                return 'UNDO';
            }

            // 2. Refazer (Ctrl+Y, Cmd+Y ou Ctrl+Shift+Z)
            if (ctrlOrMeta && ((key === 'y' || key === 'Y' || code === 'KeyY') || (shift && (key === 'z' || key === 'Z' || code === 'KeyZ')))) {
                return 'REDO';
            }

            // 3. Remover token selecionado (Delete ou Backspace)
            if (key === 'Delete' || key === 'Backspace' || code === 'Delete' || code === 'Backspace') {
                return 'DELETE_TOKEN';
            }

            // 4. Cancelar / Deselecionar / Fechar (Escape)
            if (key === 'Escape' || code === 'Escape') {
                return 'ESCAPE';
            }

            // 5. Espaço (Modo Pan temporário)
            if (key === ' ' || code === 'Space') {
                return 'SPACE_PAN';
            }

            // 6. Ciclar tokens (Tab)
            if (key === 'Tab' || code === 'Tab') {
                return shift ? 'CYCLE_TOKEN_PREV' : 'CYCLE_TOKEN_NEXT';
            }

            // 7. Ping Tático (Tecla T ou P)
            if (!ctrlOrMeta && (key === 't' || key === 'T' || key === 'p' || key === 'P' || code === 'KeyT' || code === 'KeyP')) {
                return 'PING';
            }

            // 8. Régua (Tecla R)
            if (!ctrlOrMeta && (key === 'r' || key === 'R' || code === 'KeyR')) {
                return 'TOOL_RULER';
            }

            // 9. Seleção padrão (Tecla S ou V)
            if (!ctrlOrMeta && (key === 's' || key === 'S' || key === 'v' || key === 'V' || code === 'KeyS' || code === 'KeyV')) {
                return 'TOOL_SELECT';
            }

            // 10. Névoa (Tecla F)
            if (!ctrlOrMeta && (key === 'f' || key === 'F' || code === 'KeyF')) {
                return 'TOOL_FOG';
            }

            // 11. Desenho Livre (Tecla D)
            if (!ctrlOrMeta && (key === 'd' || key === 'D' || code === 'KeyD')) {
                return 'TOOL_DRAW';
            }

            // 12. Grid (Tecla G)
            if (!ctrlOrMeta && (key === 'g' || key === 'G' || code === 'KeyG')) {
                return 'TOGGLE_GRID';
            }

            // 13. Próximo Turno (Tecla N)
            if (!ctrlOrMeta && (key === 'n' || key === 'N' || code === 'KeyN')) {
                return 'NEXT_TURN';
            }

            return null;
        },

        /**
         * Cria uma instância conectada do controlador de atalhos.
         * @param {Object} handlers - Dicionário de callbacks para cada ação.
         * @param {Object} [options={}] - Opções extras (autoAttach por padrão true).
         */
        createController(handlers = {}, options = {}) {
            const self = this;
            let spacePanningActive = false;
            let previousTool = null;
            let isAttached = false;
            let boundKeyDown = null;
            let boundKeyUp = null;
            const targetWindow = options.window || options.target || (typeof window !== 'undefined' ? window : null);

            const controller = {
                getSpacePanningActive() {
                    return spacePanningActive;
                },

                handleKeyDown(event) {
                    const action = self.resolveKeyAction(event);
                    if (!action) return null;

                    // Previne comportamentos padrão do navegador onde apropriado
                    if (event.preventDefault && action !== 'ESCAPE') {
                        event.preventDefault();
                    }

                    const call = (fn, ...args) => { if (typeof fn === 'function') fn(...args); };

                    switch (action) {
                        case 'UNDO':
                            call(handlers.onUndo || handlers.undo);
                            break;
                        case 'REDO':
                            call(handlers.onRedo || handlers.redo);
                            break;
                        case 'DELETE_TOKEN':
                            call(handlers.onDeleteToken || handlers.deleteToken);
                            break;
                        case 'ESCAPE':
                            call(handlers.onEscape || handlers.escape);
                            break;
                        case 'SPACE_PAN':
                            if (!spacePanningActive) {
                                spacePanningActive = true;
                                const fn = handlers.onSpacePanStart || handlers.spacePanStart;
                                if (typeof fn === 'function') {
                                    previousTool = fn();
                                }
                            }
                            break;
                        case 'CYCLE_TOKEN_NEXT':
                            call(handlers.onCycleToken || handlers.cycleToken, 1);
                            break;
                        case 'CYCLE_TOKEN_PREV':
                            call(handlers.onCycleToken || handlers.cycleToken, -1);
                            break;
                        case 'PING':
                            call(handlers.onPing || handlers.ping || handlers.toolPing);
                            break;
                        case 'TOOL_RULER':
                            if (handlers.toolRuler) call(handlers.toolRuler);
                            else call(handlers.onSetTool || handlers.setTool, 'ruler');
                            break;
                        case 'TOOL_SELECT':
                            if (handlers.toolSelect) call(handlers.toolSelect);
                            else call(handlers.onSetTool || handlers.setTool, 'select');
                            break;
                        case 'TOOL_FOG':
                            if (handlers.toolFog) call(handlers.toolFog);
                            else call(handlers.onSetTool || handlers.setTool, 'fog');
                            break;
                        case 'TOOL_DRAW':
                            if (handlers.toolDraw) call(handlers.toolDraw);
                            else call(handlers.onSetTool || handlers.setTool, 'draw');
                            break;
                        case 'TOGGLE_GRID':
                            call(handlers.toggleGrid);
                            break;
                        case 'NEXT_TURN':
                            call(handlers.nextTurn);
                            break;
                        default:
                            break;
                    }

                    return action;
                },

                handleKeyUp(event) {
                    if (!event || typeof event !== 'object') return null;
                    const key = event.key || '';
                    const code = event.code || '';

                    if ((key === ' ' || code === 'Space') && spacePanningActive) {
                        spacePanningActive = false;
                        const fn = handlers.onSpacePanEnd || handlers.spacePanEnd;
                        if (typeof fn === 'function') {
                            fn(previousTool);
                        }
                        return 'SPACE_PAN_END';
                    }
                    return null;
                },

                attach() {
                    if (isAttached || !targetWindow) return;
                    boundKeyDown = (e) => this.handleKeyDown(e);
                    boundKeyUp = (e) => this.handleKeyUp(e);
                    targetWindow.addEventListener('keydown', boundKeyDown);
                    targetWindow.addEventListener('keyup', boundKeyUp);
                    isAttached = true;
                },

                detach() {
                    if (!isAttached || !targetWindow) return;
                    targetWindow.removeEventListener('keydown', boundKeyDown);
                    targetWindow.removeEventListener('keyup', boundKeyUp);
                    isAttached = false;
                }
            };

            // Auto attach se targetWindow estiver disponível e autoAttach não for falso
            if (options.autoAttach !== false && targetWindow) {
                controller.attach();
            }

            return controller;
        }
    };

    return VttShortcutsController;
}));
