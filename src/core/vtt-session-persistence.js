/**
 * @file src/core/vtt-session-persistence.js
 * @description Motor de Persistência Local-First, Histórico de Ações (Undo/Redo)
 * e Exportação/Importação de Cenas JSON para a Mesa Virtual 2D (Kuar-Tor VTT).
 * @module VttSessionPersistence
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.VttSessionPersistence = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const VttSessionPersistence = {
        STORAGE_KEY_DEFAULT: 'kuartor_vtt_saved_scene',
        SCHEMA_VERSION: 1,

        /**
         * Serializa o estado da mesa virtual em um objeto limpo e pronto para JSON.
         * @param {Object} state - Estado atual do VTT.
         * @param {Object} [metadata={}] - Metadados adicionais opcionais (ex: nome da cena).
         * @returns {Object} Objeto serializado com versão de schema e timestamp.
         */
        serializeScene(state = {}, metadata = {}) {
            if (!state || typeof state !== 'object') {
                throw new Error('Estado inválido fornecido para serialização.');
            }

            // Normaliza tokens
            const tokens = {};
            if (state.tokens && typeof state.tokens === 'object') {
                Object.keys(state.tokens).forEach(id => {
                    const t = state.tokens[id];
                    if (t && typeof t === 'object') {
                        tokens[id] = {
                            id: t.id || id,
                            name: t.name || 'Token',
                            hp: Number.isFinite(t.hp) ? t.hp : 10,
                            maxHp: Number.isFinite(t.maxHp) ? t.maxHp : (t.hp || 10),
                            pe: Number.isFinite(t.pe) ? t.pe : 0,
                            maxPe: Number.isFinite(t.maxPe) ? t.maxPe : (t.pe || 0),
                            avatar: t.avatar || '',
                            color: t.color || '#66FCF1',
                            size: Number.isFinite(t.size) ? t.size : 1,
                            x: Number.isFinite(t.x) ? t.x : 0,
                            y: Number.isFinite(t.y) ? t.y : 0,
                            conditions: Array.isArray(t.conditions) ? [...t.conditions] : [],
                            characterId: t.characterId || null
                        };
                    }
                });
            }

            // Normaliza combatentes
            const combatants = Array.isArray(state.combatants)
                ? state.combatants.map(c => ({
                    id: c.id,
                    name: c.name || 'Combatente',
                    avatar: c.avatar || '',
                    initiative: Number.isFinite(c.initiative) ? c.initiative : 0,
                    hp: Number.isFinite(c.hp) ? c.hp : 10,
                    maxHp: Number.isFinite(c.maxHp) ? c.maxHp : 10,
                    pe: Number.isFinite(c.pe) ? c.pe : 0,
                    maxPe: Number.isFinite(c.maxPe) ? c.maxPe : 0,
                    isPlayer: Boolean(c.isPlayer)
                }))
                : [];

            // Normaliza névoa (células reveladas)
            let fogRevealedCells = [];
            if (Array.isArray(state.fogRevealedCells)) {
                fogRevealedCells = [...state.fogRevealedCells];
            } else if (state.fogRevealedCells instanceof Set) {
                fogRevealedCells = Array.from(state.fogRevealedCells);
            }

            return {
                version: this.SCHEMA_VERSION,
                timestamp: Date.now(),
                metadata: {
                    sceneName: metadata.sceneName || 'Cena Padrão Kuar-Tor',
                    author: metadata.author || 'Mestre',
                    ...metadata
                },
                map: {
                    url: state.mapUrl || (metadata && metadata.mapUrl) || (state.mapImg ? state.mapImg.src : '') || '',
                    scale: Number.isFinite(state.scale) ? state.scale : 1,
                    originX: Number.isFinite(state.originX) ? state.originX : 0,
                    originY: Number.isFinite(state.originY) ? state.originY : 0,
                    gridSize: Number.isFinite(state.gridSize) ? state.gridSize : 50,
                    showGrid: state.showGrid !== undefined ? Boolean(state.showGrid) : true,
                    snapToGrid: state.snapToGrid !== undefined ? Boolean(state.snapToGrid) : true
                },
                tokens,
                combat: {
                    combatants,
                    currentRound: Number.isFinite(state.currentRound) ? state.currentRound : 1,
                    currentTurnIndex: Number.isFinite(state.currentTurnIndex) ? state.currentTurnIndex : 0
                },
                fog: {
                    revealedCells: fogRevealedCells
                }
            };
        },

        /**
         * Desserializa um payload de cena e mescla de forma segura no estado destino.
         * @param {Object|string} payload - Dados salvos (objeto ou string JSON).
         * @param {Object} targetState - Estado em memória a ser atualizado.
         * @returns {Object} O estado destino atualizado.
         */
        deserializeScene(payload, targetState = {}) {
            if (!payload) {
                throw new Error('Nenhum dado fornecido para desserialização.');
            }

            let data = payload;
            if (typeof payload === 'string') {
                try {
                    data = JSON.parse(payload);
                } catch (err) {
                    throw new Error(`Falha ao converter JSON de cena: ${err.message}`);
                }
            }

            if (typeof data !== 'object') {
                throw new Error('Estrutura de dados de cena inválida.');
            }

            // Aplicar mapa e grid
            if (data.map && typeof data.map === 'object') {
                if (data.map.url !== undefined) targetState.mapUrl = data.map.url;
                if (Number.isFinite(data.map.scale)) targetState.scale = data.map.scale;
                if (Number.isFinite(data.map.originX)) targetState.originX = data.map.originX;
                if (Number.isFinite(data.map.originY)) targetState.originY = data.map.originY;
                if (Number.isFinite(data.map.gridSize)) targetState.gridSize = data.map.gridSize;
                if (data.map.showGrid !== undefined) targetState.showGrid = Boolean(data.map.showGrid);
                if (data.map.snapToGrid !== undefined) targetState.snapToGrid = Boolean(data.map.snapToGrid);
            }

            // Aplicar tokens
            targetState.tokens = {};
            if (data.tokens && typeof data.tokens === 'object') {
                Object.keys(data.tokens).forEach(id => {
                    const t = data.tokens[id];
                    if (t && typeof t === 'object') {
                        targetState.tokens[id] = {
                            id: t.id || id,
                            name: t.name || 'Token',
                            hp: Number.isFinite(t.hp) ? t.hp : 10,
                            maxHp: Number.isFinite(t.maxHp) ? t.maxHp : 10,
                            pe: Number.isFinite(t.pe) ? t.pe : 0,
                            maxPe: Number.isFinite(t.maxPe) ? t.maxPe : 0,
                            avatar: t.avatar || '',
                            color: t.color || '#66FCF1',
                            size: Number.isFinite(t.size) ? t.size : 1,
                            x: Number.isFinite(t.x) ? t.x : 0,
                            y: Number.isFinite(t.y) ? t.y : 0,
                            conditions: Array.isArray(t.conditions) ? [...t.conditions] : [],
                            characterId: t.characterId || null
                        };
                    }
                });
            }

            // Aplicar combate
            if (data.combat && typeof data.combat === 'object') {
                targetState.combatants = Array.isArray(data.combat.combatants) ? [...data.combat.combatants] : [];
                targetState.currentRound = Number.isFinite(data.combat.currentRound) ? data.combat.currentRound : 1;
                targetState.currentTurnIndex = Number.isFinite(data.combat.currentTurnIndex) ? data.combat.currentTurnIndex : 0;
            }

            // Aplicar névoa
            if (data.fog && Array.isArray(data.fog.revealedCells)) {
                targetState.fogRevealedCells = [...data.fog.revealedCells];
            }

            return targetState;
        },

        /**
         * Cria um gerenciador de histórico para suportar Desfazer (Undo) e Refazer (Redo).
         * @param {number} [maxSnapshots=25] - Capacidade máxima da pilha de histórico.
         */
        createHistoryManager(maxSnapshots = 25) {
            const self = this;
            let undoStack = [];
            let redoStack = [];

            return {
                getMaxSnapshots() {
                    return maxSnapshots;
                },

                getUndoCount() {
                    return undoStack.length;
                },

                getRedoCount() {
                    return redoStack.length;
                },

                canUndo() {
                    return undoStack.length > 0;
                },

                canRedo() {
                    return redoStack.length > 0;
                },

                /**
                 * Registra um snapshot do estado na pilha de histórico de Desfazer.
                 * Limpa a pilha de Redo após novas ações.
                 * @param {Object} state - Estado atual do VTT.
                 */
                pushSnapshot(state) {
                    if (!state) return;
                    const snapshot = JSON.stringify(self.serializeScene(state));
                    undoStack.push(snapshot);
                    if (undoStack.length > maxSnapshots) {
                        undoStack.shift();
                    }
                    redoStack = [];
                },

                /**
                 * Desfaz a última ação restaurando o snapshot anterior.
                 * @param {Object} currentState - Estado atual do VTT (armazenado para refazer).
                 * @returns {Object|null} Estado desserializado ou null se não houver histórico.
                 */
                undo(currentState) {
                    if (undoStack.length === 0) return null;

                    // Salva estado atual na pilha de redo
                    if (currentState) {
                        const currentSnap = JSON.stringify(self.serializeScene(currentState));
                        redoStack.push(currentSnap);
                    }

                    const targetSnap = undoStack.pop();
                    return self.deserializeScene(targetSnap, {});
                },

                /**
                 * Refaz a ação previamente desfeita.
                 * @param {Object} currentState - Estado atual antes de refazer.
                 * @returns {Object|null} Estado restaurado ou null se não houver redo.
                 */
                redo(currentState) {
                    if (redoStack.length === 0) return null;

                    // Salva estado atual na pilha de undo
                    if (currentState) {
                        const currentSnap = JSON.stringify(self.serializeScene(currentState));
                        undoStack.push(currentSnap);
                    }

                    const targetSnap = redoStack.pop();
                    return self.deserializeScene(targetSnap, {});
                },

                /**
                 * Limpa todo o histórico.
                 */
                clear() {
                    undoStack = [];
                    redoStack = [];
                }
            };
        },

        /**
         * Alias para serializeScene para compatibilidade de nomenclatura.
         */
        serializeVttState(state, metadata = {}) {
            return this.serializeScene(state, metadata);
        },

        /**
         * Alias para deserializeScene para compatibilidade de nomenclatura.
         */
        deserializeVttState(payload, targetState = {}) {
            return this.deserializeScene(payload, targetState);
        },

        /**
         * Salva o estado atual no localStorage com segurança (suporta tanto (key, state) quanto (state, metadata)).
         * @param {string|Object} arg1 - Chave do storage OU objeto de estado diretamente.
         * @param {Object} [arg2={}] - Objeto de estado OU metadados/storage.
         * @param {Storage} [arg3=null] - Instância de Storage.
         * @returns {boolean} Sucesso do salvamento.
         */
        saveToLocalStorage(arg1 = this.STORAGE_KEY_DEFAULT, arg2 = {}, arg3 = null) {
            let storageKey = this.STORAGE_KEY_DEFAULT;
            let state = {};
            let metadata = {};
            let storage = null;

            if (typeof arg1 === 'string') {
                storageKey = arg1;
                state = arg2 || {};
                storage = arg3;
            } else if (arg1 && typeof arg1 === 'object') {
                state = { ...arg1 };
                if (arg2 && typeof arg2 === 'object' && typeof arg2.getItem !== 'function') {
                    metadata = arg2;
                    Object.assign(state, arg2);
                } else if (arg2 && typeof arg2.getItem === 'function') {
                    storage = arg2;
                }
                storage = arg3 || storage;
            }

            const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
            if (!store) return false;

            try {
                const serialized = this.serializeScene(state, metadata);
                store.setItem(storageKey, JSON.stringify(serialized));
                return true;
            } catch (err) {
                // Tratamento de QuotaExceededError (ex: mapas base64 gigantes)
                if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
                    try {
                        const fallback = this.serializeScene({ ...state, mapUrl: '' }, { ...metadata, mapUrl: '' });
                        store.setItem(storageKey, JSON.stringify(fallback));
                        console.warn('[VttSessionPersistence] Imagem de mapa muito grande para localStorage. Cena salva com sucesso sem imagem base64 embutida.');
                        return true;
                    } catch (e2) {}
                }
                console.warn('Falha ao salvar cena no storage local:', err.message);
                return false;
            }
        },

        /**
         * Carrega o estado previamente salvo do localStorage (suporta (key) ou (storage)).
         * @param {string|Storage} [arg1=this.STORAGE_KEY_DEFAULT]
         * @param {Storage} [arg2=null]
         * @returns {Object|null} Objeto salvo ou null se não existir/corrompido.
         */
        loadFromLocalStorage(arg1 = this.STORAGE_KEY_DEFAULT, arg2 = null) {
            let storageKey = this.STORAGE_KEY_DEFAULT;
            let storage = null;

            if (typeof arg1 === 'string') {
                storageKey = arg1;
                storage = arg2;
            } else if (arg1 && typeof arg1.getItem === 'function') {
                storage = arg1;
            }

            const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
            if (!store) return null;

            try {
                const raw = store.getItem(storageKey);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                if (parsed && parsed.map && parsed.map.url && !parsed.mapUrl) {
                    parsed.mapUrl = parsed.map.url;
                }
                return parsed;
            } catch (err) {
                console.warn('Falha ao carregar cena do storage local:', err.message);
                return null;
            }
        },

        /**
         * Gera string JSON formatada para exportação/backup da cena.
         * @param {Object} state
         * @param {Object} [metadata={}]
         * @returns {string} String JSON pronta para download.
         */
        generateExportJson(state, metadata = {}) {
            const serialized = this.serializeScene(state, metadata);
            return JSON.stringify(serialized, null, 2);
        },

        /**
         * Valida e interpreta um arquivo JSON importado.
         * @param {string} jsonString
         * @returns {Object} Dados validados da cena.
         */
        parseImportJson(jsonString) {
            if (!jsonString || typeof jsonString !== 'string') {
                throw new Error('Conteúdo do arquivo JSON vazio ou inválido.');
            }
            const data = JSON.parse(jsonString);
            if (!data || typeof data !== 'object') {
                throw new Error('JSON não contém uma estrutura de cena válida.');
            }
            return data;
        }
    };

    return VttSessionPersistence;
}));
