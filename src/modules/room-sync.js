/**
 * @file room-sync.js
 * @description Módulo de sincronização híbrida (LocalStorage-First + Firestore Room Sync),
 * com debounce inteligente, recuperação offline e resiliência a erros de permissão de rede.
 * @module RoomSync
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.RoomSync = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * @typedef {Object} SyncState
     * @property {boolean} isCloudAvailable - Se o Firestore está acessível sem bloqueios
     * @property {string|null} currentRoomId - ID da sala ativa no momento
     * @property {number} debounceMs - Intervalo em milissegundos para debounce de escrita
     */

    const RoomSync = {
        STORAGE_KEY_PREFIX: 'kuartor_',
        isCloudAvailable: true,
        debounceTimers: {},

        /**
         * Salva dados no localStorage do navegador com serialização JSON segura.
         * @param {string} key - Nome da chave (sem prefixo)
         * @param {any} data - Dados a persistir
         * @returns {boolean} Sucesso da gravação
         */
        saveLocal(key, data) {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    const fullKey = this.STORAGE_KEY_PREFIX + key;
                    window.localStorage.setItem(fullKey, JSON.stringify(data));
                    return true;
                }
            } catch (err) {
                console.warn(`[RoomSync] Erro ao salvar localmente (${key}):`, err.message);
            }
            return false;
        },

        /**
         * Carrega dados do localStorage do navegador.
         * @param {string} key - Nome da chave (sem prefixo)
         * @param {any} [defaultValue=null] - Valor padrão caso não exista
         * @returns {any} Dados recuperados ou valor padrão
         */
        loadLocal(key, defaultValue = null) {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    const fullKey = this.STORAGE_KEY_PREFIX + key;
                    const item = window.localStorage.getItem(fullKey);
                    if (item !== null) {
                        return JSON.parse(item);
                    }
                }
            } catch (err) {
                console.warn(`[RoomSync] Erro ao carregar localmente (${key}):`, err.message);
            }
            return defaultValue;
        },

        /**
         * Executa uma função assíncrona de sincronização com debounce por chave.
         * @param {string} key - Identificador único da operação (ex: 'sheet', 'room')
         * @param {Function} asyncFn - Função de envio para nuvem
         * @param {number} [delay=500] - Tempo de espera em ms
         */
        debounceSync(key, asyncFn, delay = 500) {
            if (this.debounceTimers[key]) {
                clearTimeout(this.debounceTimers[key]);
            }

            this.debounceTimers[key] = setTimeout(async () => {
                delete this.debounceTimers[key];
                if (!this.isCloudAvailable) return;

                try {
                    await asyncFn();
                } catch (err) {
                    this.handleSyncError(err);
                }
            }, delay);
        },

        /**
         * Trata erros de rede ou permissão do Firestore sem quebrar a aplicação.
         * @param {Error|Object} err - Erro retornado pela requisição
         */
        handleSyncError(err) {
            const msg = err?.message || String(err);
            if (err?.code === 'permission-denied' || msg.includes('permission') || msg.includes('BLOCKED_BY_CLIENT')) {
                console.warn('[RoomSync] Nuvem indisponível ou permissão negada. Alternando para Modo Local.');
                this.isCloudAvailable = false;
            } else {
                console.warn('[RoomSync] Aviso de sincronização:', msg);
            }
        },

        /**
         * Restaura a disponibilidade da nuvem manualmente ou ao reconectar.
         */
        resetCloudAvailability() {
            this.isCloudAvailable = true;
        }
    };

    return RoomSync;
}));
