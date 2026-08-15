/**
 * @file vtt-firestore.js
 * @description Motor de sincronização em tempo real para o Kuar-Tor VTT baseado no Cloud Firestore.
 * Gerencia salas, tokens atômicos, névoa de guerra, rolagens de dados, chat, turnos de combate,
 * gatilhos de puzzles e papéis de GM (Mestre) vs Jogador.
 * @module VTTFirestore
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.VTTFirestore = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * @typedef {Object} TokenData
     * @property {string} id - Identificador único do token
     * @property {string} name - Nome do personagem/criatura
     * @property {number} x - Posição X em pixels
     * @property {number} y - Posição Y em pixels
     * @property {number} hp - Pontos de vida atuais
     * @property {number} maxHp - Pontos de vida máximos
     * @property {number} [pe] - Pontos de esforço / mana
     * @property {number} [maxPe] - Pontos de esforço máximos
     * @property {string} [avatar] - URL da imagem do token
     * @property {string} [color] - Cor da borda do token
     * @property {number} [size=1] - Tamanho em quadrados (1x1, 2x2, etc.)
     * @property {string[]} [conditions=[]] - Lista de emojis/status de condição
     * @property {string} [ownerUid] - UID do jogador dono do token
     */

    /**
     * @typedef {Object} RoomData
     * @property {string} id - Código da sala (6 dígitos ou slug)
     * @property {string} name - Nome da campanha
     * @property {string} hostUid - UID do mestre criador
     * @property {string} hostName - Nome do mestre
     * @property {string} mapUrl - URL do mapa tático ativo
     * @property {number} gridSize - Tamanho do grid em pixels (padrão 50)
     * @property {Object.<string, TokenData>} tokens - Dicionário de tokens na mesa
     * @property {Array} combatants - Lista de combatentes na ordem de iniciativa
     * @property {number} currentRound - Rodada atual do combate
     * @property {number} currentTurnIndex - Índice do combatente ativo
     * @property {string|null} fogData - Base64 ou dados da névoa de guerra
     * @property {Object.<string, boolean>} puzzlesSolved - Estado de resolução dos puzzles
     * @property {string} updatedAt - Timestamp da última modificação
     */

    class VTTFirestoreEngine {
        constructor(dbInstance = null, authInstance = null) {
            this.db = dbInstance;
            this.auth = authInstance;
            this.currentRoomId = null;
            this.currentUser = null;
            this.isHost = false;
            this.unsubscribeRoom = null;
            this.unsubscribeMessages = null;
            this.listeners = {
                onRoomUpdate: [],
                onTokenMove: [],
                onMessage: [],
                onCombatUpdate: [],
                onPuzzleTrigger: [],
                onError: []
            };

            this._initFirebaseInstances();
        }

        _initFirebaseInstances() {
            if (!this.db && typeof firebase !== 'undefined' && firebase.firestore) {
                this.db = firebase.firestore();
            }
            if (!this.auth && typeof firebase !== 'undefined' && firebase.auth) {
                this.auth = firebase.auth();
                this.auth.onAuthStateChanged(user => {
                    this.currentUser = user ? {
                        uid: user.uid,
                        displayName: user.displayName || (user.isAnonymous ? 'Operativo Anônimo' : 'Aventureiro'),
                        isAnonymous: user.isAnonymous
                    } : null;
                });
            }
        }

        // ==========================================
        // Event Listeners Subscription
        // ==========================================

        on(event, callback) {
            if (this.listeners[event] && typeof callback === 'function') {
                this.listeners[event].push(callback);
            }
            return () => this.off(event, callback);
        }

        off(event, callback) {
            if (this.listeners[event]) {
                this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
            }
        }

        _emit(event, data) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(cb => {
                    try { cb(data); } catch (e) { console.error(`[VTTFirestore] Erro no listener ${event}:`, e); }
                });
            }
        }

        // ==========================================
        // Room Management (Salas de Jogo)
        // ==========================================

        generateRoomCode() {
            return Math.floor(100000 + Math.random() * 900000).toString();
        }

        buildInitialRoomData(roomCode, roomName, hostUid, hostName, mapUrl) {
            return {
                id: String(roomCode),
                name: String(roomName || 'Campanha Kuar-Tor'),
                hostUid: String(hostUid || 'anon_host'),
                hostName: String(hostName || 'Mestre'),
                mapUrl: String(mapUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2000&q=80'),
                gridSize: 50,
                tokens: {},
                combatants: [],
                currentRound: 1,
                currentTurnIndex: 0,
                fogData: null,
                puzzlesSolved: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }

        async createRoom(roomName = 'Campanha Kuar-Tor', mapUrl = null) {
            this._initFirebaseInstances();
            const hostUid = this.currentUser ? this.currentUser.uid : 'anon_' + Date.now();
            const hostName = this.currentUser ? this.currentUser.displayName : 'Mestre Kuar-Tor';
            const roomCode = this.generateRoomCode();
            const roomData = this.buildInitialRoomData(roomCode, roomName, hostUid, hostName, mapUrl);

            if (this.db) {
                await this.db.collection('rooms').doc(roomCode).set(roomData);
            }

            this.isHost = true;
            this.currentRoomId = roomCode;
            this.listenRoom(roomCode);
            return roomData;
        }

        async joinRoom(roomCode) {
            this._initFirebaseInstances();
            const cleanCode = String(roomCode).trim();
            if (!this.db) {
                this.currentRoomId = cleanCode;
                return { id: cleanCode, name: 'Sala Offline/Mock' };
            }

            const docRef = this.db.collection('rooms').doc(cleanCode);
            const snapshot = await docRef.get();

            if (!snapshot.exists) {
                throw new Error(`Sala ${cleanCode} não encontrada.`);
            }

            const roomData = snapshot.data();
            this.currentRoomId = cleanCode;
            this.isHost = (this.currentUser && roomData.hostUid === this.currentUser.uid);
            this.listenRoom(cleanCode);
            return roomData;
        }

        listenRoom(roomCode) {
            this.leaveRoom();
            this.currentRoomId = roomCode;

            if (!this.db) return;

            const docRef = this.db.collection('rooms').doc(roomCode);
            this.unsubscribeRoom = docRef.onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    this.isHost = (this.currentUser && data.hostUid === this.currentUser.uid);
                    this._emit('onRoomUpdate', data);
                }
            }, err => {
                console.error('[VTTFirestore] Erro ao escutar sala:', err);
                this._emit('onError', err);
            });

            // Escutar mensagens / rolagens de dados
            const messagesRef = docRef.collection('messages').orderBy('createdAt', 'asc').limitToLast(50);
            this.unsubscribeMessages = messagesRef.onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        this._emit('onMessage', { id: change.doc.id, ...change.doc.data() });
                    }
                });
            }, err => {
                console.warn('[VTTFirestore] Erro no listener de mensagens:', err);
            });
        }

        leaveRoom() {
            if (typeof this.unsubscribeRoom === 'function') {
                this.unsubscribeRoom();
                this.unsubscribeRoom = null;
            }
            if (typeof this.unsubscribeMessages === 'function') {
                this.unsubscribeMessages();
                this.unsubscribeMessages = null;
            }
            this.currentRoomId = null;
            this.isHost = false;
        }

        // ==========================================
        // Token Management (Sincronização de Tokens)
        // ==========================================

        async setToken(token) {
            if (!this.currentRoomId || !token || !token.id) return;

            const sanitizedToken = {
                id: String(token.id),
                name: String(token.name || 'Token'),
                x: Number(token.x) || 0,
                y: Number(token.y) || 0,
                hp: Number(token.hp) || 10,
                maxHp: Number(token.maxHp || token.hp) || 10,
                pe: Number(token.pe) || 0,
                maxPe: Number(token.maxPe || token.pe) || 0,
                avatar: String(token.avatar || ''),
                color: String(token.color || '#66FCF1'),
                size: Number(token.size) || 1,
                conditions: Array.isArray(token.conditions) ? token.conditions : [],
                ownerUid: token.ownerUid || (this.currentUser ? this.currentUser.uid : 'anon')
            };

            if (this.db) {
                const updatePayload = {
                    [`tokens.${sanitizedToken.id}`]: sanitizedToken,
                    updatedAt: new Date().toISOString()
                };
                await this.db.collection('rooms').doc(this.currentRoomId).update(updatePayload);
            }
            return sanitizedToken;
        }

        async moveToken(tokenId, x, y) {
            if (!this.currentRoomId || !tokenId) return;

            if (this.db) {
                const updatePayload = {
                    [`tokens.${tokenId}.x`]: Number(x),
                    [`tokens.${tokenId}.y`]: Number(y),
                    updatedAt: new Date().toISOString()
                };
                await this.db.collection('rooms').doc(this.currentRoomId).update(updatePayload);
            }
        }

        async updateTokenStats(tokenId, stats = {}) {
            if (!this.currentRoomId || !tokenId) return;

            if (this.db) {
                const updatePayload = { updatedAt: new Date().toISOString() };
                Object.keys(stats).forEach(key => {
                    updatePayload[`tokens.${tokenId}.${key}`] = stats[key];
                });
                await this.db.collection('rooms').doc(this.currentRoomId).update(updatePayload);
            }
        }

        async deleteToken(tokenId) {
            if (!this.currentRoomId || !tokenId) return;

            if (this.db) {
                const updatePayload = {
                    [`tokens.${tokenId}`]: firebase.firestore.FieldValue.delete(),
                    updatedAt: new Date().toISOString()
                };
                await this.db.collection('rooms').doc(this.currentRoomId).update(updatePayload);
            }
        }

        // ==========================================
        // Combat & Initiative (Turnos de Combate)
        // ==========================================

        async updateCombatState(combatants, currentRound = 1, currentTurnIndex = 0) {
            if (!this.currentRoomId) return;

            const payload = {
                combatants: Array.isArray(combatants) ? combatants : [],
                currentRound: Number(currentRound) || 1,
                currentTurnIndex: Number(currentTurnIndex) || 0,
                updatedAt: new Date().toISOString()
            };

            if (this.db) {
                await this.db.collection('rooms').doc(this.currentRoomId).update(payload);
            }
            return payload;
        }

        // ==========================================
        // Fog of War & Map Sync
        // ==========================================

        async updateMap(mapUrl) {
            if (!this.currentRoomId || !mapUrl) return;

            if (this.db) {
                await this.db.collection('rooms').doc(this.currentRoomId).update({
                    mapUrl: String(mapUrl),
                    updatedAt: new Date().toISOString()
                });
            }
        }

        async updateFogOfWar(fogData) {
            if (!this.currentRoomId) return;

            if (this.db) {
                await this.db.collection('rooms').doc(this.currentRoomId).update({
                    fogData: fogData || null,
                    updatedAt: new Date().toISOString()
                });
            }
        }

        // ==========================================
        // Chat & Dice Roller (+2d6)
        // ==========================================

        async sendMessage(text, authorName = null, isSecret = false, rollData = null) {
            if (!this.currentRoomId) return;

            const author = authorName || (this.currentUser ? this.currentUser.displayName : 'Operativo');
            const messagePayload = {
                author: String(author),
                text: String(text || ''),
                isSecret: Boolean(isSecret),
                isRoll: Boolean(rollData),
                rollData: rollData || null,
                senderUid: this.currentUser ? this.currentUser.uid : 'anon',
                createdAt: new Date().toISOString()
            };

            if (this.db) {
                await this.db.collection('rooms').doc(this.currentRoomId).collection('messages').add(messagePayload);
            }
            return messagePayload;
        }

        // ==========================================
        // Dungeon Puzzle Triggers
        // ==========================================

        async triggerPuzzleSolved(puzzleId, puzzleName = 'Enigma Desconhecido') {
            if (!this.currentRoomId || !puzzleId) return;

            const puzzleRecord = {
                id: String(puzzleId),
                name: String(puzzleName),
                solved: true,
                solvedBy: this.currentUser ? this.currentUser.displayName : 'Aventureiro',
                solvedAt: new Date().toISOString()
            };

            if (this.db) {
                const payload = {
                    [`puzzlesSolved.${puzzleId}`]: puzzleRecord,
                    updatedAt: new Date().toISOString()
                };
                await this.db.collection('rooms').doc(this.currentRoomId).update(payload);
                
                // Grava notificação no chat da sala
                await this.sendMessage(`✨ O Enigma [${puzzleName}] foi superado! Uma passagem secreta estala nas profundezas da masmorra.`, 'Sistema Kuar-Tor', false, null);
            }
            return puzzleRecord;
        }
    }

    return new VTTFirestoreEngine();
}));
