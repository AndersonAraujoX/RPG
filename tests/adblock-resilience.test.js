/**
 * Testes Unitários para Resiliência a AdBlockers (ERR_BLOCKED_BY_CLIENT) e Modo Local Instantâneo
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const INDEX_HTML_PATH = path.resolve(__dirname, '../index.html');

QUnit.module('Resiliência a AdBlockers e Inicialização Offline', function () {

    QUnit.test('1. index.html não deve conter measurementId para evitar bloqueadores', function (assert) {
        assert.ok(fs.existsSync(INDEX_HTML_PATH), 'index.html existe');
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.notOk(content.includes('measurementId'), 'measurementId foi removido do index.html');
    });

    QUnit.test('2. index.html deve inicializar loadLocalSheet imediatamente', function (assert) {
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        assert.ok(content.includes('loadLocalSheet();'), 'loadLocalSheet chamado no carregamento');
        assert.ok(content.includes('ERR_BLOCKED_BY_CLIENT'), 'Tratamento explicito para ERR_BLOCKED_BY_CLIENT presente');
    });
});
