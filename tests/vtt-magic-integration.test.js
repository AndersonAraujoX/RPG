/**
 * @file tests/vtt-magic-integration.test.js
 * @description Suíte de Testes Unitários para a Integração de Magia com Tokens do VTT.
 * Padrão: Arrange-Act-Assert (AAA)
 */

const QUnit = require('qunit');
const VttMagicIntegration = require('../src/core/vtt-magic-integration');

QUnit.module('VttMagicIntegration: Magia & Conjuração no VTT (AAA)', function () {

    // -------------------------------------------------------------------------
    // 1. Caminho Feliz: Conjuração com Sucesso, Dedução de PE e Rolagem +2d6
    // -------------------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: Token conjura magia, gasta PE e rola dados com sucesso (AAA)', function (assert) {
        // Arrange
        const caster = { id: 'tok_mago', name: 'Arquimago', pe: 10, maxPe: 12, hp: 15, maxHp: 15, x: 100, y: 100 };
        const spell = { spell: 'Lança de Fogo', cd: 9, pe: 3, bonus: 2, paths: ['fogo'] };

        // Act: Força dados [4, 4] = 8 + 2 bônus = 10 (vs CD 9 -> Sucesso)
        const result = VttMagicIntegration.castSpellFromToken(caster, spell, {
            predeterminedRoll: [4, 4]
        });

        // Assert
        assert.ok(result.success, 'A conjuração deve ser bem-sucedida');
        assert.equal(caster.pe, 7, 'PE do token deve ter sido reduzido de 10 para 7 (custo 3)');
        assert.equal(result.totalRoll, 10, 'Total da rolagem deve ser 8 + 2 = 10');
        assert.equal(result.targetCD, 9, 'CD da magia deve ser 9');
        assert.ok(result.floatingTexts.some(f => f.text === '-3 PE'), 'Texto flutuante de gasto de PE deve estar presente');
    });

    // -------------------------------------------------------------------------
    // 2. Casos de Borda: PE Insuficiente
    // -------------------------------------------------------------------------
    QUnit.test('2. Casos de Borda: Tentativa de conjurar sem PE suficiente falha graciosamente (AAA)', function (assert) {
        // Arrange
        const exhaustedCaster = { id: 'tok_mago', name: 'Mago Sem Mana', pe: 1, maxPe: 10 };
        const expensiveSpell = { spell: 'Cataclismo Menor', cd: 14, pe: 6 };

        // Act
        const result = VttMagicIntegration.castSpellFromToken(exhaustedCaster, expensiveSpell);

        // Assert
        assert.notOk(result.success, 'A conjuração deve falhar');
        assert.ok(result.reason.includes('PE insuficiente'), 'Motivo deve indicar PE insuficiente');
        assert.equal(exhaustedCaster.pe, 1, 'PE do token não deve ser deduzido em caso de saldo insuficiente');
    });

    // -------------------------------------------------------------------------
    // 3. Caminho Feliz & Bordas: Acerto Crítico (12) e Aplicação de Dano Ampliado
    // -------------------------------------------------------------------------
    QUnit.test('3. Caminho Feliz: Acerto Crítico (12) aplica x1.5 de dano no token alvo (AAA)', function (assert) {
        // Arrange
        const caster = { id: 'tok_1', pe: 10, x: 50, y: 50 };
        const target = { id: 'tok_alvo', name: 'Ogro', hp: 30, maxHp: 30, x: 120, y: 120 };
        const attackSpell = { spell: 'Explosão Ígnea', cd: 12, pe: 4, damage: 10 };

        // Act: Força dados [6, 6] = 12 (Crítico!)
        const result = VttMagicIntegration.castSpellFromToken(caster, attackSpell, {
            targetToken: target,
            predeterminedRoll: [6, 6]
        });

        // Assert
        assert.ok(result.success, 'Deve ter sucesso');
        assert.ok(result.isCrit, 'Deve ser classificado como acerto crítico');
        assert.equal(result.targetEffect.amount, 15, 'Dano deve ser multiplicado em 1.5x (10 * 1.5 = 15)');
        assert.equal(target.hp, 15, 'PV do ogro reduzido de 30 para 15');
        assert.ok(result.floatingTexts.some(f => f.text === '-15 PV'), 'Texto flutuante de dano no alvo');
        assert.ok(result.floatingTexts.some(f => f.text === 'CRÍTICO!'), 'Texto flutuante de crítico');
    });

    // -------------------------------------------------------------------------
    // 4. Casos de Borda: Cura Respeitando Teto de PV Máximo
    // -------------------------------------------------------------------------
    QUnit.test('4. Casos de Borda: Feitiço de cura não ultrapassa PV máximo do alvo (AAA)', function (assert) {
        // Arrange
        const healer = { id: 'tok_clérigo', pe: 8, x: 0, y: 0 };
        const woundedAlly = { id: 'tok_aliado', hp: 18, maxHp: 20, x: 40, y: 40 };
        const healSpell = { spell: 'Luz Restauradora', cd: 8, pe: 2, heal: 10 };

        // Act: Dados normais [3, 4] = 7 (com CD 8, vamos simular sucesso direto)
        const result = VttMagicIntegration.castSpellFromToken(healer, healSpell, {
            targetToken: woundedAlly,
            predeterminedRoll: [4, 5] // 9 vs CD 8
        });

        // Assert
        assert.ok(result.success, 'Cura realizada com sucesso');
        assert.equal(woundedAlly.hp, 20, 'PV do aliado deve travar no maxHp de 20');
        assert.ok(result.floatingTexts.some(f => f.text === '+10 PV'), 'Texto flutuante de cura');
    });

    // -------------------------------------------------------------------------
    // 5. Casos de Borda: Modificadores do Modo Mestre Injetados
    // -------------------------------------------------------------------------
    QUnit.test('5. Casos de Borda: Modo Mestre aplica modificadores de Evento Arcano no teste e custo de PE (AAA)', function (assert) {
        // Arrange
        const caster = { id: 'c1', pe: 10, x: 0, y: 0 };
        const spell = { spell: 'Sopro de Tempestade', cd: 11, pe: 4, paths: ['ar'] };

        // Mock do motor de eventos do Mestre
        const mockMasterModeEngine = {
            calculateEventModifiers(eventName, paths) {
                if (eventName === 'tempestade_mana' && paths.includes('ar')) {
                    return { diceBonus: 2, cdModifier: -1, peCostModifier: -1 };
                }
                return { diceBonus: 0, cdModifier: 0, peCostModifier: 0 };
            }
        };

        // Act: Rola [4, 4] = 8 + 2 (evento) = 10 (vs CD 10 ajustada de 11-1)
        const result = VttMagicIntegration.castSpellFromToken(caster, spell, {
            activeMasterEvent: 'tempestade_mana',
            masterModeEngine: mockMasterModeEngine,
            predeterminedRoll: [4, 4]
        });

        // Assert
        assert.ok(result.success, 'Sucesso devido ao bônus do evento do mestre');
        assert.equal(result.peCost, 3, 'Custo de PE reduzido de 4 para 3');
        assert.equal(result.targetCD, 10, 'CD reduzida em 1 ponto pela tempestade');
        assert.ok(result.masterEventNote.includes('+2'), 'Nota de evento registrada');
    });

    // -------------------------------------------------------------------------
    // 6. Tratamento de Exceções: Entradas Nulas
    // -------------------------------------------------------------------------
    QUnit.test('6. Tratamento de Exceções: Entradas nulas disparam erro descritivo (AAA)', function (assert) {
        // Arrange, Act & Assert
        assert.throws(() => {
            VttMagicIntegration.castSpellFromToken(null, {});
        }, /Token do conjurador é obrigatório/, 'Token nulo deve lançar erro');

        assert.throws(() => {
            VttMagicIntegration.castSpellFromToken({}, null);
        }, /Dados da magia são obrigatórios/, 'Magia nula deve lançar erro');
    });
});
