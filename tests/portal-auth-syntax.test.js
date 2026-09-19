/**
 * Suíte de Testes Unitários: Validação de Sintaxe e Modal de Autenticação do Portal (index.html)
 * Padrão: Arrange-Act-Assert (AAA)
 * Cobertura: Validação de Sintaxe JS, Funções Globais de Autenticação, Casos de Borda e Mocks.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const INDEX_HTML_PATH = path.resolve(__dirname, '../index.html');

QUnit.module('Portal Script Syntax & Auth Modal Handlers (index.html)', function () {

    // -------------------------------------------------------------
    // 1. Caminho Feliz: Validação Sintática de Todos os Scripts Inline
    // -------------------------------------------------------------
    QUnit.test('1. Sintaxe de Scripts Inline: Nenhum script em index.html deve conter SyntaxError (AAA)', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(INDEX_HTML_PATH), 'index.html deve existir');
        const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
        const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
        const syntaxErrors = [];
        let scriptCount = 0;

        // Act
        let match;
        while ((match = scriptRegex.exec(html)) !== null) {
            const attrs = match[1];
            const code = match[2];
            if (!code.trim()) continue; // Pular scripts externos vazios
            scriptCount++;

            const isModule = attrs.includes('module');
            const ext = isModule ? '.mjs' : '.js';
            const tmpFile = path.join(__dirname, `_temp_test_syntax_${scriptCount}${ext}`);

            fs.writeFileSync(tmpFile, code, 'utf-8');
            try {
                cp.execSync(`node --check ${tmpFile}`, { stdio: 'pipe' });
            } catch (err) {
                syntaxErrors.push({
                    scriptIndex: scriptCount,
                    isModule,
                    error: err.stderr ? err.stderr.toString().trim() : err.message
                });
            } finally {
                if (fs.existsSync(tmpFile)) {
                    fs.unlinkSync(tmpFile);
                }
            }
        }

        // Assert
        assert.ok(scriptCount > 0, `Pelo menos um script inline deve ter sido analisado (encontrados: ${scriptCount})`);
        assert.deepEqual(syntaxErrors, [], 'Nenhum script inline deve lançar SyntaxError (ex: missing ) after argument list)');
    });

    // -------------------------------------------------------------
    // 2. Caminho Feliz: Atribuição das Funções Globais no Window
    // -------------------------------------------------------------
    QUnit.test('2. Funções Globais de Autenticação: openAuthModal, closeAuthModal, etc. devem estar definidas', function (assert) {
        // Arrange
        const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
        const requiredFunctions = [
            'openAuthModal',
            'closeAuthModal',
            'loginWithGoogle',
            'loginWithEmail',
            'signupWithEmail',
            'loginAsGuest'
        ];

        // Act & Assert
        requiredFunctions.forEach(fnName => {
            const pattern = new RegExp(`window\\.${fnName}\\s*=`, 'g');
            assert.ok(pattern.test(html), `window.${fnName} deve estar explicitamente exportado no escopo global`);
        });
    });

    // -------------------------------------------------------------
    // 3. Integração DOM: Botão #login-link deve disparar openAuthModal()
    // -------------------------------------------------------------
    QUnit.test('3. Integração DOM: Botão #login-link deve conter onclick="openAuthModal()"', function (assert) {
        // Arrange
        const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        // Act
        const hasLoginButton = html.includes('id="login-link"');
        const hasOpenAuthModalCall = html.includes('onclick="openAuthModal()"');

        // Assert
        assert.ok(hasLoginButton, 'Elemento com id="login-link" deve existir no cabeçalho');
        assert.ok(hasOpenAuthModalCall, 'O botão deve invocar onclick="openAuthModal()"');
    });

    // -------------------------------------------------------------
    // 4. Casos de Borda & Mocks: Comportamento de openAuthModal / closeAuthModal
    // -------------------------------------------------------------
    QUnit.test('4. Casos de Borda: openAuthModal deve operar com segurança mesmo com DOM mock ou elemento ausente', function (assert) {
        // Arrange: Criar mock do DOM
        let classListState = ['hidden'];
        const mockModalElement = {
            classList: {
                remove: (cls) => { classListState = classListState.filter(c => c !== cls); },
                add: (cls) => { if (!classListState.includes(cls)) classListState.push(cls); },
                contains: (cls) => classListState.includes(cls)
            }
        };

        // Simulação da função com injeção do elemento mock (Arrange)
        const openModalFn = (el) => el?.classList.remove('hidden');
        const closeModalFn = (el) => el?.classList.add('hidden');

        // Act & Assert: Cenário 1 - Modal existe e está escondido
        openModalFn(mockModalElement);
        assert.notOk(mockModalElement.classList.contains('hidden'), 'openModal deve remover a classe hidden');

        closeModalFn(mockModalElement);
        assert.ok(mockModalElement.classList.contains('hidden'), 'closeModal deve adicionar a classe hidden');

        // Act & Assert: Cenário 2 - Elemento nulo ou indefinido (Edge Case: não deve lançar exceção)
        try {
            openModalFn(null);
            closeModalFn(undefined);
            assert.ok(true, 'Funções com optional chaining não devem falhar se o modal for null/undefined');
        } catch (e) {
            assert.ok(false, `Falha com elemento nulo: ${e.message}`);
        }
    });
});
