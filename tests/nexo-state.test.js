/**
 * @file nexo-state.test.js
 * @description Testes unitários (AAA) do estado do Nexo do Paradoxo no Firestore.
 * Cobre: caminho feliz, casos de borda e tratamento de erros, com mocks do Firestore.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');
const NexoState = require('../src/modules/nexo-state.js');

/** Mock mínimo do Firestore (collection/doc/set/onSnapshot). */
function criarDbMock({ snapshotData = null, existe = true, setError = null, snapError = null } = {}) {
    const calls = { path: [], set: [], unsub: 0 };
    const docRef = {
        set: async (payload, opts) => {
            if (setError) throw setError;
            calls.set.push({ payload, opts });
        },
        onSnapshot: (ok, fail) => {
            if (snapError) fail(snapError);
            else ok({ exists: existe, data: () => snapshotData });
            return () => { calls.unsub++; };
        }
    };
    const db = {
        collection: (c) => { calls.path.push(c); return { doc: (d) => { calls.path.push(d); return docRef; } }; }
    };
    return { db, calls };
}

QUnit.module('Nexo do Paradoxo: Estado no Firestore', function () {

    // ---------------- Caminho feliz ----------------
    QUnit.test('1. Catálogo padrão: 13 cômodos, 4 liberados por padrão', function (assert) {
        // Arrange & Act
        const lista = NexoState.criarComodosPadrao();
        // Assert
        assert.equal(lista.length, 13, '13 cômodos');
        assert.deepEqual(lista.filter(c => c.disponivel).map(c => c.id), ['forja', 'cozinha', 'biblioteca', 'nucleo']);
    });

    QUnit.test('2. mesclarEstado aplica liberações remotas sem mutar a entrada', function (assert) {
        // Arrange
        const base = NexoState.criarComodosPadrao();
        // Act
        const res = NexoState.mesclarEstado(base, { enfermaria: true, forja: false });
        // Assert
        assert.true(res.find(c => c.id === 'enfermaria').disponivel, 'enfermaria liberada');
        assert.false(res.find(c => c.id === 'forja').disponivel, 'forja bloqueada');
        assert.false(base.find(c => c.id === 'enfermaria').disponivel, 'entrada original intacta');
    });

    QUnit.test('3. Repositório: setComodo grava no documento nexo/estado com merge', async function (assert) {
        // Arrange
        const { db, calls } = criarDbMock();
        const repo = NexoState.createNexoRepository(db, () => 'T0');
        // Act
        await repo.setComodo('estufa', true, 'uid-mestre');
        // Assert
        assert.deepEqual(calls.path, ['nexo', 'estado'], 'caminho correto');
        assert.deepEqual(calls.set[0].payload, { comodos: { estufa: true }, updatedAt: 'T0', updatedBy: 'uid-mestre' });
        assert.deepEqual(calls.set[0].opts, { merge: true }, 'usa merge para não apagar outros cômodos');
    });

    QUnit.test('4. Repositório: subscribe entrega o mapa e devolve função de cancelamento', function (assert) {
        // Arrange
        const { db, calls } = criarDbMock({ snapshotData: { comodos: { minerio: true } } });
        const repo = NexoState.createNexoRepository(db);
        let recebido = null;
        // Act
        const unsub = repo.subscribe(m => { recebido = m; });
        unsub();
        // Assert
        assert.deepEqual(recebido, { minerio: true });
        assert.equal(calls.unsub, 1, 'assinatura cancelada');
    });

    // ---------------- Casos de borda ----------------
    QUnit.test('5. Bordas: documento inexistente ou sem campo comodos retorna mapa vazio', function (assert) {
        // Arrange
        const vazios = [criarDbMock({ existe: false }), criarDbMock({ snapshotData: {} }), criarDbMock({ snapshotData: null })];
        // Act & Assert
        vazios.forEach(({ db }) => {
            let r = null;
            NexoState.createNexoRepository(db).subscribe(m => { r = m; });
            assert.deepEqual(r, {});
        });
    });

    QUnit.test('6. Bordas: mesclarEstado ignora nulos, ids desconhecidos e valores não booleanos', function (assert) {
        // Arrange
        const base = NexoState.criarComodosPadrao();
        // Act
        const a = NexoState.mesclarEstado(base, null);
        const b = NexoState.mesclarEstado(base, { fantasma: true, forja: 'sim', cozinha: 1 });
        const c = NexoState.mesclarEstado(null, { forja: true });
        // Assert
        assert.deepEqual(a.map(x => x.disponivel), base.map(x => x.disponivel));
        assert.deepEqual(b.map(x => x.disponivel), base.map(x => x.disponivel), 'valores inválidos ignorados');
        assert.deepEqual(c, [], 'lista nula vira vazia');
    });

    QUnit.test('7. Bordas: comodoExiste valida ids', function (assert) {
        // Arrange
        const lista = NexoState.criarComodosPadrao();
        // Act & Assert
        assert.true(NexoState.comodoExiste(lista, 'forja'));
        assert.false(NexoState.comodoExiste(lista, 'inexistente'));
        assert.false(NexoState.comodoExiste(null, 'forja'));
    });

    QUnit.test('8. Bordas: setComodo sem userId grava updatedBy null', async function (assert) {
        // Arrange
        const { db, calls } = criarDbMock();
        // Act
        await NexoState.createNexoRepository(db, () => 'T').setComodo('forja', false);
        // Assert
        assert.strictEqual(calls.set[0].payload.updatedBy, null);
    });

    // ---------------- Erros ----------------
    QUnit.test('9. Erros: db inválido e argumentos inválidos lançam exceção', async function (assert) {
        // Arrange
        const repo = NexoState.createNexoRepository(criarDbMock().db);
        // Act & Assert
        assert.throws(() => NexoState.createNexoRepository(null), /Firestore inválida/);
        assert.throws(() => NexoState.createNexoRepository({}), /Firestore inválida/);
        await assert.rejects(repo.setComodo('', true), /ID de cômodo inválido/);
        await assert.rejects(repo.setComodo(null, true), /ID de cômodo inválido/);
        await assert.rejects(repo.setComodo('forja', 'sim'), /booleana/);
    });

    QUnit.test('10. Erros: falha do Firestore propaga na escrita e chega ao callback na leitura', async function (assert) {
        // Arrange
        const escrita = criarDbMock({ setError: new Error('permission-denied') });
        const leitura = criarDbMock({ snapError: new Error('unavailable') });
        let erroLeitura = null;
        // Act
        NexoState.createNexoRepository(leitura.db).subscribe(() => {}, e => { erroLeitura = e; });
        // Assert
        await assert.rejects(NexoState.createNexoRepository(escrita.db).setComodo('forja', true), /permission-denied/);
        assert.equal(erroLeitura.message, 'unavailable');
        assert.ok(() => NexoState.createNexoRepository(leitura.db).subscribe(() => {}), 'sem callback de erro não quebra');
    });

    // ---------------- Integração com a página ----------------
    QUnit.test('11. Página public/nexo.html usa Firestore (não o Realtime Database desativado)', function (assert) {
        // Arrange
        const html = fs.readFileSync(path.join(__dirname, '../public/nexo.html'), 'utf8');
        // Act & Assert
        assert.ok(html.includes('firebase-firestore.js'), 'carrega Firestore');
        assert.ok(html.includes('nexo-state.js'), 'carrega o módulo de estado');
        assert.notOk(html.includes('firebase-database'), 'não usa Realtime Database');
        assert.ok(html.includes('href="tailwind.css"'), 'usa tailwind local');
        assert.notOk(html.includes('cdn.tailwindcss.com'), 'sem CDN bloqueado');
    });
});
