/**
 * Testes Unitários para o Módulo Multiplayer Peer-to-Peer (PeerJS) em VTT
 * Valida o controlador de rede PeerVTTNetwork, ToastManager e protocolos de sincronização.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const { PeerVTTNetwork, ToastManager, P2P_MESSAGE_TYPES } = require('../src/core/vtt-p2p.js');

QUnit.module('Módulo Multiplayer P2P (PeerJS) — Kuar-Tor VTT', function () {

    QUnit.test('Estrutura e Exportações do Módulo P2P', function (assert) {
        assert.ok(PeerVTTNetwork, 'PeerVTTNetwork deve ser uma classe exportada');
        assert.ok(ToastManager, 'ToastManager deve ser uma classe exportada');
        assert.ok(P2P_MESSAGE_TYPES, 'P2P_MESSAGE_TYPES deve conter tipos de mensagens');

        assert.ok(P2P_MESSAGE_TYPES.CHAT_MESSAGE, 'P2P_MESSAGE_TYPES.CHAT_MESSAGE definido');
        assert.ok(P2P_MESSAGE_TYPES.SECRET_ROLL, 'P2P_MESSAGE_TYPES.SECRET_ROLL definido');
        assert.ok(P2P_MESSAGE_TYPES.SYNC_SCENE, 'P2P_MESSAGE_TYPES.SYNC_SCENE definido');
        assert.ok(P2P_MESSAGE_TYPES.TOKEN_MOVE, 'P2P_MESSAGE_TYPES.TOKEN_MOVE definido');
        assert.ok(P2P_MESSAGE_TYPES.COMBAT_UPDATE, 'P2P_MESSAGE_TYPES.COMBAT_UPDATE definido');
    });

    QUnit.test('Geração de Room ID e URLs de Convite / QR Code', function (assert) {
        const roomId = PeerVTTNetwork.generateRoomId();
        assert.ok(roomId.startsWith('kuartor-'), 'Room ID deve iniciar com prefixo kuartor-');
        assert.equal(roomId.length, 14, 'Room ID deve ter tamanho esperado (kuartor-XXXXXX)');

        const net = new PeerVTTNetwork({ playerName: 'Mestre Anderson' });
        const qrUrl = net.getQRCodeUrl('kuartor-TEST12');
        assert.ok(qrUrl.includes('api.qrserver.com'), 'QR Code URL deve apontar para o gerador de QR');
        assert.ok(qrUrl.includes('kuartor-TEST12'), 'QR Code URL deve conter o ID da sala');
    });

    QUnit.test('Simulação de Envio de Chat e Rolagem Pública', function (assert) {
        const net = new PeerVTTNetwork({ playerName: 'Kaelen' });
        let messageReceived = null;

        net.on('chat_message', (msg) => {
            messageReceived = msg;
        });

        net.isHost = true; // Simulando Host
        net.sendChatMessage('Kaelen', 'Avanço com o escudo erguido!');

        assert.ok(messageReceived, 'Mensagem de chat disparada via evento local');
        assert.equal(messageReceived.author, 'Kaelen', 'Autor correto');
        assert.equal(messageReceived.text, 'Avanço com o escudo erguido!', 'Texto correto');
        assert.ok(messageReceived.time, 'Timestamp presente');
    });

    QUnit.test('Simulação de Rolagem Secreta para o Mestre', function (assert) {
        const net = new PeerVTTNetwork({ playerName: 'Ladino Sombrio' });
        let secretRollData = null;

        net.on('secret_roll_received', (roll) => {
            secretRollData = roll;
        });

        net.isHost = true; // Host recebe
        net.sendSecretRoll('Ladino Sombrio', '2d6+4', 13, 'Sucesso Furtivo');

        assert.ok(secretRollData, 'Rolagem secreta capturada pelo Mestre');
        assert.equal(secretRollData.sender, 'Ladino Sombrio', 'Remetente correto');
        assert.equal(secretRollData.totalResult, 13, 'Resultado correto');
        assert.ok(secretRollData.text.includes('secretamente'), 'Texto formatado como rolagem secreta');
    });

    QUnit.test('Roteamento de Pacotes de Sincronização (Tokens & Combate)', function (assert) {
        const net = new PeerVTTNetwork();
        let tokenMoved = null;
        let combatUpdated = null;
        let sceneSynced = null;

        net.on('token_moved', (d) => { tokenMoved = d; });
        net.on('combat_updated', (d) => { combatUpdated = d; });
        net.on('scene_synced', (d) => { sceneSynced = d; });

        // Simula recebimento de pacote TOKEN_MOVE
        net.handlePacket({
            type: P2P_MESSAGE_TYPES.TOKEN_MOVE,
            payload: { id: 'tok_123', x: 250, y: 300 },
            senderId: 'peer_abc'
        }, { peer: 'peer_abc' });

        assert.deepEqual(tokenMoved, { id: 'tok_123', x: 250, y: 300 }, 'TOKEN_MOVE roteado');

        // Simula recebimento de COMBAT_UPDATE
        net.handlePacket({
            type: P2P_MESSAGE_TYPES.COMBAT_UPDATE,
            payload: { round: 2, turn: 1, combatants: [{ id: 'tok_1', init: 15 }] },
            senderId: 'peer_host'
        }, { peer: 'peer_host' });

        assert.equal(combatUpdated.round, 2, 'COMBAT_UPDATE round roteado');
        assert.equal(combatUpdated.combatants.length, 1, 'Combatentes roteados');

        // Simula recebimento de SYNC_SCENE
        net.handlePacket({
            type: P2P_MESSAGE_TYPES.SYNC_SCENE,
            payload: { mapUrl: 'https://exemplo.com/mapa.jpg', tokens: {} },
            senderId: 'peer_host'
        }, { peer: 'peer_host' });

        assert.equal(sceneSynced.mapUrl, 'https://exemplo.com/mapa.jpg', 'SYNC_SCENE roteado');
    });

    QUnit.test('Gerenciamento de Lista de Jogadores e Desconexão Graciosa', function (assert) {
        const net = new PeerVTTNetwork();
        net.isHost = true;

        // Adiciona 2 conexões simuladas
        net.connections.set('peer_1', {
            peerId: 'peer_1',
            playerName: 'Arthur',
            characterName: 'Paladino',
            connectedAt: Date.now(),
            conn: { open: true, send: () => {} }
        });
        net.connections.set('peer_2', {
            peerId: 'peer_2',
            playerName: 'Morgana',
            characterName: 'Maga',
            connectedAt: Date.now(),
            conn: { open: true, send: () => {} }
        });

        const list = net.getConnectedPlayersList();
        assert.equal(list.length, 2, '2 jogadores conectados');
        assert.equal(list[0].playerName, 'Arthur', 'Jogador 1 correto');
        assert.equal(list[1].characterName, 'Maga', 'Personagem 2 correto');

        // Desconexão limpa
        net.disconnect();
        assert.equal(net.connections.size, 0, 'Conexões limpas ao desconectar');
        assert.ok(net.intentionalDisconnect, 'Flag de desconexão intencional marcada');
    });

    QUnit.test('Roteamento de Pings Táticos, Desenhos e Magias (AAA)', function (assert) {
        // Arrange
        const net = new PeerVTTNetwork();
        let pingReceived = null;
        let strokeReceived = null;
        let clearDrawingsCalled = false;
        let spellReceived = null;

        net.on('tactical_ping', (d) => { pingReceived = d; });
        net.on('draw_stroke', (d) => { strokeReceived = d; });
        net.on('clear_drawings', () => { clearDrawingsCalled = true; });
        net.on('spell_cast', (d) => { spellReceived = d; });

        // Act & Assert 1: TACTICAL_PING
        net.handlePacket({
            type: P2P_MESSAGE_TYPES.TACTICAL_PING,
            payload: { x: 120, y: 180, author: 'Mago', color: '#66FCF1' },
            senderId: 'peer_1'
        }, { peer: 'peer_1' });
        assert.equal(pingReceived.author, 'Mago', 'TACTICAL_PING author recebido');
        assert.equal(pingReceived.x, 120, 'Posição X do ping correta');

        // Act & Assert 2: DRAW_STROKE
        net.handlePacket({
            type: P2P_MESSAGE_TYPES.DRAW_STROKE,
            payload: { color: '#ef4444', size: 3, points: [{ x: 10, y: 20 }] },
            senderId: 'peer_1'
        }, { peer: 'peer_1' });
        assert.equal(strokeReceived.color, '#ef4444', 'DRAW_STROKE recebido com cor');
        assert.equal(strokeReceived.points.length, 1, 'Pontos do stroke recebidos');

        // Act & Assert 3: CLEAR_DRAWINGS
        net.handlePacket({
            type: P2P_MESSAGE_TYPES.CLEAR_DRAWINGS,
            payload: {},
            senderId: 'peer_1'
        }, { peer: 'peer_1' });
        assert.ok(clearDrawingsCalled, 'CLEAR_DRAWINGS disparou evento');

        // Act & Assert 4: SPELL_CAST
        net.handlePacket({
            type: P2P_MESSAGE_TYPES.SPELL_CAST,
            payload: { author: 'Clérigo', text: 'Cura Divina', effectAmount: 8 },
            senderId: 'peer_1'
        }, { peer: 'peer_1' });
        assert.equal(spellReceived.author, 'Clérigo', 'SPELL_CAST author correto');
        assert.equal(spellReceived.effectAmount, 8, 'SPELL_CAST efeito numérico correto');
    });

    QUnit.test('Host Rebroadcast de Pings, Desenhos e Magias para Clientes Conectados (AAA)', function (assert) {
        // Arrange
        const net = new PeerVTTNetwork();
        net.isHost = true;

        let peer2Sent = null;
        let peer3Sent = null;

        net.connections.set('peer_sender', {
            peerId: 'peer_sender',
            conn: { open: true, send: () => {} }
        });
        net.connections.set('peer_other_1', {
            peerId: 'peer_other_1',
            conn: { open: true, send: (data) => { peer2Sent = data; } }
        });
        net.connections.set('peer_other_2', {
            peerId: 'peer_other_2',
            conn: { open: true, send: (data) => { peer3Sent = data; } }
        });

        // Act: Envia DRAW_STROKE vindo de peer_sender
        net.handlePacket({
            type: P2P_MESSAGE_TYPES.DRAW_STROKE,
            payload: { color: '#38bdf8', points: [] },
            senderId: 'peer_sender'
        }, { peer: 'peer_sender' });

        // Assert
        assert.ok(peer2Sent, 'Host deve rebroadcastar pacote de desenho para peer_other_1');
        assert.ok(peer3Sent, 'Host deve rebroadcastar pacote de desenho para peer_other_2');
        assert.equal(peer2Sent.type, P2P_MESSAGE_TYPES.DRAW_STROKE, 'Tipo de pacote preservado no rebroadcast');
    });
});
