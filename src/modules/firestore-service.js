/**
 * @file firestore-service.js
 * @description Serviço modular de persistência e sincronização em tempo real do Firebase Firestore.
 * Abstrai consultas, listeners de salas, chat e fichas de personagens.
 * @module FirestoreService
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.FirestoreService = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const FirestoreService = {
        /**
         * Monta o payload de mensagem de chat ou rolagem com timestamp.
         * @param {string} author - Nome do autor
         * @param {string} text - Conteúdo da mensagem
         * @param {boolean} [isRoll=false] - Se é rolagem de dados
         * @param {Object} [rollData=null] - Dados estruturados da rolagem
         * @returns {Object} Payload pronto para envio
         */
        buildMessagePayload(author, text, isRoll = false, rollData = null) {
            return {
                author: author || 'Operativo',
                text: String(text || ''),
                isRoll: Boolean(isRoll),
                rollData: rollData || null,
                createdAt: new Date().toISOString()
            };
        },

        /**
         * Gera um código numérico de 6 dígitos para novas salas de campanha.
         * @returns {string} Código de sala de 6 dígitos
         */
        generateRoomCode() {
            return Math.floor(100000 + Math.random() * 900000).toString();
        },

        /**
         * Monta o documento inicial de uma nova sala de campanha.
         * @param {string} roomName - Nome da campanha
         * @param {string} hostUid - UID do mestre criador
         * @param {string} hostName - Nome do mestre
         * @returns {Object} Dados da sala
         */
        buildRoomDocument(roomName, hostUid, hostName) {
            return {
                name: roomName || 'Campanha Kuar-Tor',
                hostUid: hostUid || 'anon',
                hostName: hostName || 'Mestre',
                status: 'active',
                combatRound: 1,
                combatants: [
                    { id: 'c1', name: 'Arthur Lâmina', des: 3, forVal: 3, pv: 20, maxPv: 20, rd: 2, init: 0, active: false, conditions: [] },
                    { id: 'c2', name: 'Thorgar Machado', des: 2, forVal: 4, pv: 25, maxPv: 25, rd: 3, init: 0, active: false, conditions: [] },
                    { id: 'c3', name: 'Orc Guerreiro', des: 2, forVal: 3, pv: 18, maxPv: 18, rd: 1, init: 0, active: false, conditions: [] }
                ],
                tokens: [
                    { id: 't1', name: 'Arthur', x: 80, y: 80, color: 'bg-blue-600', icon: 'fa-shield-halved' },
                    { id: 't2', name: 'Thorgar', x: 160, y: 120, color: 'bg-emerald-600', icon: 'fa-gavel' },
                    { id: 't3', name: 'Orc', x: 240, y: 200, color: 'bg-red-600', icon: 'fa-skull' }
                ],
                fogOfWar: []
            };
        }
    };

    return FirestoreService;
}));
