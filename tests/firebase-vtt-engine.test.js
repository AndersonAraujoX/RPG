/**
 * @file firebase-vtt-engine.test.js
 * @description Suíte de testes unitários para o motor de sincronização em tempo real VTTFirestore.
 * Segue o padrão Arrange-Act-Assert (AAA), cobrindo caminho feliz, casos de borda e tratamento de erros.
 */

const QUnit = require('qunit');
const path = require('path');
const VTTFirestore = require('../src/core/vtt-firestore.js');

QUnit.module('VTTFirestore Engine (Sincronização em Tempo Real)', function (hooks) {

    hooks.beforeEach(function () {
        // Reset listeners and state
        VTTFirestore.leaveRoom();
        VTTFirestore.listeners = {
            onRoomUpdate: [],
            onTokenMove: [],
            onMessage: [],
            onCombatUpdate: [],
            onPuzzleTrigger: [],
            onError: []
        };
    });

    QUnit.test('1. Geração e estrutura de sala inicial (Caminho Feliz)', function (assert) {
        // Arrange
        const roomCode = '849201';
        const roomName = 'Masmorras de Kuar-Tor';
        const hostUid = 'user_gm_123';
        const hostName = 'Mestre Arcano';
        const mapUrl = 'https://example.com/mapa.png';

        // Act
        const roomData = VTTFirestore.buildInitialRoomData(roomCode, roomName, hostUid, hostName, mapUrl);

        // Assert
        assert.equal(roomData.id, '849201', 'Código da sala deve ser preservado como string');
        assert.equal(roomData.name, roomName, 'Nome da campanha deve ser atribuído corretamente');
        assert.equal(roomData.hostUid, hostUid, 'Host UID deve corresponder ao mestre');
        assert.equal(roomData.hostName, hostName, 'Nome do mestre deve ser gravado');
        assert.equal(roomData.mapUrl, mapUrl, 'URL do mapa deve ser gravada');
        assert.equal(roomData.gridSize, 50, 'GridSize padrão deve ser 50px');
        assert.deepEqual(roomData.tokens, {}, 'Tokens iniciais devem ser um objeto vazio');
        assert.equal(roomData.currentRound, 1, 'Combate deve iniciar na rodada 1');
        assert.ok(roomData.createdAt, 'Timestamp de criação deve existir');
    });

    QUnit.test('2. Tratamento de valores nulos e fallbacks na criação de sala (Casos de Borda)', function (assert) {
        // Arrange & Act
        const roomData = VTTFirestore.buildInitialRoomData(null, null, null, null, null);

        // Assert
        assert.ok(roomData.id, 'ID deve ser convertido para string mesmo se nulo');
        assert.equal(roomData.name, 'Campanha Kuar-Tor', 'Deve aplicar nome padrão');
        assert.equal(roomData.hostUid, 'anon_host', 'Deve aplicar UID anônimo');
        assert.equal(roomData.hostName, 'Mestre', 'Deve aplicar nome padrão do mestre');
        assert.ok(roomData.mapUrl.includes('unsplash'), 'Deve conter mapa padrão');
    });

    QUnit.test('3. Sistema de Assinatura de Eventos (Pub/Sub on/off/emit)', function (assert) {
        // Arrange
        let eventTriggered = false;
        let receivedData = null;

        const unsubscribe = VTTFirestore.on('onRoomUpdate', (data) => {
            eventTriggered = true;
            receivedData = data;
        });

        // Act 1: Disparar evento
        VTTFirestore._emit('onRoomUpdate', { id: '123', status: 'ready' });

        // Assert 1
        assert.true(eventTriggered, 'O callback do listener deve ser invocado');
        assert.equal(receivedData.id, '123', 'Os dados do evento devem ser passados integralmente');

        // Act 2: Cancelar inscrição
        unsubscribe();
        eventTriggered = false;
        VTTFirestore._emit('onRoomUpdate', { id: '999' });

        // Assert 2
        assert.false(eventTriggered, 'Após unsubscribe, o callback não deve mais ser invocado');
    });

    QUnit.test('4. Payload de Mensagem e Rolagem de Dados (+2d6)', function (assert) {
        // Arrange
        VTTFirestore.currentUser = { uid: 'user_player_1', displayName: 'Guerreiro Kaelen' };
        VTTFirestore.currentRoomId = '777888';

        // Mock DB com verificação AAA
        let savedPayload = null;
        VTTFirestore.db = {
            collection: (col) => ({
                doc: (id) => ({
                    collection: (subCol) => ({
                        add: (payload) => {
                            savedPayload = payload;
                            return Promise.resolve({ id: 'msg_1' });
                        }
                    })
                })
            })
        };

        const rollInfo = { dice: [4, 5], total: 9, mod: 2, finalTotal: 11, margin: 2, isCrit: false };

        // Act
        return VTTFirestore.sendMessage('Rolou Ataque com Espada: 11', 'Guerreiro Kaelen', false, rollInfo)
            .then(msg => {
                // Assert
                assert.ok(msg, 'Mensagem deve ser retornada');
                assert.equal(msg.author, 'Guerreiro Kaelen', 'Autor deve ser atribuído');
                assert.true(msg.isRoll, 'isRoll deve ser verdadeiro quando rollData é fornecido');
                assert.deepEqual(msg.rollData, rollInfo, 'Dados de rolagem devem ser preservados');
                assert.equal(savedPayload.senderUid, 'user_player_1', 'UID do remetente deve ser gravado');
            });
    });

    QUnit.test('5. Sanitização de Token e Valores Limítrofes (Snap & Stats)', function (assert) {
        // Arrange
        VTTFirestore.currentRoomId = 'room_abc';
        let updatedPayload = null;

        VTTFirestore.db = {
            collection: () => ({
                doc: () => ({
                    update: (payload) => {
                        updatedPayload = payload;
                        return Promise.resolve();
                    }
                })
            })
        };

        const rawToken = {
            id: 'tok_test',
            name: 'Mago Arcana',
            x: '150.8', // string numérico
            y: null, // nulo
            hp: '20', // string numérico
            maxHp: 20,
            conditions: ['🔥', '💫']
        };

        // Act
        return VTTFirestore.setToken(rawToken).then(sanitized => {
            // Assert
            assert.equal(typeof sanitized.x, 'number', 'X deve ser convertido para número');
            assert.equal(sanitized.x, 150.8, 'Valor de X deve ser preservado');
            assert.equal(sanitized.y, 0, 'Y nulo deve ter fallback para 0');
            assert.equal(sanitized.hp, 20, 'HP deve ser convertido para número');
            assert.deepEqual(sanitized.conditions, ['🔥', '💫'], 'Condições devem ser preservadas');
            assert.ok(updatedPayload['tokens.tok_test'], 'Payload deve atualizar a chave específica do token');
        });
    });

    QUnit.test('6. Gatilho de Masmorra Automático (Puzzle Trigger)', function (assert) {
        // Arrange
        VTTFirestore.currentRoomId = 'room_puzzle_1';
        let savedRoomUpdate = null;

        VTTFirestore.db = {
            collection: () => ({
                doc: () => ({
                    update: (payload) => {
                        savedRoomUpdate = payload;
                        return Promise.resolve();
                    },
                    collection: () => ({
                        add: () => Promise.resolve()
                    })
                })
            })
        };

        // Act
        return VTTFirestore.triggerPuzzleSolved('macanetas', 'A Porta das Cores').then(puzzleRecord => {
            // Assert
            assert.equal(puzzleRecord.id, 'macanetas', 'ID do puzzle deve estar correto');
            assert.equal(puzzleRecord.name, 'A Porta das Cores', 'Nome do puzzle deve estar correto');
            assert.true(puzzleRecord.solved, 'Status solved deve ser true');
            assert.ok(savedRoomUpdate['puzzlesSolved.macanetas'], 'Registro do puzzle deve ser atualizado no documento da sala');
        });
    });

});
