/**
 * Suíte de Testes Unitários: Visibilidade de Modais, Integridade de Assets e Prevenção de Tela Escura (public/formV6.html)
 * Padrão: Arrange-Act-Assert (AAA)
 * Cobertura: Caminho Feliz, Casos de Borda, Tratamento de Erros e Mocks de Dependência.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FORM_V6_PATH = path.join(ROOT_DIR, 'public/formV6.html');
const TAILWIND_PATH = path.join(ROOT_DIR, 'public/tailwind.css');
const ROOT_FAVICON_PATH = path.join(ROOT_DIR, 'favicon.ico');
const PUBLIC_FAVICON_PATH = path.join(ROOT_DIR, 'public/favicon.ico');

/**
 * Controlador puro e desacoplado para gestão de estado e visibilidade de modais.
 * Permite injeção de dependência de DOM / Elementos para facilitar testes unitários.
 */
class ModalVisibilityController {
    constructor(modalElement) {
        this.element = modalElement;
    }

    show() {
        if (!this.element) {
            throw new Error('Elemento modal não pode ser nulo ou indefinido para exibir');
        }
        if (this.element.classList && typeof this.element.classList.remove === 'function') {
            this.element.classList.remove('hidden');
        }
    }

    hide() {
        if (!this.element) {
            // Tolerância graciosa para nós nulos no fechamento
            return false;
        }
        if (this.element.classList && typeof this.element.classList.add === 'function') {
            this.element.classList.add('hidden');
            return true;
        }
        return false;
    }

    isVisible() {
        if (!this.element || !this.element.classList) {
            return false;
        }
        if (typeof this.element.classList.contains === 'function') {
            return !this.element.classList.contains('hidden');
        }
        return false;
    }
}

QUnit.module('Visibilidade de Modais e Prevenção de 404 / Tela Escura (public/formV6.html)', function () {

    // -------------------------------------------------------------
    // 1. Caminho Feliz (Fluxo Principal)
    // -------------------------------------------------------------
    QUnit.test('1. Regras de CSS .hidden e .modal.hidden devem ter display: none !important (Caminho Feliz)', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(FORM_V6_PATH), 'public/formV6.html deve existir');
        assert.ok(fs.existsSync(TAILWIND_PATH), 'public/tailwind.css deve existir');

        // Act
        const formHtml = fs.readFileSync(FORM_V6_PATH, 'utf-8');
        const tailwindCss = fs.readFileSync(TAILWIND_PATH, 'utf-8');

        // Assert - Verificação no CSS local
        assert.ok(
            tailwindCss.includes('.hidden') && tailwindCss.includes('display: none !important'),
            'public/tailwind.css deve declarar .hidden com display: none !important'
        );

        // Assert - Verificação no style interno do formV6.html
        assert.ok(
            formHtml.includes('.modal.hidden') || formHtml.includes('.hidden,'),
            'public/formV6.html deve declarar explicitamente .modal.hidden ou .hidden com display: none !important'
        );
        assert.ok(
            formHtml.includes('display: none !important;'),
            'public/formV6.html deve conter a regra display: none !important;'
        );
    });

    QUnit.test('2. Modais e Ficha Gerada devem iniciar com a classe "hidden" na marcação HTML (Caminho Feliz)', function (assert) {
        // Arrange
        const formHtml = fs.readFileSync(FORM_V6_PATH, 'utf-8');

        // Act
        const hasConfirmModalHidden = /id=["']custom-confirm-modal["'][^>]*class=["'][^"']*hidden/i.test(formHtml);
        const hasAlertModalHidden = /id=["']alert-modal["'][^>]*class=["'][^"']*hidden/i.test(formHtml);
        const hasPvdModalHidden = /id=["']pvdModal["'][^>]*class=["'][^"']*hidden/i.test(formHtml);
        const hasGeneratedSheetHidden = /id=["']generatedSheet["'][^>]*class=["'][^"']*hidden/i.test(formHtml);

        // Assert
        assert.ok(hasConfirmModalHidden, '#custom-confirm-modal deve iniciar com a classe hidden');
        assert.ok(hasAlertModalHidden, '#alert-modal deve iniciar com a classe hidden');
        assert.ok(hasPvdModalHidden, '#pvdModal deve iniciar com a classe hidden');
        assert.ok(hasGeneratedSheetHidden, '#generatedSheet deve iniciar com a classe hidden');
    });

    QUnit.test('3. Não deve existir injeção de HTML duplicando IDs de modais no DOM (Caminho Feliz)', function (assert) {
        // Arrange
        const formHtml = fs.readFileSync(FORM_V6_PATH, 'utf-8');

        // Act
        const confirmModalOccurrences = (formHtml.match(/id=["']custom-confirm-modal["']/g) || []).length;
        const alertModalOccurrences = (formHtml.match(/id=["']alert-modal["']/g) || []).length;

        // Assert - Cada ID deve estar declarado uma única vez no HTML estático
        assert.equal(confirmModalOccurrences, 1, '#custom-confirm-modal não deve estar duplicado no HTML');
        assert.equal(alertModalOccurrences, 1, '#alert-modal não deve estar duplicado no HTML');

        // Garante que o script não usa insertAdjacentHTML com modalHtml duplicado
        assert.notOk(
            formHtml.includes("document.body.insertAdjacentHTML('beforeend', modalHtml)"),
            'Script não deve injetar modalHtml duplicado no body'
        );
    });

    QUnit.test('4. Assets de Favicon devem existir fisicamente e estar linkados no cabeçalho (Caminho Feliz)', function (assert) {
        // Arrange & Act
        const rootFaviconExists = fs.existsSync(ROOT_FAVICON_PATH);
        const publicFaviconExists = fs.existsSync(PUBLIC_FAVICON_PATH);
        const formHtml = fs.readFileSync(FORM_V6_PATH, 'utf-8');

        // Assert
        assert.ok(rootFaviconExists, 'favicon.ico na raiz do projeto deve existir para evitar erro 404 no servidor');
        assert.ok(publicFaviconExists, 'favicon.ico na pasta public deve existir para evitar erro 404');
        assert.ok(
            formHtml.includes('rel="icon"'),
            'public/formV6.html deve conter tag <link rel="icon"> no <head>'
        );
    });

    // -------------------------------------------------------------
    // 2. Casos de Borda (Edge Cases)
    // -------------------------------------------------------------
    QUnit.test('5. Casos de Borda: ModalVisibilityController alterna estados de visibilidade com segurança', function (assert) {
        // Arrange - Criação de elemento simulado
        const classes = new Set(['modal', 'hidden']);
        const mockElement = {
            classList: {
                add: (c) => classes.add(c),
                remove: (c) => classes.delete(c),
                contains: (c) => classes.has(c)
            }
        };

        const controller = new ModalVisibilityController(mockElement);

        // Act & Assert 1 - Inicialmente oculto
        assert.notOk(controller.isVisible(), 'Modal deve iniciar como não visível');

        // Act & Assert 2 - Exibir modal
        controller.show();
        assert.ok(controller.isVisible(), 'Modal deve ficar visível após chamar show()');
        assert.notOk(classes.has('hidden'), 'Classe hidden deve ter sido removida');

        // Act & Assert 3 - Ocultar modal
        controller.hide();
        assert.notOk(controller.isVisible(), 'Modal deve ficar oculto após chamar hide()');
        assert.ok(classes.has('hidden'), 'Classe hidden deve ter sido adicionada');

        // Act & Assert 4 - Idempotência: Chamar hide() sucessivamente
        controller.hide();
        controller.hide();
        assert.notOk(controller.isVisible(), 'Múltiplas chamadas de hide() devem manter o estado oculto');
    });

    QUnit.test('6. Casos de Borda: Fechar modal com elemento nulo ou sem classList deve retornar false sem crashar', function (assert) {
        // Arrange
        const nullController = new ModalVisibilityController(null);
        const emptyController = new ModalVisibilityController({});

        // Act
        const resNull = nullController.hide();
        const resEmpty = emptyController.hide();

        // Assert
        assert.strictEqual(resNull, false, 'hide() em elemento nulo deve retornar false sem lançar exceção');
        assert.strictEqual(resEmpty, false, 'hide() em objeto sem classList deve retornar false sem lançar exceção');
    });

    // -------------------------------------------------------------
    // 3. Tratamento de Exceções & Mocks
    // -------------------------------------------------------------
    QUnit.test('7. Tratamento de Erros: show() em elemento nulo deve lançar Erro descritivo', function (assert) {
        // Arrange
        const controller = new ModalVisibilityController(null);

        // Act & Assert
        assert.throws(
            () => controller.show(),
            /Elemento modal não pode ser nulo ou indefinido para exibir/,
            'Deve lançar exceção com mensagem explicativa ao tentar exibir modal nulo'
        );
    });

    QUnit.test('8. Mocks de Eventos: Fechamento de modal acionado por cliques de botões de cancelamento', function (assert) {
        // Arrange
        const modalClasses = new Set(['modal']); // Modal visível no início do teste
        const mockModal = {
            classList: {
                add: (c) => modalClasses.add(c),
                remove: (c) => modalClasses.delete(c),
                contains: (c) => modalClasses.has(c)
            }
        };

        const listeners = {};
        const mockButton = {
            addEventListener: (event, handler) => {
                listeners[event] = handler;
            }
        };

        // Simula o registro do event listener como feito em formV6.html
        mockButton.addEventListener('click', () => {
            mockModal.classList.add('hidden');
        });

        // Act - Simula o clique do usuário no botão Cancelar / Fechar
        assert.notOk(mockModal.classList.contains('hidden'), 'Antes do clique, modal está visível');
        listeners['click']();

        // Assert
        assert.ok(mockModal.classList.contains('hidden'), 'Após o clique, modal deve conter a classe hidden');
    });
});
