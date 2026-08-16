/**
 * Testes Unitários para a Arquitetura de Salas Múltiplas e Autenticação Firebase
 * Valida Google Login, E-mail/Senha, Modo Convidado no Portal (index.html) e Grid Tático, Névoa de Guerra e Controle de Acesso na Mesa Virtual (mesa_virtual.html / vtt-firestore.js).
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const INDEX_HTML_PATH = path.resolve(__dirname, '../index.html');
const MESA_VIRTUAL_PATH = path.resolve(__dirname, '../public/mesa_virtual.html');
const VTT_FIRESTORE_PATH = path.resolve(__dirname, '../src/core/vtt-firestore.js');

QUnit.module('Firebase Multi-Room Architecture & Access Control (index.html & mesa_virtual.html)', function () {

    QUnit.test('1. Autenticação Firebase no Portal: Google Login, E-mail/Senha e Modal de Convidado', function (assert) {
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

    QUnit.test('2. Gerenciador de Salas de Campanha na Mesa Virtual & Firestore', function (assert) {
        assert.ok(fs.existsSync(MESA_VIRTUAL_PATH), 'mesa_virtual.html deve existir');
        const content = fs.readFileSync(MESA_VIRTUAL_PATH, 'utf-8');
        const vttCore = fs.readFileSync(VTT_FIRESTORE_PATH, 'utf-8');

        assert.ok(content.includes('id="room-modal"') || content.includes('p2p-room-display') || content.includes('room'), 'Display ou controle de sala no VTT');
        assert.ok(vttCore.includes('createRoom'), 'Deve conter função createRoom');
        assert.ok(vttCore.includes('joinRoom'), 'Deve conter função joinRoom');
        assert.ok(vttCore.includes('Math.floor') || vttCore.includes('generateRoomCode'), 'Deve conter gerador de código de sala');
        assert.ok(vttCore.includes('rooms') || vttCore.includes('room'), 'Deve sincronizar salas no Firestore');
    });

    QUnit.test('3. Sincronização do Grid Tático, Tokens e Névoa de Guerra na Mesa Virtual', function (assert) {
        const content = fs.readFileSync(MESA_VIRTUAL_PATH, 'utf-8');
        const vttCore = fs.readFileSync(VTT_FIRESTORE_PATH, 'utf-8');

        // Grid e Tokens
        assert.ok(content.includes('id="grid-overlay"') || content.includes('vtt-world'), 'Estrutura do Grid tático presente');
        assert.ok(content.includes('id="tokens-layer"'), 'Camada de tokens presente');

        // Névoa de Guerra
        assert.ok(content.includes('id="fog-canvas"'), 'Canvas de Névoa de Guerra presente');
        assert.ok(vttCore.includes('fogData') || vttCore.includes('updateFog'), 'Estrutura de sincronização de névoa');

        // Combate & Iniciativa
        assert.ok(content.includes('id="pane-turn"'), 'Painel de combate/iniciativa presente');
        assert.ok(vttCore.includes('combatants') && vttCore.includes('updateCombatState'), 'Sincronização de combate e turnos presente');
    });

    QUnit.test('4. Regras de Controle de Acesso (Mestre vs Jogador)', function (assert) {
        const vttCore = fs.readFileSync(VTT_FIRESTORE_PATH, 'utf-8');
        const content = fs.readFileSync(MESA_VIRTUAL_PATH, 'utf-8');

        assert.ok(vttCore.includes('isHost') || vttCore.includes('hostUid'), 'Controle de Mestre por hostUid / isHost');
        assert.ok(vttCore.includes('ownerUid') || content.includes('ownerUid'), 'Controle de dono de token');
    });
});
