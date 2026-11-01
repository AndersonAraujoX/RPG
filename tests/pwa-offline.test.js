/**
 * @file tests/pwa-offline.test.js
 * @description Suíte de Testes Unitários: Suporte PWA e Resiliência Offline (Pilar 6)
 * Padrão: Arrange-Act-Assert (AAA)
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const MANIFEST_PATH = path.resolve(__dirname, '../public/manifest.json');
const SW_PATH = path.resolve(__dirname, '../public/sw.js');
const INDEX_PATH = path.resolve(__dirname, '../index.html');
const FORMV6_PATH = path.resolve(__dirname, '../public/formV6.html');

QUnit.module('PWA & Resiliência Offline (+2d6 Kuar-Tor)', function () {

    // -------------------------------------------------------------
    // 1. Caminho Feliz: Integridade do Web App Manifest
    // -------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: public/manifest.json deve ser um JSON válido e conter campos PWA essenciais (AAA)', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(MANIFEST_PATH), 'public/manifest.json deve existir');
        const rawContent = fs.readFileSync(MANIFEST_PATH, 'utf-8');

        // Act
        let manifest = null;
        try {
            manifest = JSON.parse(rawContent);
        } catch (e) {
            assert.ok(false, `Falha no parsing JSON: ${e.message}`);
        }

        // Assert
        assert.ok(manifest !== null, 'Manifest parseado com sucesso');
        assert.ok(manifest.name && manifest.name.includes('Kuar-Tor'), 'Nome do app definido');
        assert.equal(manifest.display, 'standalone', 'Display configurado como standalone para visual de app nativo');
        assert.ok(manifest.theme_color, 'Cor de tema configurada');
        assert.ok(manifest.background_color, 'Cor de fundo configurada');
        assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'Contém lista de ícones para instalação');
    });

    // -------------------------------------------------------------
    // 2. Caminho Feliz: Integridade e Sintaxe do Service Worker
    // -------------------------------------------------------------
    QUnit.test('2. Caminho Feliz: public/sw.js deve compilar sem SyntaxError e implementar ciclo de vida PWA (AAA)', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(SW_PATH), 'public/sw.js deve existir');
        const swContent = fs.readFileSync(SW_PATH, 'utf-8');

        // Act & Assert
        // Verificação sintática via node --check
        let syntaxValid = false;
        try {
            cp.execSync(`node --check "${SW_PATH}"`, { stdio: 'pipe' });
            syntaxValid = true;
        } catch (e) {
            syntaxValid = false;
        }
        assert.ok(syntaxValid, 'public/sw.js compila perfeitamente sem erros de sintaxe');

        // Handlers essenciais do Service Worker
        assert.ok(swContent.includes("addEventListener('install'"), 'Implementa evento install');
        assert.ok(swContent.includes("addEventListener('activate'"), 'Implementa evento activate');
        assert.ok(swContent.includes("addEventListener('fetch'"), 'Implementa evento fetch com Cache-First');
        assert.ok(swContent.includes('CACHE_NAME'), 'Define constante de versionamento de cache');
    });

    // -------------------------------------------------------------
    // 3. Casos de Borda: Lista de Assets Pré-armazenados no Cache
    // -------------------------------------------------------------
    QUnit.test('3. Casos de Borda: Assets Core essenciais incluídos na lista de cache offline (AAA)', function (assert) {
        // Arrange
        const swContent = fs.readFileSync(SW_PATH, 'utf-8');

        // Act & Assert
        assert.ok(swContent.includes('tailwind.css'), 'Inclui tailwind.css no cache');
        assert.ok(swContent.includes('character-sheet.js'), 'Inclui character-sheet.js no cache');
        assert.ok(swContent.includes('dice-roller.js'), 'Inclui dice-roller.js no cache');
        assert.ok(swContent.includes('live-sheet-controller.js'), 'Inclui live-sheet-controller.js no cache');
        assert.ok(swContent.includes('vtt-bestiary-engine.js'), 'Inclui vtt-bestiary-engine.js no cache');
        assert.ok(swContent.includes('audio-sfx-engine.js'), 'Inclui audio-sfx-engine.js no cache');
        assert.ok(swContent.includes('vtt-fog-aoe-engine.js'), 'Inclui vtt-fog-aoe-engine.js no cache');
        assert.ok(swContent.includes('item-catalog-engine.js'), 'Inclui item-catalog-engine.js no cache');
    });

    // -------------------------------------------------------------
    // 4. Integração: Tag Manifest e Registro em index.html e formV6.html
    // -------------------------------------------------------------
    QUnit.test('4. Integração: index.html e formV6.html contêm link para manifest.json (AAA)', function (assert) {
        // Arrange
        const indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');
        const formHtml = fs.readFileSync(FORMV6_PATH, 'utf-8');

        // Act & Assert
        assert.ok(indexHtml.includes('manifest.json'), 'index.html referencia manifest.json');
        assert.ok(formHtml.includes('manifest.json'), 'formV6.html referencia manifest.json');
    });
});
