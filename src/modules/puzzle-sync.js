/**
 * @file puzzle-sync.js
 * @description Módulo de sincronização e comunicação entre o Hub de Puzzles e a Mesa Virtual (VTT) do Kuar-Tor.
 * Permite registrar a resolução de enigmas e emitir gatilhos automáticos de masmorra para abrir portas
 * e desativar armadilhas em tempo real nas sessões do Firestore.
 * @module PuzzleSync
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.PuzzleSync = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const PUZZLE_CATALOG = {
        'contagem': { id: 'contagem', name: 'A Contagem Regressiva Para Nada', type: 'psychological', icon: '⏱️' },
        'lanternas': { id: 'lanternas', name: 'Lanternas Flamejantes', type: 'deduction', icon: '🏮' },
        'fios': { id: 'fios', name: 'Alavancas e Fios', type: 'spatial', icon: '🔌' },
        'areia': { id: 'areia', name: 'Linhas na Areia', type: 'graph', icon: '⏳' },
        'minas': { id: 'minas', name: 'O Campo Minado', type: 'deduction', icon: '💣' },
        'macanetas': { id: 'macanetas', name: 'A Porta das Cores', type: 'color_theory', icon: '🚪' },
        'batalha_monstros': { id: 'batalha_monstros', name: 'Torneio das Feras', type: 'elemental_combat', icon: '⚔️' },
        'forca_bruta': { id: 'forca_bruta', name: 'A Solução Simples', type: 'deception', icon: '🧰' },
        'entrada_oportuna': { id: 'entrada_oportuna', name: 'A Entrada Oportuna', type: 'astrology', icon: '🌙' },
        'exercito_infinito': { id: 'exercito_infinito', name: 'Exército Infinito', type: 'lateral_combat', icon: '🐺' }
    };

    const PuzzleSync = {
        STORAGE_KEY: 'kuartor_active_room_id',

        /**
         * Retorna o ID da sala ativa armazenada na sessão.
         * @returns {string|null} ID da sala
         */
        getActiveRoomId() {
            if (typeof window !== 'undefined' && window.sessionStorage) {
                return window.sessionStorage.getItem(this.STORAGE_KEY) || window.localStorage.getItem(this.STORAGE_KEY);
            }
            return null;
        },

        /**
         * Define a sala de campanha ativa para vincular os puzzles.
         * @param {string} roomId - Código da sala
         */
        setActiveRoomId(roomId) {
            if (typeof window !== 'undefined') {
                const cleanId = String(roomId).trim();
                if (window.sessionStorage) window.sessionStorage.setItem(this.STORAGE_KEY, cleanId);
                if (window.localStorage) window.localStorage.setItem(this.STORAGE_KEY, cleanId);
            }
        },

        /**
         * Constrói o payload de resolução de um puzzle.
         * @param {string} puzzleKey - Chave do puzzle
         * @param {string} [solvedBy='Grupo de Aventureiros'] - Nome do jogador/grupo
         * @returns {Object} Payload formatado
         */
        buildSolvedPayload(puzzleKey, solvedBy = 'Grupo de Aventureiros') {
            const info = PUZZLE_CATALOG[puzzleKey] || { id: puzzleKey, name: puzzleKey, type: 'custom', icon: '✨' };
            return {
                puzzleId: info.id,
                name: info.name,
                type: info.type,
                icon: info.icon,
                solved: true,
                solvedBy: String(solvedBy || 'Grupo de Aventureiros'),
                timestamp: new Date().toISOString()
            };
        },

        /**
         * Dispara a notificação de puzzle resolvido no Firestore da sala ativa.
         * @param {string} puzzleKey - Identificador do puzzle
         * @param {string} [solvedBy] - Nome de quem resolveu
         * @param {Object} [dbInstance] - Instância opcional do Firestore
         * @returns {Promise<Object>} Dados do evento disparado
         */
        async notifyPuzzleSolved(puzzleKey, solvedBy = 'Operativo', dbInstance = null) {
            const payload = this.buildSolvedPayload(puzzleKey, solvedBy);
            const roomId = this.getActiveRoomId();
            const db = dbInstance || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);

            if (roomId && db) {
                try {
                    await db.collection('rooms').doc(roomId).update({
                        [`puzzlesSolved.${puzzleKey}`]: payload,
                        updatedAt: new Date().toISOString()
                    });

                    // Mensagem no chat da sala
                    await db.collection('rooms').doc(roomId).collection('messages').add({
                        author: 'Sistemas da Masmorra',
                        text: `🔓 O Enigma [${payload.name}] foi COMPLETADO com sucesso! As engrenagens secretas de Kuar-Tor foram acionadas.`,
                        isSecret: false,
                        isRoll: false,
                        rollData: null,
                        createdAt: new Date().toISOString()
                    });
                } catch (err) {
                    console.warn('[PuzzleSync] Falha ao enviar para Firestore (Modo Offline):', err.message);
                }
            }

            return payload;
        },

        /**
         * Retorna a lista de puzzles do catálogo oficial.
         * @returns {Object} Catálogo de puzzles
         */
        getCatalog() {
            return PUZZLE_CATALOG;
        }
    };

    return PuzzleSync;
}));
