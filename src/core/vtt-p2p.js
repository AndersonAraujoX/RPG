/**
 * Kuar-Tor VTT — Módulo Multiplayer Peer-to-Peer (PeerJS)
 * Permite comunicação em tempo real P2P no GitHub Pages sem servidor intermediário.
 * Suporta Modo Mestre (Host/Broadcast), Modo Jogador (Client/Sync), Rolagens Secretas e Toasts.
 */

(function (global) {
    'use strict';

    // Tipos de Mensagens P2P
    const P2P_MESSAGE_TYPES = {
        HANDSHAKE: 'P2P_HANDSHAKE',
        PLAYER_JOIN: 'PLAYER_JOIN',
        PLAYER_LEAVE: 'PLAYER_LEAVE',
        SYNC_SCENE: 'SYNC_SCENE',
        TOKEN_MOVE: 'TOKEN_MOVE',
        TOKEN_UPDATE: 'TOKEN_UPDATE',
        TOKEN_SPAWN: 'TOKEN_SPAWN',
        TOKEN_DELETE: 'TOKEN_DELETE',
        COMBAT_UPDATE: 'COMBAT_UPDATE',
        CHAT_MESSAGE: 'CHAT_MESSAGE',
        SECRET_ROLL: 'SECRET_ROLL',
        HEARTBEAT: 'HEARTBEAT'
    };

    /**
     * Sistema de Notificações Toast no DOM
     */
    class ToastManager {
        constructor() {
            this.container = null;
            if (typeof document !== 'undefined') {
                this.initContainer();
            }
        }

        initContainer() {
            let el = document.getElementById('vtt-toast-container');
            if (!el) {
                el = document.createElement('div');
                el.id = 'vtt-toast-container';
                el.style.cssText = `
                    position: fixed;
                    bottom: 24px;
                    left: 24px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    pointer-events: none;
                    max-width: 360px;
                `;
                document.body.appendChild(el);
            }
            this.container = el;
        }

        show(message, type = 'info', duration = 4000) {
            if (!this.container && typeof document !== 'undefined') {
                this.initContainer();
            }
            if (!this.container) return;

            const toast = document.createElement('div');
            toast.style.cssText = `
                pointer-events: auto;
                padding: 10px 16px;
                border-radius: 8px;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                font-weight: 500;
                color: #ffffff;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(12px);
                animation: toast-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                transition: all 0.3s ease;
            `;

            let icon = '<i class="fa-solid fa-info-circle"></i>';
            if (type === 'success') {
                toast.style.background = 'rgba(6, 78, 59, 0.95)';
                toast.style.border = '1px solid #10b981';
                icon = '<i class="fa-solid fa-circle-check" style="color:#34d399;"></i>';
            } else if (type === 'error') {
                toast.style.background = 'rgba(127, 29, 29, 0.95)';
                toast.style.border = '1px solid #ef4444';
                icon = '<i class="fa-solid fa-triangle-exclamation" style="color:#f87171;"></i>';
            } else if (type === 'warning') {
                toast.style.background = 'rgba(120, 53, 15, 0.95)';
                toast.style.border = '1px solid #f59e0b';
                icon = '<i class="fa-solid fa-circle-exclamation" style="color:#fbbf24;"></i>';
            } else {
                toast.style.background = 'rgba(15, 23, 42, 0.95)';
                toast.style.border = '1px solid #38bdf8';
                icon = '<i class="fa-solid fa-circle-info" style="color:#38bdf8;"></i>';
            }

            toast.innerHTML = `<span>${icon}</span><span style="flex:1;">${message}</span>`;
            this.container.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px)';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
    }

    /**
     * Controlador de Rede P2P do VTT
     */
    class PeerVTTNetwork {
        constructor(options = {}) {
            this.options = Object.assign({
                debug: 1,
                roomPrefix: 'kuartor-',
                heartbeatIntervalMs: 8000,
                reconnectAttempts: 5,
                reconnectDelayMs: 3000
            }, options);

            this.isHost = false;
            this.roomId = null;
            this.peerId = null;
            this.peer = null;
            this.connections = new Map(); // Para o Host: Map<peerId, DataConnection>
            this.hostConn = null; // Para o Jogador: DataConnection com o Mestre
            this.playerName = options.playerName || 'Jogador';
            this.characterName = options.characterName || 'Operativo';

            this.listeners = new Map();
            this.toasts = new ToastManager();
            this.heartbeatTimer = null;
            this.reconnectCount = 0;
            this.intentionalDisconnect = false;
        }

        /**
         * Registra callbacks para eventos de rede
         */
        on(event, callback) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            this.listeners.get(event).push(callback);
            return this;
        }

        emit(event, data) {
            const list = this.listeners.get(event);
            if (list) {
                list.forEach(cb => cb(data));
            }
        }

        /**
         * Gera um Room ID curto e amigável
         */
        static generateRoomId() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let res = '';
            for (let i = 0; i < 6; i++) {
                res += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return `kuartor-${res}`;
        }

        /**
         * Obtém URL do QR Code para a sala
         */
        getQRCodeUrl(roomId) {
            const currentUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'https://andersonaraujox.github.io/RPG/';
            const joinUrl = `${currentUrl}?room=${roomId || this.roomId}`;
            return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(joinUrl)}`;
        }

        /**
         * Inicia a Sala como Mestre (Host)
         */
        async hostRoom(customRoomId = null) {
            if (typeof Peer === 'undefined') {
                throw new Error('PeerJS não está carregado. Inclua o CDN do PeerJS antes de iniciar.');
            }

            this.intentionalDisconnect = false;
            this.isHost = true;
            this.roomId = customRoomId || PeerVTTNetwork.generateRoomId();

            return new Promise((resolve, reject) => {
                try {
                    this.peer = new Peer(this.roomId, {
                        debug: this.options.debug
                    });

                    this.peer.on('open', (id) => {
                        this.peerId = id;
                        this.roomId = id;
                        this.toasts.show(`Sala criada como Mestre! ID: <strong>${id}</strong>`, 'success');
                        this.startHeartbeat();
                        this.emit('host_ready', { roomId: id });
                        resolve(id);
                    });

                    this.peer.on('connection', (conn) => {
                        this.handleIncomingConnection(conn);
                    });

                    this.peer.on('error', (err) => {
                        this.handlePeerError(err);
                        if (!this.peerId) reject(err);
                    });

                    this.peer.on('disconnected', () => {
                        this.handleDisconnect();
                    });

                } catch (err) {
                    reject(err);
                }
            });
        }

        /**
         * Conecta a uma Sala como Jogador (Client)
         */
        async joinRoom(targetRoomId, playerInfo = {}) {
            if (typeof Peer === 'undefined') {
                throw new Error('PeerJS não está carregado. Inclua o CDN do PeerJS.');
            }

            this.intentionalDisconnect = false;
            this.isHost = false;
            this.roomId = targetRoomId;
            if (playerInfo.playerName) this.playerName = playerInfo.playerName;
            if (playerInfo.characterName) this.characterName = playerInfo.characterName;

            return new Promise((resolve, reject) => {
                try {
                    this.peer = new Peer(undefined, {
                        debug: this.options.debug
                    });

                    this.peer.on('open', (id) => {
                        this.peerId = id;
                        this.toasts.show(`Conectando ao Mestre na sala ${targetRoomId}...`, 'info');

                        const conn = this.peer.connect(targetRoomId, {
                            metadata: {
                                playerName: this.playerName,
                                characterName: this.characterName
                            },
                            reliable: true
                        });

                        this.setupClientConnection(conn, resolve, reject);
                    });

                    this.peer.on('error', (err) => {
                        this.handlePeerError(err);
                        reject(err);
                    });

                    this.peer.on('disconnected', () => {
                        this.handleDisconnect();
                    });

                } catch (err) {
                    reject(err);
                }
            });
        }

        /**
         * Configura a conexão do Jogador com o Mestre
         */
        setupClientConnection(conn, resolve, reject) {
            this.hostConn = conn;

            conn.on('open', () => {
                this.reconnectCount = 0;
                this.toasts.show(`Conectado à Mesa do Mestre com sucesso!`, 'success');
                this.emit('connected_to_host', { hostId: conn.peer });

                // Envia apresentação inicial
                this.sendToHost(P2P_MESSAGE_TYPES.PLAYER_JOIN, {
                    playerName: this.playerName,
                    characterName: this.characterName
                });

                if (resolve) resolve(conn.peer);
            });

            conn.on('data', (data) => {
                this.handlePacket(data, conn);
            });

            conn.on('close', () => {
                this.toasts.show('Conexão com o Mestre encerrada.', 'warning');
                this.emit('disconnected_from_host');
                if (!this.intentionalDisconnect) {
                    this.attemptReconnect();
                }
            });

            conn.on('error', (err) => {
                this.toasts.show(`Erro de conexão com o Mestre: ${err.message || err}`, 'error');
                this.emit('connection_error', err);
            });
        }

        /**
         * Host recebe uma nova conexão de Jogador
         */
        handleIncomingConnection(conn) {
            conn.on('open', () => {
                const meta = conn.metadata || {};
                const player = {
                    peerId: conn.peer,
                    playerName: meta.playerName || 'Jogador Desconhecido',
                    characterName: meta.characterName || 'Personagem',
                    conn: conn,
                    connectedAt: Date.now()
                };

                this.connections.set(conn.peer, player);
                this.toasts.show(`${player.playerName} (${player.characterName}) entrou na mesa!`, 'info');
                this.emit('player_connected', player);
                this.emit('players_updated', this.getConnectedPlayersList());

                // Notifica os outros jogadores
                this.broadcast(P2P_MESSAGE_TYPES.PLAYER_JOIN, {
                    peerId: conn.peer,
                    playerName: player.playerName,
                    characterName: player.characterName
                }, conn.peer);

                // Dispara solicitação de envio do estado atual da cena ao novo jogador
                this.emit('request_scene_sync', { targetPeerId: conn.peer });
            });

            conn.on('data', (data) => {
                this.handlePacket(data, conn);
            });

            conn.on('close', () => {
                const player = this.connections.get(conn.peer);
                if (player) {
                    this.toasts.show(`${player.playerName} saiu da mesa.`, 'warning');
                    this.connections.delete(conn.peer);
                    this.emit('player_disconnected', { peerId: conn.peer });
                    this.emit('players_updated', this.getConnectedPlayersList());

                    this.broadcast(P2P_MESSAGE_TYPES.PLAYER_LEAVE, {
                        peerId: conn.peer,
                        playerName: player.playerName
                    });
                }
            });

            conn.on('error', (err) => {
                console.error(`Erro na conexão com ${conn.peer}:`, err);
            });
        }

        /**
         * Roteador de Pacotes P2P Recebidos
         */
        handlePacket(packet, senderConn) {
            if (!packet || typeof packet !== 'object') return;

            const { type, payload, senderId } = packet;

            switch (type) {
                case P2P_MESSAGE_TYPES.CHAT_MESSAGE:
                    this.emit('chat_message', payload);
                    if (this.isHost) {
                        this.broadcast(type, payload, senderConn.peer);
                    }
                    break;

                case P2P_MESSAGE_TYPES.SECRET_ROLL:
                    // Rolagem secreta só é vista pelo GM e pelo autor
                    if (this.isHost) {
                        this.emit('secret_roll_received', payload);
                        this.toasts.show(`🎲 Rolagem Secreta recebida de ${payload.sender}: ${payload.text}`, 'info');
                    }
                    break;

                case P2P_MESSAGE_TYPES.SYNC_SCENE:
                    this.emit('scene_synced', payload);
                    break;

                case P2P_MESSAGE_TYPES.TOKEN_MOVE:
                    this.emit('token_moved', payload);
                    if (this.isHost) {
                        this.broadcast(type, payload, senderConn.peer);
                    }
                    break;

                case P2P_MESSAGE_TYPES.TOKEN_UPDATE:
                    this.emit('token_updated', payload);
                    if (this.isHost) {
                        this.broadcast(type, payload, senderConn.peer);
                    }
                    break;

                case P2P_MESSAGE_TYPES.TOKEN_SPAWN:
                    this.emit('token_spawned', payload);
                    if (this.isHost) {
                        this.broadcast(type, payload, senderConn.peer);
                    }
                    break;

                case P2P_MESSAGE_TYPES.TOKEN_DELETE:
                    this.emit('token_deleted', payload);
                    if (this.isHost) {
                        this.broadcast(type, payload, senderConn.peer);
                    }
                    break;

                case P2P_MESSAGE_TYPES.COMBAT_UPDATE:
                    this.emit('combat_updated', payload);
                    if (this.isHost) {
                        this.broadcast(type, payload, senderConn.peer);
                    }
                    break;

                case P2P_MESSAGE_TYPES.PLAYER_JOIN:
                    this.emit('player_joined', payload);
                    break;

                case P2P_MESSAGE_TYPES.PLAYER_LEAVE:
                    this.emit('player_left', payload);
                    break;

                case P2P_MESSAGE_TYPES.HEARTBEAT:
                    // Responde com PONG silencioso
                    break;

                default:
                    this.emit('custom_message', { type, payload, senderId: senderConn.peer });
            }
        }

        /**
         * Envia dados para o Host (se for Jogador)
         */
        sendToHost(type, payload) {
            if (this.isHost) return;
            if (this.hostConn && this.hostConn.open) {
                this.hostConn.send({
                    type,
                    payload,
                    senderId: this.peerId,
                    timestamp: Date.now()
                });
            } else {
                console.warn('Tentativa de envio sem conexão aberta com o Mestre.');
            }
        }

        /**
         * Transmite dados para todos os Jogadores (se for Host)
         */
        broadcast(type, payload, excludePeerId = null) {
            if (!this.isHost) return;

            const packet = {
                type,
                payload,
                senderId: this.peerId,
                timestamp: Date.now()
            };

            this.connections.forEach((player, pId) => {
                if (pId !== excludePeerId && player.conn && player.conn.open) {
                    try {
                        player.conn.send(packet);
                    } catch (e) {
                        console.error(`Erro ao enviar pacote para ${pId}:`, e);
                    }
                }
            });
        }

        /**
         * Envia pacote para um jogador específico
         */
        sendToPlayer(targetPeerId, type, payload) {
            if (!this.isHost) return;
            const player = this.connections.get(targetPeerId);
            if (player && player.conn && player.conn.open) {
                player.conn.send({
                    type,
                    payload,
                    senderId: this.peerId,
                    timestamp: Date.now()
                });
            }
        }

        /**
         * Envia Mensagem de Chat Pública
         */
        sendChatMessage(author, text, isRoll = false, rollData = null) {
            const payload = {
                id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                author: author || this.playerName,
                text,
                isRoll,
                rollData,
                time: new Date().toTimeString().split(' ')[0]
            };

            if (this.isHost) {
                this.emit('chat_message', payload);
                this.broadcast(P2P_MESSAGE_TYPES.CHAT_MESSAGE, payload);
            } else {
                this.sendToHost(P2P_MESSAGE_TYPES.CHAT_MESSAGE, payload);
            }
        }

        /**
         * Envia Rolagem Secreta para o Mestre
         */
        sendSecretRoll(author, formula, totalResult, details) {
            const payload = {
                id: 'sec_' + Date.now(),
                sender: author || this.playerName,
                formula,
                totalResult,
                details,
                text: `${author} rolou secretamente: ${formula} = ${totalResult} (${details})`,
                time: new Date().toTimeString().split(' ')[0]
            };

            if (this.isHost) {
                this.toasts.show(`🎲 Sua rolagem secreta: ${payload.text}`, 'info');
                this.emit('secret_roll_received', payload);
            } else {
                this.sendToHost(P2P_MESSAGE_TYPES.SECRET_ROLL, payload);
                this.toasts.show(`Rolagem secreta enviada apenas ao Mestre!`, 'success');
            }
        }

        /**
         * Lista de Jogadores Conectados
         */
        getConnectedPlayersList() {
            const list = [];
            this.connections.forEach(p => {
                list.push({
                    peerId: p.peerId,
                    playerName: p.playerName,
                    characterName: p.characterName,
                    connectedAt: p.connectedAt
                });
            });
            return list;
        }

        /**
         * Sistema de Reconexão e Heartbeat
         */
        startHeartbeat() {
            if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = setInterval(() => {
                if (this.isHost) {
                    this.broadcast(P2P_MESSAGE_TYPES.HEARTBEAT, { ping: Date.now() });
                } else if (this.hostConn && this.hostConn.open) {
                    this.sendToHost(P2P_MESSAGE_TYPES.HEARTBEAT, { ping: Date.now() });
                }
            }, this.options.heartbeatIntervalMs);
        }

        attemptReconnect() {
            if (this.reconnectCount >= this.options.reconnectAttempts) {
                this.toasts.show('Não foi possível reconectar à sessão. Tente novamente mais tarde.', 'error');
                return;
            }

            this.reconnectCount++;
            this.toasts.show(`Tentativa de reconexão (${this.reconnectCount}/${this.options.reconnectAttempts})...`, 'warning');

            setTimeout(() => {
                if (this.isHost) {
                    if (this.peer && this.peer.disconnected) {
                        this.peer.reconnect();
                    }
                } else if (this.roomId) {
                    this.joinRoom(this.roomId, {
                        playerName: this.playerName,
                        characterName: this.characterName
                    }).catch(() => {
                        this.attemptReconnect();
                    });
                }
            }, this.options.reconnectDelayMs);
        }

        handlePeerError(err) {
            console.error('PeerJS Error:', err);
            if (err.type === 'peer-unavailable') {
                this.toasts.show(`Sala não encontrada ou Mestre offline. Verifique o ID.`, 'error');
            } else if (err.type === 'network') {
                this.toasts.show(`Erro de rede no PeerJS. Tentando restaurar...`, 'warning');
            } else {
                this.toasts.show(`Erro P2P: ${err.type || err.message}`, 'error');
            }
        }

        handleDisconnect() {
            if (!this.intentionalDisconnect) {
                this.toasts.show('Sinal P2P interrompido. Reconectando...', 'warning');
                this.attemptReconnect();
            }
        }

        disconnect() {
            this.intentionalDisconnect = true;
            if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
            if (this.hostConn) {
                if (typeof this.hostConn.close === 'function') this.hostConn.close();
                this.hostConn = null;
            }
            this.connections.forEach(p => {
                if (p.conn && typeof p.conn.close === 'function') {
                    try { p.conn.close(); } catch (e) {}
                }
            });
            this.connections.clear();
            if (this.peer) {
                if (typeof this.peer.destroy === 'function') {
                    try { this.peer.destroy(); } catch (e) {}
                }
                this.peer = null;
            }
            this.toasts.show('Desconectado da sessão P2P.', 'info');
            this.emit('disconnected');
        }
    }

    // Exportação para Navegador e Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { PeerVTTNetwork, ToastManager, P2P_MESSAGE_TYPES };
    } else {
        global.PeerVTTNetwork = PeerVTTNetwork;
        global.ToastManager = ToastManager;
        global.P2P_MESSAGE_TYPES = P2P_MESSAGE_TYPES;
    }

})(typeof window !== 'undefined' ? window : global);
