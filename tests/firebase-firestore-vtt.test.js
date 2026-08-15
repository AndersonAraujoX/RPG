/**
 * Testes unitários para a integração do Firebase Firestore e Authentication no index.html do VTT
 * Valida importações modulares v10.8.0, login anônimo automático, sincronização de ficha e persistência offline.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const INDEX_HTML_PATH = path.resolve(__dirname, '../index.html');

QUnit.module('Firebase Firestore & Auth VTT (index.html)', function () {

    QUnit.test('1. index.html deve conter os CDNs oficiais do Firebase Modular v10.8.0', function (assert) {
        assert.ok(fs.existsSync(INDEX_HTML_PATH), 'index.html deve existir');
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'), 'Importa firebase-app.js v10.8.0');
        assert.ok(content.includes('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js'), 'Importa firebase-auth.js v10.8.0');
        assert.ok(content.includes('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js'), 'Importa firebase-firestore.js v10.8.0');
    });

    QUnit.test('2. Autenticação Anônima Automática: signInAnonymously e onAuthStateChanged', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('signInAnonymously(auth)'), 'Deve executar signInAnonymously silenciosamente');
        assert.ok(content.includes('onAuthStateChanged(auth'), 'Deve registrar onAuthStateChanged');
        assert.ok(content.includes('currentUserId = user.uid'), 'Deve associar o user.uid à sessão');
    });

    QUnit.test('3. Sincronização de Ficha no Firestore: coleção characters/{userId}', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('doc(db, "characters", userId)'), 'Deve referenciar o documento characters/{userId}');
        assert.ok(content.includes('onSnapshot(docRef'), 'Deve escutar alterações da ficha com onSnapshot');
        assert.ok(content.includes('setDoc(doc(db, "characters", currentUserId)'), 'Deve salvar dados da ficha com setDoc');
        assert.ok(content.includes('merge: true'), 'Deve utilizar { merge: true } ao salvar no Firestore');
    });

    QUnit.test('4. Chat & Rolagens em Tempo Real: coleção messages', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('collection(db, "messages")'), 'Deve utilizar a coleção messages');
        assert.ok(content.includes('addDoc(collection(db, "messages")'), 'Deve salvar novas mensagens/rolagens com addDoc');
        assert.ok(content.includes('orderBy("timestamp", "asc")'), 'Deve ordenar as mensagens por timestamp');
        assert.ok(content.includes('limit(50)'), 'Deve limitar a consulta para desempenho');
    });

    QUnit.test('5. Persistência Offline: enableIndexedDbPersistence', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('enableIndexedDbPersistence(db)'), 'Deve ativar enableIndexedDbPersistence');
        assert.ok(content.includes('failed-precondition'), 'Deve tratar código de erro failed-precondition');
        assert.ok(content.includes('unimplemented'), 'Deve tratar código de erro unimplemented');
    });

    QUnit.test('6. Estrutura VTT Single-File e Integração com Regras +2d6', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('id="tab-roller"'), 'Deve conter aba do Rolador 2d6');
        assert.ok(content.includes('id="tab-sheet"'), 'Deve conter aba da Ficha');
        assert.ok(content.includes('id="tab-combat"'), 'Deve conter aba de Combate');
        assert.ok(content.includes('id="tab-bestiary"'), 'Deve conter aba do Bestiário');
        assert.ok(content.includes('id="tab-compendium"'), 'Deve conter aba do Compêndio');
        assert.ok(content.includes('src="src/core/character-sheet.js"'), 'Deve carregar character-sheet.js para regras +2d6');
    });
});
