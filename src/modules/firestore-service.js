/**
 * @file firestore-service.js
 * @description Serviço modular de persistência e sincronização em tempo real do Firebase Firestore.
 * Abstrai consultas, listeners de salas, chat, fichas de personagens, transações atômicas de inventário
 * e persistência da Biblioteca Arcana / Grimório.
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
        },

        // ========================================================
        // Gestão de Fichas de Personagens (CRUD & Nuvem)
        // ========================================================

        /**
         * Monta um objeto seguro de ficha de personagem para persistência no Firestore.
         * @param {Object} data - Dados brutos do personagem
         * @param {string} [ownerUid] - UID do dono
         * @returns {Object} Objeto de ficha formatado
         */
        buildCharacterPayload(data, ownerUid = 'anon') {
            return {
                id: data.id || ('char_' + Date.now()),
                ownerUid: ownerUid || data.ownerUid || 'anon',
                name: String(data.name || '').trim() || 'Herói Sem Nome',
                concept: String(data.concept || '').trim() || 'Aventureiro',
                attributes: {
                    forVal: Number(data.attributes?.forVal ?? data.forVal ?? 1),
                    des: Number(data.attributes?.des ?? data.des ?? 1),
                    intVal: Number(data.attributes?.intVal ?? data.intVal ?? 1),
                    con: Number(data.attributes?.con ?? data.con ?? 1),
                    car: Number(data.attributes?.car ?? data.car ?? 1),
                    vont: Number(data.attributes?.vont ?? data.vont ?? 1),
                    per: Number(data.attributes?.per ?? data.per ?? 1)
                },
                combatStats: {
                    pv: Number(data.combatStats?.pv ?? data.pv ?? 12),
                    maxPv: Number(data.combatStats?.maxPv ?? data.maxPv ?? 12),
                    pe: Number(data.combatStats?.pe ?? data.pe ?? 6),
                    maxPe: Number(data.combatStats?.maxPe ?? data.maxPe ?? 6),
                    rd: Number(data.combatStats?.rd ?? data.rd ?? 0)
                },
                inventory: Array.isArray(data.inventory) ? data.inventory : [],
                skills: Array.isArray(data.skills) ? data.skills : [],
                avatar: String(data.avatar || ''),
                updatedAt: new Date().toISOString()
            };
        },

        /**
         * Executa a lógica de transferência atômica de item entre dois inventários.
         * Garante que o item seja removido da origem e adicionado ao destino sem perdas ou duplicações.
         * @param {Array} sourceInventory - Inventário de origem
         * @param {Array} targetInventory - Inventário de destino
         * @param {string} itemId - ID do item a transferir
         * @param {number} [quantity=1] - Quantidade a transferir
         * @returns {{ success: boolean, sourceInventory: Array, targetInventory: Array, transferredItem: Object|null, error?: string }}
         */
        transferItemTransaction(sourceInventory, targetInventory, itemId, quantity = 1) {
            if (!Array.isArray(sourceInventory) || !Array.isArray(targetInventory)) {
                return { success: false, sourceInventory, targetInventory, transferredItem: null, error: 'Inventários inválidos.' };
            }

            const itemIndex = sourceInventory.findIndex(i => i.id === itemId || i.name === itemId);
            if (itemIndex === -1) {
                return { success: false, sourceInventory, targetInventory, transferredItem: null, error: 'Item não encontrado no inventário de origem.' };
            }

            const sourceItem = sourceInventory[itemIndex];
            const transferQty = Math.min(Math.max(1, Number(quantity) || 1), sourceItem.quantity || 1);

            const updatedSource = [...sourceInventory];
            const updatedTarget = [...targetInventory];

            if ((sourceItem.quantity || 1) <= transferQty) {
                updatedSource.splice(itemIndex, 1);
            } else {
                updatedSource[itemIndex] = {
                    ...sourceItem,
                    quantity: sourceItem.quantity - transferQty
                };
            }

            const targetIndex = updatedTarget.findIndex(i => i.name === sourceItem.name && i.type === sourceItem.type);
            if (targetIndex !== -1) {
                updatedTarget[targetIndex] = {
                    ...updatedTarget[targetIndex],
                    quantity: (updatedTarget[targetIndex].quantity || 1) + transferQty
                };
            } else {
                updatedTarget.push({
                    ...sourceItem,
                    id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                    quantity: transferQty
                });
            }

            return {
                success: true,
                sourceInventory: updatedSource,
                targetInventory: updatedTarget,
                transferredItem: { ...sourceItem, quantity: transferQty }
            };
        },

        // ========================================================
        // Grimório Arcana & Persistência de Magias
        // ========================================================

        /**
         * Monta o documento do Grimório do jogador para salvar na nuvem.
         * @param {string} ownerUid - UID do jogador
         * @param {Array} unlockedSpells - Lista de IDs ou nomes de magias desbloqueadas
         * @param {number} spentXp - XP total investido na árvore
         * @param {Array} customFusions - Lista de magias customizadas de fusão elemental
         * @returns {Object} Documento do grimório
         */
        buildGrimoirePayload(ownerUid, unlockedSpells = [], spentXp = 0, customFusions = []) {
            return {
                ownerUid: String(ownerUid || 'anon'),
                unlockedSpells: Array.isArray(unlockedSpells) ? unlockedSpells : [],
                spentXp: Number(spentXp) || 0,
                customFusions: Array.isArray(customFusions) ? customFusions : [],
                updatedAt: new Date().toISOString()
            };
        }
    };

    return FirestoreService;
}));
