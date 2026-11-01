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

            // 7. Ping Tático (Tecla T)
            if (!ctrlOrMeta && (key === 't' || key === 'T' || code === 'KeyT')) {
                return 'PING';
            }

            // 8. Régua (Tecla R)
            if (!ctrlOrMeta && (key === 'r' || key === 'R' || code === 'KeyR')) {
                return 'TOOL_RULER';
            }

            // 9. Seleção padrão (Tecla S)
            if (!ctrlOrMeta && (key === 's' || key === 'S' || code === 'KeyS')) {
                return 'TOOL_SELECT';
            }

            return null;
        },

        /**
         * Cria uma instância conectada do controlador de atalhos.
         * @param {Object} handlers - Dicionário de callbacks para cada ação.
         * @param {Object} [options={}] - Opções extras.
         */
        createController(handlers = {}, options = {}) {
            const self = this;
            let spacePanningActive = false;
            let previousTool = null;
            let isAttached = false;
            let boundKeyDown = null;
            let boundKeyUp = null;
            const targetWindow = options.window || (typeof window !== 'undefined' ? window : null);

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

                    switch (action) {
                        case 'UNDO':
                            if (typeof handlers.onUndo === 'function') handlers.onUndo();
                            break;
                        case 'REDO':
                            if (typeof handlers.onRedo === 'function') handlers.onRedo();
                            break;
                        case 'DELETE_TOKEN':
                            if (typeof handlers.onDeleteToken === 'function') handlers.onDeleteToken();
                            break;
                        case 'ESCAPE':
                            if (typeof handlers.onEscape === 'function') handlers.onEscape();
                            break;
                        case 'SPACE_PAN':
                            if (!spacePanningActive) {
                                spacePanningActive = true;
                                if (typeof handlers.onSpacePanStart === 'function') {
                                    previousTool = handlers.onSpacePanStart();
                                }
                            }
                            break;
                        case 'CYCLE_TOKEN_NEXT':
                            if (typeof handlers.onCycleToken === 'function') handlers.onCycleToken(1);
                            break;
                        case 'CYCLE_TOKEN_PREV':
                            if (typeof handlers.onCycleToken === 'function') handlers.onCycleToken(-1);
                            break;
                        case 'PING':
                            if (typeof handlers.onPing === 'function') handlers.onPing();
                            break;
                        case 'TOOL_RULER':
                            if (typeof handlers.onSetTool === 'function') handlers.onSetTool('ruler');
                            break;
                        case 'TOOL_SELECT':
                            if (typeof handlers.onSetTool === 'function') handlers.onSetTool('select');
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
                        if (typeof handlers.onSpacePanEnd === 'function') {
                            handlers.onSpacePanEnd(previousTool);
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

            return controller;
        }
    };

    return VttShortcutsController;
}));
