/**
 * @file tests/vtt-shortcuts-controller.test.js
 * @description Suíte de Testes Unitários para o Controlador de Atalhos de Teclado
 * da Mesa Virtual (Kuar-Tor VTT).
 * Padrão: Arrange-Act-Assert (AAA)
 */

const QUnit = require('qunit');
const VttShortcutsController = require('../src/core/vtt-shortcuts-controller');

QUnit.module('VttShortcutsController: Atalhos de Teclado do VTT (AAA)', function () {

    // -------------------------------------------------------------------------
    // 1. Caminho Feliz: Resolução de Ações (Undo, Redo, Delete, Escape, Pan)
    // -------------------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: Identifica corretamente combinações de teclas padrão (AAA)', function (assert) {
        // Arrange
        const undoEvent = { key: 'z', ctrlKey: true, shiftKey: false, target: { tagName: 'DIV' } };
        const redoEvent1 = { key: 'y', ctrlKey: true, shiftKey: false, target: { tagName: 'DIV' } };
        const redoEvent2 = { key: 'z', ctrlKey: true, shiftKey: true, target: { tagName: 'DIV' } };
        const deleteEvent = { key: 'Delete', target: { tagName: 'BODY' } };
        const escEvent = { key: 'Escape', target: { tagName: 'BODY' } };
        const spaceEvent = { key: ' ', target: { tagName: 'DIV' } };
        const tabNext = { key: 'Tab', shiftKey: false, target: { tagName: 'DIV' } };
        const tabPrev = { key: 'Tab', shiftKey: true, target: { tagName: 'DIV' } };
        const pingEvent = { key: 't', ctrlKey: false, target: { tagName: 'DIV' } };

        // Act & Assert
        assert.equal(VttShortcutsController.resolveKeyAction(undoEvent), 'UNDO', 'Ctrl+Z deve mapear para UNDO');
        assert.equal(VttShortcutsController.resolveKeyAction(redoEvent1), 'REDO', 'Ctrl+Y deve mapear para REDO');
        assert.equal(VttShortcutsController.resolveKeyAction(redoEvent2), 'REDO', 'Ctrl+Shift+Z deve mapear para REDO');
        assert.equal(VttShortcutsController.resolveKeyAction(deleteEvent), 'DELETE_TOKEN', 'Delete deve mapear para DELETE_TOKEN');
        assert.equal(VttShortcutsController.resolveKeyAction(escEvent), 'ESCAPE', 'Escape deve mapear para ESCAPE');
        assert.equal(VttShortcutsController.resolveKeyAction(spaceEvent), 'SPACE_PAN', 'Space deve mapear para SPACE_PAN');
        assert.equal(VttShortcutsController.resolveKeyAction(tabNext), 'CYCLE_TOKEN_NEXT', 'Tab deve ciclar próximo token');
        assert.equal(VttShortcutsController.resolveKeyAction(tabPrev), 'CYCLE_TOKEN_PREV', 'Shift+Tab deve ciclar token anterior');
        assert.equal(VttShortcutsController.resolveKeyAction(pingEvent), 'PING', 'Tecla T deve mapear para PING');
    });

    // -------------------------------------------------------------------------
    // 2. Casos de Borda: Proteção de Campos de Texto e Inputs
    // -------------------------------------------------------------------------
    QUnit.test('2. Casos de Borda: Ignora atalhos de jogo quando o foco estiver em elementos editáveis (AAA)', function (assert) {
        // Arrange
        const inputTarget = { tagName: 'INPUT' };
        const textareaTarget = { tagName: 'TEXTAREA' };
        const contentEditableTarget = { tagName: 'DIV', isContentEditable: true };

        const testEvent = (target) => ({
            key: 'Delete',
            ctrlKey: false,
            target
        });

        // Act & Assert
        assert.ok(VttShortcutsController.isEditableElement(inputTarget), 'Input deve ser reconhecido como editável');
        assert.ok(VttShortcutsController.isEditableElement(textareaTarget), 'Textarea deve ser reconhecido como editável');
        assert.ok(VttShortcutsController.isEditableElement(contentEditableTarget), 'Elemento contentEditable deve ser reconhecido como editável');

        assert.equal(VttShortcutsController.resolveKeyAction(testEvent(inputTarget)), null, 'Delete dentro de input não deve disparar DELETE_TOKEN');
        assert.equal(VttShortcutsController.resolveKeyAction(testEvent(textareaTarget)), null, 'Delete dentro de textarea não deve disparar DELETE_TOKEN');
        assert.equal(VttShortcutsController.resolveKeyAction(testEvent(contentEditableTarget)), null, 'Delete em contentEditable não deve disparar DELETE_TOKEN');
    });

    // -------------------------------------------------------------------------
    // 3. Caminho Feliz: Disparo de Callbacks e Prevenção Padrão (AAA)
    // -------------------------------------------------------------------------
    QUnit.test('3. Caminho Feliz: Dispara callbacks correspondentes e previne default (AAA)', function (assert) {
        // Arrange
        let undoCalled = false;
        let deleteCalled = false;
        let preventDefaultCalled = false;

        const handlers = {
            onUndo: () => { undoCalled = true; },
            onDeleteToken: () => { deleteCalled = true; }
        };

        const controller = VttShortcutsController.createController(handlers);

        const mockUndoEvent = {
            key: 'z',
            ctrlKey: true,
            shiftKey: false,
            target: { tagName: 'DIV' },
            preventDefault: () => { preventDefaultCalled = true; }
        };

        // Act
        const action = controller.handleKeyDown(mockUndoEvent);

        // Assert
        assert.equal(action, 'UNDO', 'Ação resolvida deve ser UNDO');
        assert.ok(undoCalled, 'Callback onUndo deve ter sido invocado');
        assert.ok(preventDefaultCalled, 'preventDefault deve ter sido chamado para evitar desfazer do navegador');
    });

    // -------------------------------------------------------------------------
    // 4. Casos de Borda: Ciclo de Pressionar e Soltar a Barra de Espaço (Pan)
    // -------------------------------------------------------------------------
    QUnit.test('4. Casos de Borda: Barra de espaço ativa pan temporário no keydown e restaura no keyup (AAA)', function (assert) {
        // Arrange
        let panStarted = false;
        let restoredTool = null;

        const handlers = {
            onSpacePanStart: () => {
                panStarted = true;
                return 'ruler'; // Ferramenta anterior que deve ser restaurada
            },
            onSpacePanEnd: (prev) => {
                restoredTool = prev;
            }
        };

        const controller = VttShortcutsController.createController(handlers);

        // Act: Pressiona Space
        const downAction = controller.handleKeyDown({ key: ' ', target: { tagName: 'DIV' }, preventDefault: () => {} });
        assert.equal(downAction, 'SPACE_PAN', 'Space Down deve acionar SPACE_PAN');
        assert.ok(controller.getSpacePanningActive(), 'Estado spacePanningActive deve ser true');
        assert.ok(panStarted, 'onSpacePanStart invocado');

        // Act: Solta Space
        const upAction = controller.handleKeyUp({ key: ' ' });
        assert.equal(upAction, 'SPACE_PAN_END', 'Space Up deve acionar SPACE_PAN_END');
        assert.notOk(controller.getSpacePanningActive(), 'Estado spacePanningActive deve voltar a false');
        assert.equal(restoredTool, 'ruler', 'Ferramenta anterior deve ser restaurada');
    });

    // -------------------------------------------------------------------------
    // 5. Tratamento de Exceções & Borda: Entradas Nulas e Ausência de Handlers
    // -------------------------------------------------------------------------
    QUnit.test('5. Tratamento de Exceções: Entradas nulas e ausência de handlers não lançam exceção (AAA)', function (assert) {
        // Arrange
        const controller = VttShortcutsController.createController({});

        // Act & Assert
        assert.equal(controller.handleKeyDown(null), null, 'handleKeyDown com null retorna null');
        assert.equal(controller.handleKeyUp(null), null, 'handleKeyUp com null retorna null');
        assert.equal(VttShortcutsController.isEditableElement(null), false, 'isEditableElement com null retorna false');

        // Pressionar tecla sem callback registrado
        const action = controller.handleKeyDown({ key: 'Escape', target: {} });
        assert.equal(action, 'ESCAPE', 'Ação é resolvida mesmo sem callback fornecido');
    });
});
