/**
 * Testes Unitários para a Arquitetura de Salas Múltiplas e Autenticação Firebase (index.html)
 * Valida Google Login, E-mail/Senha, Modo Convidado, Gerenciador de Salas, Grid Tático, Névoa de Guerra e Controle de Acesso.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const INDEX_HTML_PATH = path.resolve(__dirname, '../index.html');

QUnit.module('Firebase Multi-Room Architecture & Access Control (index.html)', function () {

    QUnit.test('1. Autenticação Firebase: Google Login, E-mail/Senha e Modal de Convidado', function (assert) {
        assert.ok(fs.existsSync(INDEX_HTML_PATH), 'index.html deve existir');
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        // Métodos de Auth
        assert.ok(content.includes('signInWithPopup'), 'Deve conter signInWithPopup para Google');
        assert.ok(content.includes('GoogleAuthProvider'), 'Deve instanciar GoogleAuthProvider');
        assert.ok(content.includes('signInWithEmailAndPassword'), 'Deve conter signInWithEmailAndPassword');
        assert.ok(content.includes('createUserWithEmailAndPassword'), 'Deve conter createUserWithEmailAndPassword');
        assert.ok(content.includes('signInAnonymously'), 'Deve conter signInAnonymously para modo convidado');

        // Elementos de UI
        assert.ok(content.includes('id="auth-modal"'), 'Modal de autenticação #auth-modal presente');
        assert.ok(content.includes('id="user-avatar"'), 'Elemento de avatar do usuário #user-avatar presente');
        assert.ok(content.includes('id="user-name"'), 'Elemento de nome do usuário #user-name presente');
        assert.ok(content.includes('id="user-info"'), 'Container de informações #user-info presente');
    });

    QUnit.test('2. Gerenciador de Salas de Campanha (rooms/{roomId})', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        // Aba e botões de sala
        assert.ok(content.includes('id="tab-rooms"'), 'Deve conter a aba de salas #tab-rooms');
        assert.ok(content.includes('createCampaignRoom'), 'Deve conter função createCampaignRoom');
        assert.ok(content.includes('joinCampaignRoom'), 'Deve conter função joinCampaignRoom');
        assert.ok(content.includes('generateRoomCode'), 'Deve conter gerador de código de 6 dígitos');
        assert.ok(content.includes('doc(db, "rooms", roomId)'), 'Deve salvar salas na coleção rooms/{roomId}');
        assert.ok(content.includes('id="join-room-code"'), 'Campo de entrada de código #join-room-code presente');
    });

    QUnit.test('3. Sincronização do Grid Tático, Combatentes e Névoa de Guerra', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        // Grid e Tokens
        assert.ok(content.includes('id="tactical-grid-canvas"'), 'Canvas do Grid tático presente');
        assert.ok(content.includes('id="tokens-layer"'), 'Camada de tokens presente');
        assert.ok(content.includes('makeTokenDraggable'), 'Função de drag & drop com snap to grid presente');

        // Névoa de Guerra
        assert.ok(content.includes('id="fog-layer"'), 'Camada de Névoa de Guerra #fog-layer presente');
        assert.ok(content.includes('fogOfWar'), 'Estrutura de fogOfWar no Firestore');
        assert.ok(content.includes('toggleFogTool'), 'Controle de revelar/ocultar névoa pelo Mestre');

        // Combate & Iniciativa
        assert.ok(content.includes('id="tab-combat"'), 'Aba de combate presente');
        assert.ok(content.includes('advanceCombatTurn'), 'Função para avançar turnos e rodadas');
        assert.ok(content.includes('collection(db, "rooms", currentRoomId, "messages")'), 'Chat sincronizado na subcoleção da sala');
    });

    QUnit.test('4. Regras de Controle de Acesso (Mestre vs Jogador)', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        // Validação da regra do Mestre
        assert.ok(content.includes('isMaster = (currentRoomData.hostUid === currentUserId)'), 'Define isMaster com base no hostUid da sala');
        assert.ok(content.includes('canMove = isMaster || (token.ownerUid === currentUserId)'), 'Apenas Mestre ou dono do token podem mover tokens');
        assert.ok(content.includes('if (!isMaster)'), 'Bloqueia edição de monstros ou névoa para não-mestres');
    });
});
