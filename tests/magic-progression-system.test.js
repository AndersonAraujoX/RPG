/**
 * Testes Unitários — Sistema de Progressão Mágica (AAA)
 */
const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');
const P = require('../src/core/magic-progression-system');
const { magicPaths } = require('../src/core/magic-tree-engine');

const HTML = fs.readFileSync(path.resolve(__dirname, '../public/arvore_magia.html'), 'utf-8');
const sec = { id: 's03', paths: ['fogo', 'terra'] };
const ter = { id: 't005', paths: ['fogo', 'ar', 'terra'] };

QUnit.module('Ressonância de Caminhos', function () {
    QUnit.test('Caminho feliz e bordas', function (assert) {
        assert.strictEqual(P.computeResonance(sec, { fogo: 2, terra: 3 }), 1, 'diferença 1 -> +1');
        assert.strictEqual(P.computeResonance(sec, { fogo: 2, terra: 2 }), 1, 'iguais -> +1');
        assert.strictEqual(P.computeResonance(sec, { fogo: 1, terra: 4 }), 0, 'diferença grande -> 0');
        assert.strictEqual(P.computeResonance(sec, { fogo: 0, terra: 0 }), 0, 'sem treino -> 0');
        assert.strictEqual(P.computeResonance(sec, { fogo: 2 }), 0, 'caminho ausente -> 0');
        assert.strictEqual(P.computeResonance(ter, { fogo: 2, ar: 2, terra: 2 }), 0, 'Terceirus não tem ressonância');
    });
    QUnit.test('Erros', function (assert) {
        assert.throws(() => P.computeResonance(null, {}), /Círculo inválido/);
        assert.throws(() => P.computeResonance({ paths: ['fogo'] }, {}), /2 \(Secundus\) ou 3/);
        assert.throws(() => P.computeResonance(sec, null), /Níveis de caminhos inválidos/);
    });
});

QUnit.module('Instabilidade Arcana', function () {
    QUnit.test('Caminho feliz: 2 natural em Terceirus gera surto do caminho sorteado', function (assert) {
        const surge = P.rollSurge(ter, 2, () => 0);
        assert.equal(surge.path, 'fogo');
        assert.equal(surge.effect, P.SURGES.fogo[0]);
        const last = P.rollSurge(ter, 2, () => 0.999999);
        assert.equal(last.path, 'terra');
        assert.equal(last.effect, P.SURGES.terra[2]);
    });
    QUnit.test('Bordas: sem surto fora das condições; rng = 1 não estoura o índice', function (assert) {
        assert.strictEqual(P.rollSurge(ter, 3, () => 0), null, 'dado != 2');
        assert.strictEqual(P.rollSurge(sec, 2, () => 0), null, 'Secundus não sofre surto');
        assert.ok(P.rollSurge(ter, 2, () => 1).effect, 'rng=1 limitado ao último índice');
    });
    QUnit.test('Tabela cobre os 12 caminhos e erros são lançados', function (assert) {
        Object.keys(magicPaths).forEach(k => assert.equal((P.SURGES[k] || []).length, 3, `${k}: 3 surtos`));
        assert.throws(() => P.rollSurge(ter, 2, null), /Gerador aleatório inválido/);
        assert.throws(() => P.rollSurge(ter, 2, () => 0, { fogo: [] }), /Sem surtos definidos/);
    });
});

QUnit.module('Maestria de Círculo', function () {
    QUnit.test('Faixas e redução de CD/PE', function (assert) {
        assert.equal(P.getMasteryTier(0).key, 'NOVATO');
        assert.equal(P.getMasteryTier(3).key, 'ADEPTO');
        assert.equal(P.getMasteryTier(8).key, 'MESTRE');
        assert.deepEqual([P.applyMastery(12, 5, 0).cd, P.applyMastery(12, 5, 0).pe], [12, 5]);
        assert.deepEqual([P.applyMastery(12, 5, 4).cd, P.applyMastery(12, 5, 4).pe], [11, 5]);
        assert.deepEqual([P.applyMastery(12, 5, 20).cd, P.applyMastery(12, 5, 20).pe], [10, 4]);
    });
    QUnit.test('Bordas: mínimos 1, usos inválidos viram Novato; erros', function (assert) {
        const r = P.applyMastery(1, 1, 99);
        assert.deepEqual([r.cd, r.pe], [1, 1]);
        assert.equal(P.getMasteryTier(-5).key, 'NOVATO');
        assert.equal(P.getMasteryTier(undefined).key, 'NOVATO');
        assert.throws(() => P.applyMastery('x', 3, 0), /numéricos/);
    });
    QUnit.test('recordUsage soma, revela e não muta o estado original', function (assert) {
        const base = P.createProgressionState();
        const a = P.recordUsage(base, 's03');
        const b = P.recordUsage(a, 's03');
        assert.equal(b.usage.s03, 2);
        assert.ok(b.discovered.s03);
        assert.deepEqual(base.usage, {}, 'imutável');
        assert.throws(() => P.recordUsage(null, 's03'), /Estado de progressão inválido/);
        assert.throws(() => P.recordUsage(base, ''), /ID de círculo inválido/);
    });
});

QUnit.module('Descoberta de Círculos', function () {
    QUnit.test('Semente inicial, revelação e erros', function (assert) {
        const seeded = P.createProgressionState(undefined, ['s03', null]);
        assert.ok(P.isDiscovered(seeded, 's03'));
        assert.notOk(P.isDiscovered(seeded, 't001'));
        const next = P.discoverCircle(seeded, 't001');
        assert.ok(P.isDiscovered(next, 't001'));
        assert.notOk(P.isDiscovered(seeded, 't001'), 'imutável');
        const kept = P.createProgressionState({ discovered: { x1: true } }, ['s03']);
        assert.notOk(kept.discovered.s03, 'semente só vale para estado novo');
        assert.throws(() => P.discoverCircle(seeded, null), /ID de círculo inválido/);
        assert.throws(() => P.isDiscovered(null, 'x'), /Estado de progressão inválido/);
    });
});

QUnit.module('Pontos de Especialização', function () {
    QUnit.test('Caminho feliz: escolhe aspecto no nível 5 e concede +1 na forma certa', function (assert) {
        const state = P.chooseSpecialization(P.createProgressionState(), { fogo: 5 }, 'fogo', 'explosao');
        assert.equal(state.specializations.fogo, 'explosao');
        assert.strictEqual(P.getSpecializationBonus(state, sec, { fogo: 5, terra: 1 }, 'Criar'), 1);
        assert.strictEqual(P.getSpecializationBonus(state, sec, { fogo: 5, terra: 1 }, 'Entender'), 0);
        assert.strictEqual(P.getSpecializationBonus(state, sec, { fogo: 4, terra: 1 }, 'Criar'), 0, 'nível caiu abaixo de 5');
    });
    QUnit.test('Todos os 12 caminhos têm 2 aspectos', function (assert) {
        Object.keys(magicPaths).forEach(k => assert.equal(P.getSpecializationOptions(k).length, 2, k));
    });
    QUnit.test('Erros: nível baixo, repetição, aspecto/caminho inválidos', function (assert) {
        const s = P.createProgressionState();
        assert.throws(() => P.chooseSpecialization(s, { fogo: 4 }, 'fogo', 'brasa'), /Requer nível 5/);
        assert.throws(() => P.chooseSpecialization(s, { fogo: 5 }, 'fogo', 'xxx'), /Aspecto desconhecido/);
        assert.throws(() => P.chooseSpecialization(s, { plasma: 9 }, 'plasma', 'a'), /Caminho desconhecido/);
        const done = P.chooseSpecialization(s, { fogo: 5 }, 'fogo', 'brasa');
        assert.throws(() => P.chooseSpecialization(done, { fogo: 5 }, 'fogo', 'explosao'), /já possui/);
    });
});

QUnit.module('Selamento da Biblioteca Arcana (AAA)', function () {
    QUnit.test('1. Caminho Feliz: sealLibrary sela todos os círculos e registra timestamp (AAA)', function (assert) {
        // Arrange
        const initialState = P.createProgressionState({
            discovered: { s01: true, s02: true, t005: true },
            usage: { s01: 5 }
        });

        // Act
        const sealed = P.sealLibrary(initialState);

        // Assert
        assert.deepEqual(sealed.discovered, {}, 'Todos os círculos devem estar selados (apagados)');
        assert.ok(sealed.isSealed, 'isSealed deve ser true');
        assert.ok(sealed.sealedAt, 'Deve possuir timestamp de selamento');
        assert.strictEqual(sealed.usage.s01, 5, 'Uso e maestria devem ser preservados');
        assert.ok(initialState.discovered.s01, 'Imutabilidade: estado original não é modificado');
    });

    QUnit.test('2. Casos de Borda: sealLibrary com keepBasics preserva círculos fundamentais (AAA)', function (assert) {
        // Arrange
        const state = P.createProgressionState({
            discovered: { s01: true, s02: true, s03: true, t005: true }
        });

        // Act
        const sealed = P.sealLibrary(state, { keepBasics: true, basicIds: ['s01', 's02', null] });

        // Assert
        assert.ok(P.isDiscovered(sealed, 's01'), 's01 básico preservado');
        assert.ok(P.isDiscovered(sealed, 's02'), 's02 básico preservado');
        assert.notOk(P.isDiscovered(sealed, 's03'), 's03 selado');
        assert.notOk(P.isDiscovered(sealed, 't005'), 't005 selado');
    });

    QUnit.test('3. Caminho Feliz: unsealLibrary desbloqueia todos os 186 círculos fornecidos (AAA)', function (assert) {
        // Arrange
        const sealed = P.sealLibrary(P.createProgressionState());
        const allIds = ['s01', 's02', 's03', 't001', 't002'];

        // Act
        const unsealed = P.unsealLibrary(sealed, allIds);

        // Assert
        assert.notOk(unsealed.isSealed, 'isSealed deve ser false');
        allIds.forEach(id => assert.ok(P.isDiscovered(unsealed, id), `${id} desvelado`));
    });

    QUnit.test('4. Casos de Borda: getLibrarySealStatus calcula percentuais e flags de borda (AAA)', function (assert) {
        // Arrange 1: Totalmente selada
        const sealedState = P.sealLibrary(P.createProgressionState());
        const status1 = P.getLibrarySealStatus(sealedState, 186);

        // Assert 1
        assert.strictEqual(status1.discoveredCount, 0, '0 descobertos');
        assert.strictEqual(status1.sealedCount, 186, '186 selados');
        assert.strictEqual(status1.percentageDiscovered, 0, '0% desvelado');
        assert.ok(status1.isFullySealed, 'isFullySealed deve ser true');
        assert.notOk(status1.isFullyUnsealed, 'isFullyUnsealed deve ser false');

        // Arrange 2: Parcialmente desvelada
        const partialState = P.createProgressionState({
            discovered: { s01: true, s02: true }
        });
        const status2 = P.getLibrarySealStatus(partialState, 10);

        // Assert 2
        assert.strictEqual(status2.discoveredCount, 2, '2 descobertos');
        assert.strictEqual(status2.sealedCount, 8, '8 selados');
        assert.strictEqual(status2.percentageDiscovered, 20, '20% desvelado');

        // Arrange 3: Totalmente desvelada
        const fullState = P.unsealLibrary(P.createProgressionState(), ['c1', 'c2']);
        const status3 = P.getLibrarySealStatus(fullState, 2);
        assert.ok(status3.isFullyUnsealed, 'Totalmente desvelada');
    });

    QUnit.test('5. Tratamento de Exceções: Entradas inválidas disparam erros descritivos (AAA)', function (assert) {
        assert.throws(() => P.sealLibrary(null), /Estado de progressão inválido/);
        assert.throws(() => P.unsealLibrary(null, []), /Estado de progressão inválido/);
        assert.throws(() => P.unsealLibrary(P.createProgressionState(), 'não-array'), /allCircleIds deve ser um array/);
        assert.throws(() => P.getLibrarySealStatus(null), /Estado de progressão inválido/);
    });
});

QUnit.module('Integração em arvore_magia.html', function () {
    QUnit.test('Página carrega o módulo e aplica as mecânicas de progressão e selamento', function (assert) {
        const freshHtml = fs.readFileSync(path.resolve(__dirname, '../public/arvore_magia.html'), 'utf-8');
        assert.ok(freshHtml.includes('magic-progression-system.js'));
        ['computeResonance', 'rollSurge', 'applyMastery', 'recordUsage', 'discoverCircle', 'chooseSpecialization', 'getSpecializationBonus', 'sealLibrary', 'unsealLibrary']
            .forEach(fn => assert.ok(freshHtml.includes(fn), `usa ${fn}`));
        assert.ok(freshHtml.includes('sealArcaneLibraryUI'), 'Função de selamento da biblioteca presente na UI');
        assert.ok(freshHtml.includes('unsealArcaneLibraryUI'), 'Função de desvelamento da biblioteca presente na UI');
        assert.ok(freshHtml.includes('library-seal-status-badge'), 'Badge de status de selamento presente');
    });
});

