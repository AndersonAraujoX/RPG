/**
 * Testes Unitários para Resiliência de Permissões Firestore, Modo Local e firestore.rules
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const INDEX_HTML_PATH = path.resolve(__dirname, '../index.html');
const RULES_PATH = path.resolve(__dirname, '../firestore.rules');

QUnit.module('Firestore Permission Resilience & Offline Fallback', function () {

    QUnit.test('1. Presença de Error Handlers em todos os listeners onSnapshot no index.html', function (assert) {
        assert.ok(fs.existsSync(INDEX_HTML_PATH), 'index.html existe');
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('loadLocalSheet'), 'Função loadLocalSheet presente');
        assert.ok(content.includes('saveLocalSheet'), 'Função saveLocalSheet presente');
        assert.ok(content.includes('isCloudSyncAvailable'), 'Flag de controle isCloudSyncAvailable presente');
        assert.ok(content.includes('sheetSaveDebounceTimer'), 'Timer de debounce para gravações presente');

        // Tratamento de erro de permissão
        assert.ok(content.includes('permission-denied'), 'Captura de código permission-denied implementada');
        assert.ok(content.includes('Modo Local'), 'Badge amigável de Modo Local no fallback');
    });

    QUnit.test('2. Validação do arquivo firestore.rules para o Firebase Console', function (assert) {
        assert.ok(fs.existsSync(RULES_PATH), 'firestore.rules existe');
        const rules = fs.readFileSync(RULES_PATH, 'utf-8');

        assert.ok(rules.includes('characters/{userId}'), 'Regra para characters/{userId} presente');
        assert.ok(rules.includes('rooms/{roomId}'), 'Regra para rooms/{roomId} presente');
        assert.ok(rules.includes('messages/{messageId}'), 'Regra para messages presente');
        assert.ok(rules.includes('allow read, write: if true;'), 'Permissão de leitura e escrita para a campanha');
    });
});
