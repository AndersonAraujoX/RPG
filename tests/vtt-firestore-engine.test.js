/**
 * @file tests/vtt-firestore-engine.test.js
 * @description Suíte de testes unitários para VTTFirestoreEngine (Kuar-Tor VTT).
 * Valida sanitização de tamanho de mapa para evitar estouro do limite de 1MB do Firestore,
 * inicialização de salas, movimentação atômica de tokens e disparos de puzzles.
 * Estrutura: Arrange-Act-Assert (AAA).
 */

const QUnit = require('qunit');
const VTTFirestore = require('../src/core/vtt-firestore.js');

QUnit.module('VTTFirestoreEngine — Sincronização em Nuvem & Proteção de Quota (AAA)', function (hooks) {

    hooks.beforeEach(function () {
        // Reset de estado antes de cada teste
        VTTFirestore.leaveRoom();
        VTTFirestore.db = null;
        VTTFirestore.currentUser = null;
    });

    QUnit.test('1. Caminho Feliz: sanitizeMapUrlForFirestore preserva URLs HTTP válidas e de tamanho moderado (AAA)', function (assert) {
        // Arrange
        const normalUrl = 'https://assets.kuartor.com/maps/dungeon_nivel_1.jpg';
        const moderateDataUrl = 'data:image/jpeg;base64,' + 'A'.repeat(5000);

        // Act
        const resultNormal = VTTFirestore.sanitizeMapUrlForFirestore(normalUrl);
        const resultModerate = VTTFirestore.sanitizeMapUrlForFirestore(moderateDataUrl);

        // Assert
        assert.equal(resultNormal, normalUrl, 'URL HTTP normal deve ser preservada');
        assert.equal(resultModerate, moderateDataUrl, 'Data URL moderada (<750KB) deve ser preservada');
    });

    QUnit.test('2. Casos de Borda: sanitizeMapUrlForFirestore trata entradas nulas, vazias ou não-strings (AAA)', function (assert) {
        // Arrange
        const fallbackExpected = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2000&q=80';

        // Act & Assert
        assert.equal(VTTFirestore.sanitizeMapUrlForFirestore(null), fallbackExpected, 'null deve retornar URL fallback');
        assert.equal(VTTFirestore.sanitizeMapUrlForFirestore(undefined), fallbackExpected, 'undefined deve retornar URL fallback');
        assert.equal(VTTFirestore.sanitizeMapUrlForFirestore('   '), fallbackExpected, 'String com apenas espaços deve retornar URL fallback');
        assert.equal(VTTFirestore.sanitizeMapUrlForFirestore(12345), fallbackExpected, 'Não-string deve retornar URL fallback');
    });

    QUnit.test('3. Limites & Resiliência: sanitizeMapUrlForFirestore descarta imagem base64 gigante (>750KB) prevenindo crash de 1MB no Firestore (AAA)', function (assert) {
        // Arrange
        const giantDataUrl = 'data:image/png;base64,' + 'B'.repeat(850000); // 850KB, excederia 1MB do Firestore
        const fallbackExpected = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2000&q=80';
        let warnEmitted = false;
        const originalWarn = console.warn;
        console.warn = (msg) => {
            if (msg.includes('excede o limite do Firestore')) warnEmitted = true;
        };

        // Act
        const safeUrl = VTTFirestore.sanitizeMapUrlForFirestore(giantDataUrl);
        console.warn = originalWarn;

        // Assert
        assert.equal(safeUrl, fallbackExpected, 'Imagem gigante deve ser substituída pela URL segura padrão');
        assert.ok(warnEmitted, 'Deve registrar aviso informativo prevenindo erro fatal do Firebase');
    });

    QUnit.test('4. Caminho Feliz: buildInitialRoomData constrói documento de sala sanitizado e estruturado (AAA)', function (assert) {
        // Arrange
        const roomCode = '884123';
        const roomName = 'Torre Arcana';
        const hostUid = 'usr_gm_99';
        const hostName = 'Mestre Valerius';
        const mapUrl = 'https://imagens.kuartor.com/torre.png';

        // Act
        const roomData = VTTFirestore.buildInitialRoomData(roomCode, roomName, hostUid, hostName, mapUrl);

        // Assert
        assert.equal(roomData.id, '884123', 'ID da sala correto');
        assert.equal(roomData.name, 'Torre Arcana', 'Nome da campanha correto');
        assert.equal(roomData.hostUid, 'usr_gm_99', 'UID do host correto');
        assert.equal(roomData.hostName, 'Mestre Valerius', 'Nome do host correto');
        assert.equal(roomData.mapUrl, mapUrl, 'Map URL sanitizada');
        assert.equal(roomData.gridSize, 50, 'GridSize padrão é 50');
        assert.deepEqual(roomData.tokens, {}, 'Tokens iniciam como objeto vazio');
        assert.deepEqual(roomData.combatants, [], 'Lista de combate inicia vazia');
        assert.ok(roomData.createdAt, 'Data de criação gerada');
    });

    QUnit.test('5. Casos de Borda: buildInitialRoomData com mapa gigante protege criação de sala (AAA)', function (assert) {
        // Arrange
        const giantMap = 'data:image/jpeg;base64,' + 'X'.repeat(900000);

        // Act
        const roomData = VTTFirestore.buildInitialRoomData('123456', null, null, null, giantMap);

        // Assert
        assert.ok(roomData.mapUrl.includes('unsplash.com'), 'mapUrl em buildInitialRoomData deve ser sanitizada com fallback');
        assert.ok(roomData.mapUrl.length < 500, 'Tamanho da URL dentro de limites seguros para Firestore');
    });

    QUnit.test('6. Caminho Feliz: updateMap aplica sanitização e atualiza o documento Firestore (AAA)', async function (assert) {
        // Arrange
        let updatedPayload = null;
        VTTFirestore.currentRoomId = 'sala_test_1';
        VTTFirestore.db = {
            collection: () => ({
                doc: () => ({
                    update: async (data) => { updatedPayload = data; }
                })
            })
        };
        const validMap = 'https://assets.kuartor.com/maps/arena.jpg';

        // Act
        const returnedUrl = await VTTFirestore.updateMap(validMap);

        // Assert
        assert.equal(returnedUrl, validMap, 'URL retornada deve ser a válida');
        assert.ok(updatedPayload, 'Documento da sala deve ser atualizado no Firestore');
        assert.equal(updatedPayload.mapUrl, validMap, 'mapUrl gravada no Firestore');
        assert.ok(updatedPayload.updatedAt, 'Timestamp de atualização gravado');
    });

    QUnit.test('7. Casos de Borda: updateMap com imagem gigante salva URL segura no Firestore (AAA)', async function (assert) {
        // Arrange
        let updatedPayload = null;
        VTTFirestore.currentRoomId = 'sala_test_2';
        VTTFirestore.db = {
            collection: () => ({
                doc: () => ({
                    update: async (data) => { updatedPayload = data; }
                })
            })
        };
        const giantMap = 'data:image/png;base64,' + 'Z'.repeat(1200000);

        // Act
        const returnedUrl = await VTTFirestore.updateMap(giantMap);

        // Assert
        assert.ok(returnedUrl.includes('unsplash.com'), 'URL retornada deve ser o fallback');
        assert.ok(updatedPayload.mapUrl.includes('unsplash.com'), 'mapUrl enviada ao Firestore é segura (<1MB)');
    });

    QUnit.test('8. Caminho Feliz & Casos de Borda: setToken sanitiza atributos de vida, mana e limites numéricos (AAA)', async function (assert) {
        // Arrange
        let tokenUpdateDoc = null;
        VTTFirestore.currentRoomId = 'sala_tokens_1';
        VTTFirestore.currentUser = { uid: 'jogador_1' };
        VTTFirestore.db = {
            collection: () => ({
                doc: () => ({
                    update: async (data) => { tokenUpdateDoc = data; }
                })
            })
        };

        const rawToken = {
            id: 'tok_hero_1',
            name: 'Operativo Kael',
            x: '150',
            y: '200',
            hp: '24',
            pe: '12',
            conditions: ['🔥']
        };

        // Act
        const sanitized = await VTTFirestore.setToken(rawToken);

        // Assert
        assert.equal(sanitized.id, 'tok_hero_1', 'ID preservado');
        assert.equal(sanitized.x, 150, 'Coordenada X convertida para número');
        assert.equal(sanitized.y, 200, 'Coordenada Y convertida para número');
        assert.equal(sanitized.hp, 24, 'HP convertido para número');
        assert.equal(sanitized.pe, 12, 'PE convertido para número');
        assert.deepEqual(sanitized.conditions, ['🔥'], 'Condições preservadas');
        assert.ok(tokenUpdateDoc['tokens.tok_hero_1'], 'Campo atômico do Firestore atualizado');
    });

    QUnit.test('9. Caminho Feliz: triggerPuzzleSolved registra avanço de masmorra e notifica chat (AAA)', async function (assert) {
        // Arrange
        let puzzlePayload = null;
        let messagePayload = null;
        VTTFirestore.currentRoomId = 'sala_dungeon_1';
        VTTFirestore.currentUser = { uid: 'usr_cleric', displayName: 'Althea' };
        VTTFirestore.db = {
            collection: () => ({
                doc: () => ({
                    update: async (data) => { puzzlePayload = data; },
                    collection: () => ({
                        add: async (msg) => { messagePayload = msg; }
                    })
                })
            })
        };

        // Act
        const result = await VTTFirestore.triggerPuzzleSolved('puz_selo_abissal', 'Selo do Abismo');

        // Assert
        assert.equal(result.id, 'puz_selo_abissal', 'ID do enigma correto');
        assert.equal(result.name, 'Selo do Abismo', 'Nome do enigma correto');
        assert.equal(result.solvedBy, 'Althea', 'Nome de quem resolveu associado');
        assert.ok(puzzlePayload['puzzlesSolved.puz_selo_abissal'], 'Payload de enigma gravado no documento');
        assert.ok(messagePayload.text.includes('Selo do Abismo'), 'Notificação enviada ao chat da sala');
    });
});
