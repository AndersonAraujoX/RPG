/**
 * @file tests/vtt-session-persistence.test.js
 * @description Suíte de Testes Unitários para o Motor de Persistência,
 * Histórico Undo/Redo e Exportação de Cenas da Mesa Virtual (Kuar-Tor VTT).
 * Padrão: Arrange-Act-Assert (AAA)
 */

const QUnit = require('qunit');
const VttSessionPersistence = require('../src/core/vtt-session-persistence');

QUnit.module('VttSessionPersistence: Persistência & Histórico VTT (AAA)', function () {

    // -------------------------------------------------------------------------
    // 1. Caminho Feliz: Serialização e Desserialização de Cena Completa
    // -------------------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: Serialização e Desserialização preserva todos os dados do VTT (AAA)', function (assert) {
        // Arrange
        const initialState = {
            mapUrl: 'maps/dungeon_vulcânica.webp',
            scale: 1.25,
            originX: 120,
            originY: -80,
            gridSize: 50,
            showGrid: true,
            snapToGrid: true,
            currentRound: 3,
            currentTurnIndex: 1,
            fogRevealedCells: ['0,0', '1,0', '2,1'],
            tokens: {
                tok_1: { id: 'tok_1', name: 'Guerreiro Elfo', hp: 22, maxHp: 24, pe: 6, maxPe: 8, x: 100, y: 150, conditions: ['abençoado'] }
            },
            combatants: [
                { id: 'tok_1', name: 'Guerreiro Elfo', initiative: 14, hp: 22, maxHp: 24, isPlayer: true }
            ]
        };

        // Act: Serializa e depois desserializa em um novo objeto de estado
        const serialized = VttSessionPersistence.serializeScene(initialState, { sceneName: 'Catacumbas Antigas' });
        const restoredState = VttSessionPersistence.deserializeScene(serialized, {});

        // Assert
        assert.equal(serialized.version, 1, 'Versão do schema deve ser 1');
        assert.equal(serialized.metadata.sceneName, 'Catacumbas Antigas', 'Metadados da cena gravados corretamente');
        assert.equal(restoredState.mapUrl, 'maps/dungeon_vulcânica.webp', 'URL do mapa restaurada');
        assert.equal(restoredState.scale, 1.25, 'Escala de zoom restaurada');
        assert.equal(restoredState.tokens.tok_1.name, 'Guerreiro Elfo', 'Nome do token preservado');
        assert.equal(restoredState.tokens.tok_1.hp, 22, 'PV do token preservado');
        assert.deepEqual(restoredState.tokens.tok_1.conditions, ['abençoado'], 'Condições do token preservadas');
        assert.equal(restoredState.currentRound, 3, 'Rodada de combate preservada');
        assert.deepEqual(restoredState.fogRevealedCells, ['0,0', '1,0', '2,1'], 'Névoa revelada preservada');
    });

    // -------------------------------------------------------------------------
    // 2. Caminho Feliz: Gerenciador de Histórico (Undo / Redo)
    // -------------------------------------------------------------------------
    QUnit.test('2. Caminho Feliz: Gerenciador de Histórico executa pushSnapshot, undo e redo (AAA)', function (assert) {
        // Arrange
        const history = VttSessionPersistence.createHistoryManager(10);
        const stateA = {
            tokens: { t1: { id: 't1', x: 50, y: 50, hp: 10 } }
        };
        const stateB = {
            tokens: { t1: { id: 't1', x: 100, y: 100, hp: 10 } }
        };
        const stateC = {
            tokens: { t1: { id: 't1', x: 200, y: 200, hp: 8 } }
        };

        // Act: Registra histórico passo a passo
        history.pushSnapshot(stateA);
        history.pushSnapshot(stateB);

        // Assert: estado inicial do histórico
        assert.ok(history.canUndo(), 'Deve permitir desfazer após 2 snapshots');
        assert.notOk(history.canRedo(), 'Não deve permitir refazer antes de qualquer undo');
        assert.equal(history.getUndoCount(), 2, 'Total de 2 snapshots na pilha de undo');

        // Act: Desfaz estado B voltando para B
        const undoneToB = history.undo(stateC);

        // Assert: volta para B e habilita redo
        assert.equal(undoneToB.tokens.t1.x, 100, 'X restaurado para 100 do estado B');
        assert.ok(history.canRedo(), 'Agora deve permitir refazer');

        // Act: Refaz voltando para C
        const redoneToC = history.redo(undoneToB);
        assert.equal(redoneToC.tokens.t1.x, 200, 'X restaurado para 200 do estado C');
        assert.notOk(history.canRedo(), 'Pilha de redo esgotada');
    });

    // -------------------------------------------------------------------------
    // 3. Casos de Borda: Capacidade Máxima do Histórico (Overflow)
    // -------------------------------------------------------------------------
    QUnit.test('3. Casos de Borda: Limite de snapshots do histórico respeita capacidade máxima (AAA)', function (assert) {
        // Arrange
        const maxLimit = 3;
        const history = VttSessionPersistence.createHistoryManager(maxLimit);

        // Act: Empurra 5 snapshots (deve manter apenas os 3 mais recentes)
        for (let i = 1; i <= 5; i++) {
            history.pushSnapshot({ scale: i });
        }

        // Assert
        assert.equal(history.getUndoCount(), 3, 'Pilha de histórico deve ser limitada a 3');

        // O primeiro undo deve retornar o snapshot 5 (o mais recente da pilha)
        const firstUndo = history.undo({ scale: 6 });
        assert.equal(firstUndo.scale, 5, 'Snapshot recuperado deve ser o 5');
    });

    // -------------------------------------------------------------------------
    // 4. Casos de Borda: LocalStorage Mock e Persistência Resiliente
    // -------------------------------------------------------------------------
    QUnit.test('4. Casos de Borda: Salva e carrega em LocalStorage com mock seguro (AAA)', function (assert) {
        // Arrange: Mock do storage
        const mockStorageData = {};
        const mockStorage = {
            setItem(key, val) { mockStorageData[key] = String(val); },
            getItem(key) { return mockStorageData[key] || null; },
            removeItem(key) { delete mockStorageData[key]; }
        };
        const sampleState = {
            mapUrl: 'test_map.png',
            tokens: { hero: { id: 'hero', name: 'Paladino', hp: 30, maxHp: 30 } }
        };

        // Act: Salva e carrega
        const saveOk = VttSessionPersistence.saveToLocalStorage('test_scene_key', sampleState, mockStorage);
        const loadedPayload = VttSessionPersistence.loadFromLocalStorage('test_scene_key', mockStorage);
        const restored = VttSessionPersistence.deserializeScene(loadedPayload, {});

        // Assert
        assert.ok(saveOk, 'Salvamento no storage mock deve ter sucesso');
        assert.ok(loadedPayload, 'Carga do storage mock deve retornar payload');
        assert.equal(restored.tokens.hero.name, 'Paladino', 'Token restaurado com sucesso');
    });

    // -------------------------------------------------------------------------
    // 5. Casos de Borda & Erros: JSON Corrompido, Nulo ou Vazio
    // -------------------------------------------------------------------------
    QUnit.test('5. Tratamento de Exceções: Entradas nulas e JSON corrompido devem lançar ou falhar com segurança (AAA)', function (assert) {
        // Arrange, Act & Assert: Null em serialize
        assert.throws(() => {
            VttSessionPersistence.serializeScene(null);
        }, /Estado inválido/, 'Serializar null deve lançar erro');

        // Null em deserialize
        assert.throws(() => {
            VttSessionPersistence.deserializeScene(null);
        }, /Nenhum dado fornecido/, 'Desserializar null deve lançar erro');

        // JSON malformado
        assert.throws(() => {
            VttSessionPersistence.deserializeScene('{ corrompido: true, ');
        }, /Falha ao converter JSON/, 'JSON malformado deve lançar erro legível');

        // Storage ausente
        const saveWithoutStorage = VttSessionPersistence.saveToLocalStorage('key', {}, null);
        assert.notOk(saveWithoutStorage, 'Salvar sem storage disponível deve retornar false sem quebrar');
    });

    // -------------------------------------------------------------------------
    // 6. Caminho Feliz: Exportação e Importação de Arquivo JSON
    // -------------------------------------------------------------------------
    QUnit.test('6. Caminho Feliz: Geração e validação de arquivo JSON exportável (AAA)', function (assert) {
        // Arrange
        const state = {
            mapUrl: 'dungeon.jpg',
            tokens: { t1: { id: 't1', name: 'Mago', hp: 12 } }
        };

        // Act
        const jsonExport = VttSessionPersistence.generateExportJson(state, { sceneName: 'A Torre Arcana' });
        const parsed = VttSessionPersistence.parseImportJson(jsonExport);

        // Assert
        assert.ok(typeof jsonExport === 'string', 'Exportação deve retornar string JSON');
        assert.ok(jsonExport.includes('A Torre Arcana'), 'Nome da cena deve estar no JSON');
        assert.equal(parsed.version, 1, 'Versão do schema deve estar no JSON importado');
        assert.equal(parsed.tokens.t1.name, 'Mago', 'Tokens preservados na importação');
    });
});
