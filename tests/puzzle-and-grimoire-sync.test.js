/**
 * @file puzzle-and-grimoire-sync.test.js
 * @description Suíte de testes unitários para a sincronização de Puzzles com VTT e integração de Grimório.
 * Segue o padrão Arrange-Act-Assert (AAA), cobrindo caminho feliz, casos de borda e tratamento de erros.
 */

const QUnit = require('qunit');
const PuzzleSync = require('../src/modules/puzzle-sync.js');

QUnit.module('PuzzleSync & Dungeon Triggers', function () {

    QUnit.test('1. Validação do Catálogo Oficial de 10 Puzzles (Caminho Feliz)', function (assert) {
        // Arrange & Act
        const catalog = PuzzleSync.getCatalog();
        const keys = Object.keys(catalog);

        // Assert
        assert.equal(keys.length, 10, 'O catálogo deve conter exatamente os 10 puzzles implementados');
        
        // Verifica a presença de puzzles-chave
        const expectedPuzzles = [
            'contagem', 'lanternas', 'fios', 'areia', 'minas',
            'macanetas', 'batalha_monstros', 'forca_bruta', 'entrada_oportuna', 'exercito_infinito'
        ];

        expectedPuzzles.forEach(id => {
            assert.ok(catalog[id], `Puzzle [${id}] deve estar registrado no catálogo`);
            assert.ok(catalog[id].name, `Puzzle [${id}] deve ter um nome legível`);
            assert.ok(catalog[id].icon, `Puzzle [${id}] deve ter um ícone temático`);
        });
    });

    QUnit.test('2. Montagem de Payload de Resolução (Arrange-Act-Assert)', function (assert) {
        // Arrange
        const puzzleKey = 'macanetas';
        const solverName = 'Guerreiro Thorgar';

        // Act
        const payload = PuzzleSync.buildSolvedPayload(puzzleKey, solverName);

        // Assert
        assert.equal(payload.puzzleId, 'macanetas', 'ID do puzzle deve ser macanetas');
        assert.equal(payload.name, 'A Porta das Cores', 'Nome deve ser resolvido a partir do catálogo');
        assert.equal(payload.solvedBy, 'Guerreiro Thorgar', 'Nome do herói que resolveu deve constar');
        assert.true(payload.solved, 'solved deve ser true');
        assert.ok(payload.timestamp, 'Timestamp de resolução deve existir');
    });

    QUnit.test('3. Tratamento de Puzzle Desconhecido ou Customizado (Casos de Borda)', function (assert) {
        // Arrange
        const unknownKey = 'enigma_secreto_da_tumba';

        // Act
        const payload = PuzzleSync.buildSolvedPayload(unknownKey, null);

        // Assert
        assert.equal(payload.puzzleId, 'enigma_secreto_da_tumba', 'ID customizado deve ser mantido');
        assert.equal(payload.solvedBy, 'Grupo de Aventureiros', 'Solver nulo deve receber fallback');
        assert.equal(payload.type, 'custom', 'Tipo desconhecido deve receber fallback custom');
    });

    QUnit.test('4. Notificação de Resolução no Firestore da Sala Ativa (Mock e Comunicação)', function (assert) {
        // Arrange
        let updatedRoomData = null;
        let createdMessage = null;

        const mockDb = {
            collection: (col) => ({
                doc: (roomId) => ({
                    update: (data) => {
                        updatedRoomData = data;
                        return Promise.resolve();
                    },
                    collection: (subCol) => ({
                        add: (msg) => {
                            createdMessage = msg;
                            return Promise.resolve({ id: 'msg_99' });
                        }
                    })
                })
            })
        };

        // Simula sala ativa
        PuzzleSync.getActiveRoomId = () => 'room_vtt_444';

        // Act
        return PuzzleSync.notifyPuzzleSolved('minas', 'Ladino Sorrateiro', mockDb)
            .then(payload => {
                // Assert
                assert.ok(payload, 'Payload deve ser retornado');
                assert.equal(payload.puzzleId, 'minas', 'Puzzle de minas deve ser registrado');
                assert.ok(updatedRoomData['puzzlesSolved.minas'], 'Firestore deve receber a chave puzzlesSolved.minas');
                assert.ok(createdMessage.text.includes('O Campo Minado'), 'Mensagem automática de chat deve citar o nome do puzzle');
                assert.equal(createdMessage.author, 'Sistemas da Masmorra', 'Autor do chat deve ser o sistema');
            });
    });

});
